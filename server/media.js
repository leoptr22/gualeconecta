import multer from 'multer';
import sharp from 'sharp';
import ffprobe from 'ffprobe-static';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { readFile,unlink } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const run=promisify(execFile);
export const MAX_PHOTO_BYTES=8*1024*1024;
export const MAX_VIDEO_BYTES=20*1024*1024;
export const MAX_VIDEO_SECONDS=30;
export class MediaError extends Error {}

export function createMediaStorage(env=process.env){
 const directory=env.MEDIA_PATH?resolve(env.MEDIA_PATH):fileURLToPath(new URL('../data/uploads',import.meta.url));
 const staging=join(directory,'.staging');mkdirSync(staging,{recursive:true});
 const upload=multer({storage:multer.diskStorage({destination:staging,filename:(req,file,cb)=>cb(null,randomUUID())}),limits:{files:4,fileSize:MAX_VIDEO_BYTES,fields:15,fieldSize:16000,parts:19}}).fields([{name:'photos',maxCount:3},{name:'video',maxCount:1}]);
 const remove=paths=>Promise.all(paths.map(path=>unlink(path).catch(()=>{})));
 async function save(files={}){
  const originals=Object.values(files).flat();const saved=[];const media=[];
  try{
   for(const photo of files.photos||[]){
    if(photo.size>MAX_PHOTO_BYTES)throw new MediaError('Cada foto puede pesar hasta 8 MB.');
    const image=sharp(photo.path,{limitInputPixels:40000000});
    const metadata=await image.metadata().catch(()=>{throw new MediaError('No pudimos leer una foto. Usá JPG, PNG o WebP.');});
    if(!['jpeg','png','webp'].includes(metadata.format)||(metadata.pages||1)>1)throw new MediaError('Las fotos deben ser JPG, PNG o WebP sin animación.');
    const filename=randomUUID()+'.webp';const path=join(directory,filename);saved.push(path);
    await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toFile(path);
    media.push({type:'image',url:'/api/media/'+filename});
   }
   const video=files.video?.[0];
   if(video){
    if(video.size>MAX_VIDEO_BYTES)throw new MediaError('El video puede pesar hasta 20 MB.');
    const header=await readFile(video.path);
    if(header.length<12||header.toString('ascii',4,8)!=='ftyp')throw new MediaError('Usá un video MP4 con codificación H.264.');
    let probe;
    try{const {stdout}=await run(ffprobe.path,['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,duration','-of','json',video.path],{timeout:15000,maxBuffer:1024*1024,windowsHide:true});probe=JSON.parse(stdout);}catch{throw new MediaError('No pudimos leer el video. Usá MP4 con codificación H.264.');}
    const streams=probe.streams||[];
    const videoStream=streams.find(stream=>stream.codec_type==='video');
    const durations=[Number(probe.format?.duration),...streams.filter(stream=>stream.duration!==undefined).map(stream=>Number(stream.duration))];
    if(!videoStream||videoStream.codec_name!=='h264'||streams.some(stream=>stream.codec_type==='audio'&&!['aac','mp3'].includes(stream.codec_name)))throw new MediaError('Usá MP4 con video H.264 y audio AAC o MP3.');
    if(durations.some(duration=>!Number.isFinite(duration)||duration<=0)||Math.max(...durations)>MAX_VIDEO_SECONDS)throw new MediaError('El video debe durar como máximo 30 segundos.');
    const filename=randomUUID()+'.mp4';const path=join(directory,filename);saved.push(path);
    const { writeFile }=await import('node:fs/promises');await writeFile(path,header,{flag:'wx'});
    media.push({type:'video',url:'/api/media/'+filename,duration:Math.max(...durations)});
   }
   return {media,rollback:()=>remove(saved)};
  }catch(error){await remove(saved);if(error instanceof MediaError)throw error;throw new MediaError('No pudimos procesar los archivos. Revisá su formato e intentá nuevamente.');}
  finally{await remove(originals.map(file=>file.path));}
 }
 return {directory,upload,save,discard:files=>remove(Object.values(files||{}).flat().map(file=>file.path))};
}
