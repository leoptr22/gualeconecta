// @vitest-environment node
import { describe,it,expect,beforeAll,afterAll } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync,rmSync } from 'node:fs';
import { readFile,readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app.js';
import { createRepository } from './repository.js';

const run=promisify(execFile);
const fields={title:'Prueba aislada de adjuntos',business:'Comercio de prueba',description:'Contenido de prueba en una base temporal.',category:'Compras',kind:'Promoción',town:'Gualeguaychú',address:'Dirección de prueba',endsAt:'2099-12-31',contact:'test@example.com'};
let root,photo,shortVideo,longVideo;
const repositories=[];
const testAuth={mount:()=>{},requireUser:(req,res,next)=>{req.user={id:'test-user'};next();}};
function setup(name,repositoryOverride){
 const env={STORAGE:'sqlite',DATABASE_PATH:join(root,name+'.sqlite'),MEDIA_PATH:join(root,name+'-uploads'),ADMIN_TOKEN:'test-secret'};
 const repository=repositoryOverride||createRepository(env);if(repository.close)repositories.push(repository);
 return {app:createApp(repository,env,testAuth),env,repository};
}
function publish(app){let call=request(app).post('/api/publications');for(const [key,value] of Object.entries(fields))call=call.field(key,value);return call;}
beforeAll(async()=>{
 root=mkdtempSync(join(tmpdir(),'guale-media-'));
 photo=await sharp({create:{width:12,height:12,channels:3,background:'#00695c'}}).png().toBuffer();
 for(const seconds of [1,31])await run(ffmpegPath,['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=black:s=32x32:r=1','-t',String(seconds),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',join(root,seconds+'.mp4')],{timeout:20000,windowsHide:true});
 shortVideo=await readFile(join(root,'1.mp4'));longVideo=await readFile(join(root,'31.mp4'));
},30000);
afterAll(()=>{repositories.forEach(repository=>repository.close());if(root)rmSync(root,{recursive:true,force:true});});
describe('Adjuntos de publicaciones',()=>{
 it('guarda tres fotos y un video, y los conserva al reabrir SQLite',async()=>{
  const {app,env}=setup('persist');
  let call=publish(app);for(let i=0;i<3;i++)call=call.attach('photos',photo,{filename:`foto-${i}.png`,contentType:'image/png'});
  const response=await call.attach('video',shortVideo,{filename:'video.mp4',contentType:'video/mp4'});
  expect(response.status).toBe(201);
  await request(app).post(`/api/admin/publications/${response.body.id}/approve`).set('Authorization','Bearer test-secret');
  const reopened=createRepository(env);repositories.push(reopened);
  const publication=(await reopened.list())[0];expect(publication.media).toHaveLength(4);expect(publication.media[3]).toMatchObject({type:'video',duration:1});
  const restarted=createApp(reopened,env,testAuth);
  const image=await request(restarted).get(publication.media[0].url);expect(image.status).toBe(200);expect(image.headers['content-type']).toMatch(/image\/webp/);expect(image.headers['x-content-type-options']).toBe('nosniff');
  const video=await request(restarted).get(publication.media[3].url).set('Range','bytes=0-99');expect(video.status).toBe(206);
  expect((await readdir(join(env.MEDIA_PATH,'.staging')))).toEqual([]);
 });
 it('rechaza una cuarta foto sin dejar archivos',async()=>{
  const {app,env,repository}=setup('four-photos');let call=publish(app);for(let i=0;i<4;i++)call=call.attach('photos',photo,{filename:'foto.png',contentType:'image/png'});
  expect((await call).status).toBe(400);expect(await repository.list()).toEqual([]);expect(await readdir(join(env.MEDIA_PATH,'.staging'))).toEqual([]);
 });
 it('rechaza un segundo video',async()=>{const {app,repository}=setup('two-videos');const response=await publish(app).attach('video',shortVideo,'uno.mp4').attach('video',shortVideo,'dos.mp4');expect(response.status).toBe(400);expect(await repository.list()).toEqual([]);});
 it('rechaza videos de más de 20 MB y limpia los temporales',async()=>{const {app,env}=setup('large-video');const response=await publish(app).attach('video',Buffer.alloc(20*1024*1024+1),{filename:'video.mp4',contentType:'video/mp4'});expect(response.status).toBe(400);expect(response.body.error).toMatch(/20 MB/);expect(await readdir(join(env.MEDIA_PATH,'.staging'))).toEqual([]);});
 it('rechaza un archivo de texto que declara ser MP4',async()=>{const {app,env}=setup('fake-video');expect((await publish(app).attach('video',Buffer.from('Esto no es un video MP4'),{filename:'video.mp4',contentType:'video/mp4'})).status).toBe(400);expect(await readdir(env.MEDIA_PATH)).toEqual(['.staging']);});
 it('rechaza contenido falso aunque declare ser una foto',async()=>{const {app,env}=setup('fake-image');expect((await publish(app).attach('photos',Buffer.from('<svg></svg>'),{filename:'foto.jpg',contentType:'image/jpeg'})).status).toBe(400);expect(await readdir(env.MEDIA_PATH)).toEqual(['.staging']);});
 it('rechaza fotos de más de 8 MB',async()=>{const {app}=setup('large-image');const response=await publish(app).attach('photos',Buffer.alloc(8*1024*1024+1),{filename:'foto.jpg',contentType:'image/jpeg'});expect(response.status).toBe(400);expect(response.body.error).toMatch(/8 MB/);});
 it('rechaza un video de 31 segundos y limpia los adjuntos procesados',async()=>{const {app,env,repository}=setup('long-video');const response=await publish(app).attach('photos',photo,'foto.png').attach('video',longVideo,'largo.mp4');expect(response.status).toBe(400);expect(response.body.error).toMatch(/30 segundos/);expect(await repository.list()).toEqual([]);expect(await readdir(env.MEDIA_PATH)).toEqual(['.staging']);});
 it('limpia los archivos si falla el guardado de la publicación',async()=>{const {app,env}=setup('failed-write',{create:async()=>{throw new Error('Fallo de prueba');}});expect((await publish(app).attach('photos',photo,'foto.png')).status).toBe(503);expect(await readdir(env.MEDIA_PATH)).toEqual(['.staging']);});
 it('rechaza un formulario inválido y elimina sus temporales',async()=>{const {app,env}=setup('invalid-fields');expect((await request(app).post('/api/publications').field('title','mal').attach('photos',photo,'foto.png')).status).toBe(400);expect(await readdir(env.MEDIA_PATH)).toEqual(['.staging']);});
});
