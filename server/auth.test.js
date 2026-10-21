// @vitest-environment node
import { describe,it,expect,afterEach } from 'vitest';
import request from 'supertest';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAuth } from './auth.js';
import { createApp } from './app.js';
import { createRepository } from './repository.js';
import { hashAdminPassword } from './admin-password.js';
const origin='http://127.0.0.1:5173';
const resources=[];
const publication={title:'Publicación de prueba',business:'Comercio de prueba',description:'Datos aislados para verificar la autenticación.',category:'Compras',kind:'Promoción',town:'Gualeguaychú',address:'Centro de prueba',endsAt:'2099-12-31',contact:'test@example.com'};
function setup(options={}){
 const env={GOOGLE_CLIENT_ID:'test-client',APP_ORIGIN:origin,AUTH_DATABASE_PATH:':memory:',...options.env};
 let nonce='';const auth=createAuth(env,options.verify|| (async()=>({sub:'google-test-user',email:'test@example.com',name:'Cuenta de prueba',email_verified:true,nonce})));
 const repository=createRepository({STORAGE:'sqlite',DATABASE_PATH:':memory:'});resources.push(auth,repository);
 const app=createApp(repository,env,auth);const agent=request.agent(app);
 return {auth,repository,app,agent,env,challenge:async()=>{const response=await agent.get('/api/auth/session');nonce=response.body.csrfToken;return nonce;}};
}
afterEach(()=>{resources.splice(0).forEach(resource=>resource.close());});
describe('Acceso con Google',()=>{
 it('protege el panel y permite aprobar con una sesión administrativa local',async()=>{
  const {agent,challenge,repository,app}=setup({env:{ADMIN_EMAIL:'owner@example.com',ADMIN_PASSWORD_HASH:await hashAdminPassword('test-password-only')}});
  const csrf=await challenge();expect((await request(app).get('/api/admin/publications')).status).toBe(401);
  const login=await agent.post('/api/auth/admin').set('Origin',origin).set('X-CSRF-Token',csrf).send({email:'owner@example.com',password:'test-password-only',role:'admin'});
  expect(login.status).toBe(200);expect(login.body.user.role).toBe('admin');
  await repository.create({...publication,id:'pending-test',status:'pending',createdAt:new Date().toISOString()});
  expect((await agent.get('/api/admin/publications')).body.items[0].status).toBe('pending');
  expect((await agent.post('/api/admin/publications/pending-test/approve')).status).toBe(403);
  expect((await agent.post('/api/admin/publications/pending-test/approve').set('Origin',origin).set('X-CSRF-Token',csrf)).status).toBe(200);
  expect((await request(app).get('/api/publications')).body.items).toHaveLength(1);
  await agent.post('/api/auth/logout').set('Origin',origin).set('X-CSRF-Token',csrf);
  expect((await agent.get('/api/admin/publications')).status).toBe(401);
 });
 it('rechaza claves y cuentas incorrectas y no acepta una elevación de rol del navegador',async()=>{
  const {agent,challenge}=setup({env:{ADMIN_EMAIL:'owner@example.com',ADMIN_PASSWORD_HASH:await hashAdminPassword('test-password-only')}});const csrf=await challenge();
  for(const body of [{email:'owner@example.com',password:'wrong'},{email:'other@example.com',password:'test-password-only'}])expect((await agent.post('/api/auth/admin').set('Origin',origin).set('X-CSRF-Token',csrf).send(body)).status).toBe(401);
  expect((await agent.post('/api/auth/admin').send({email:'owner@example.com',password:'test-password-only'})).status).toBe(403);
  await agent.post('/api/auth/google').set('Origin',origin).set('X-CSRF-Token',csrf).send({credential:'test',role:'admin'});
  expect((await agent.get('/api/admin/publications')).status).toBe(403);
 });
 it('permite explorar y exige cuenta para publicar incluso sin configurar Google',async()=>{const {app,agent,challenge}=setup({env:{GOOGLE_CLIENT_ID:''}});expect((await request(app).get('/api/publications')).status).toBe(200);expect((await request(app).post('/api/publications').send(publication)).status).toBe(401);const csrf=await challenge();const response=await agent.post('/api/auth/google').set('Origin',origin).set('X-CSRF-Token',csrf).send({credential:'test'});expect(response.status).toBe(503);});
 it('rechaza origen externo y peticiones sin protección CSRF',async()=>{const {agent,challenge}=setup();const csrf=await challenge();for(const headers of [{Origin:'https://external.example','X-CSRF-Token':csrf},{Origin:origin}]){let call=agent.post('/api/auth/google');for(const [name,value] of Object.entries(headers))call=call.set(name,value);expect((await call.send({credential:'test'})).status).toBe(403);}});
 it('rechaza una credencial no verificada o un nonce incorrecto',async()=>{for(const verify of [async()=>{throw new Error('Invalid Google token');},async()=>({sub:'user',email:'test@example.com',email_verified:true,nonce:'wrong'})]){const {agent,challenge}=setup({verify});const csrf=await challenge();expect((await agent.post('/api/auth/google').set('Origin',origin).set('X-CSRF-Token',csrf).send({credential:'test'})).status).toBe(401);}});
 it('crea una sesión protegida, registra el autor real y revoca la sesión al salir',async()=>{
  const {agent,challenge,repository,app}=setup();const csrf=await challenge();
  const login=await agent.post('/api/auth/google').set('Origin',origin).set('X-CSRF-Token',csrf).send({credential:'verified-in-test'});expect(login.status).toBe(200);expect(login.headers['set-cookie'][0]).toMatch(/HttpOnly/);expect(login.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
  expect((await agent.get('/api/auth/session')).body.user.id).toBe('google-test-user');
  expect((await agent.post('/api/publications').set('Origin',origin).set('X-CSRF-Token',csrf).send({...publication,ownerId:'forged-user'})).status).toBe(201);
  const saved=(await repository.list())[0];expect(saved.ownerId).toBe('google-test-user');await repository.approve(saved.id);
  const publicResponse=await request(app).get('/api/publications');expect(publicResponse.body.items[0].ownerId).toBeUndefined();expect(publicResponse.body.items[0].contact).toBeUndefined();
  await agent.post('/api/auth/logout').set('Origin',origin).set('X-CSRF-Token',csrf);
  expect((await agent.get('/api/auth/session')).body.user).toBeNull();
  expect((await request(app).post('/api/publications').set('Cookie',login.headers['set-cookie'][0].split(';')[0]).send(publication)).status).toBe(401);
 });
 it('conserva la sesión al reabrir la base de cuentas',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'guale-accounts-'));
  try{const first=setup({env:{AUTH_DATABASE_PATH:join(directory,'accounts.sqlite')}});const csrf=await first.challenge();const login=await first.agent.post('/api/auth/google').set('Origin',origin).set('X-CSRF-Token',csrf).send({credential:'test'});const cookie=login.headers['set-cookie'][0].split(';')[0];first.auth.close();resources.splice(resources.indexOf(first.auth),1);const second=setup({env:{AUTH_DATABASE_PATH:join(directory,'accounts.sqlite')}});expect((await request(second.app).get('/api/auth/session').set('Cookie',cookie)).body.user.id).toBe('google-test-user');second.auth.close();resources.splice(resources.indexOf(second.auth),1);}finally{rmSync(directory,{recursive:true,force:true});}
 });
});
