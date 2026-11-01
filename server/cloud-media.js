import { createHash,randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFile,writeFile,unlink } from 'node:fs/promises';
import { put,del,head,list } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import { createMediaStorage,MediaError,MAX_PHOTO_BYTES,MAX_VIDEO_BYTES } from './media.js';

export const uploadPrefix=userId=>'uploads/'+createHash('sha256').update(userId).digest('hex')+'/';
export function ownedUpload(url,userId,env) {
 let parsed;try{parsed=new URL(url);}catch{throw new MediaError('El adjunto no es válido.');}
 const prefix='/'+uploadPrefix(userId);
 if(parsed.protocol!=='https:'||parsed.hostname!==env.MEDIA_BLOB_HOST||parsed.username||parsed.password||parsed.port||parsed.search||!parsed.pathname.startsWith(prefix)||! /^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|mp4)$/.test(parsed.pathname.slice(prefix.length)))throw new MediaError('El adjunto no pertenece a tu publicación.');
 return parsed;
}
export function createCloudMedia(env) {
 if(!env.MEDIA_BLOB_HOST)throw new Error('Falta configurar el almacén de adjuntos');
 const local=createMediaStorage({MEDIA_PATH:join(tmpdir(),'guale-media')});
 const options={storeId:env.BLOB_STORE_ID};
 return {
  async authorize(req,res) {
   const data=await handleUpload({request:req,body:req.body,onBeforeGenerateToken:async pathname=>{
    ownedUpload('https://'+env.MEDIA_BLOB_HOST+'/'+pathname,req.user.id,env);
    const video=pathname.endsWith('.mp4');
    return {allowedContentTypes:video?['video/mp4']:['image/jpeg','image/png','image/webp'],maximumSizeInBytes:video?MAX_VIDEO_BYTES:MAX_PHOTO_BYTES,validUntil:Date.now()+10*60000,addRandomSuffix:false,allowOverwrite:false};
   }});res.json(data);
  },
  async finalize(entries,userId) {
   if(!Array.isArray(entries)||entries.length>4||entries.filter(x=>x?.type==='image').length>3||entries.filter(x=>x?.type==='video').length>1||entries.some(x=>!['image','video'].includes(x?.type)))throw new MediaError('Podés adjuntar hasta 3 fotos y un video.');
   const urls=entries.map(entry=>ownedUpload(entry.url,userId,env).toString());
   if(new Set(urls).size!==urls.length)throw new MediaError('No repitas el mismo archivo.');
   const files={photos:[],video:[]};const paths=[];const uploaded=[];let processed;
   try {
    for(let i=0;i<entries.length;i++) {
     const entry=entries[i];const max=entry.type==='video'?MAX_VIDEO_BYTES:MAX_PHOTO_BYTES;
     const info=await head(urls[i],options);if(info.size>max)throw new MediaError('Un adjunto supera el tamaño permitido.');
     const response=await fetch(urls[i],{redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw new MediaError('No pudimos leer un adjunto. Volvé a cargarlo.');
     const chunks=[];let size=0;
     for await(const chunk of response.body){size+=chunk.length;if(size>max)throw new MediaError('Un adjunto supera el tamaño permitido.');chunks.push(chunk);}
     const path=join(local.directory,'.staging',randomUUID());paths.push(path);await writeFile(path,Buffer.concat(chunks));
     files[entry.type==='video'?'video':'photos'].push({path,size});
    }
    processed=await local.save(files);
    const media=[];
    for(const item of processed.media){const filename=item.url.split('/').pop();const blob=await put('publications/'+filename,await readFile(join(local.directory,filename)),{...options,access:'public',addRandomSuffix:false,contentType:item.type==='video'?'video/mp4':'image/webp',cacheControlMaxAge:60});uploaded.push(blob.url);media.push({...item,url:blob.url});}
    return {media,rollback:async()=>{if(uploaded.length)await del(uploaded,options);}};
   }catch(error){if(uploaded.length)await del(uploaded,options);throw error;}
   finally {await processed?.rollback();await Promise.all(paths.map(path=>unlink(path).catch(()=>{})));if(urls.length)await del(urls,options).catch(()=>{});}
  },
  async discardPublished(url){const parsed=new URL(url);if(parsed.hostname!==env.MEDIA_BLOB_HOST||!/^\/publications\/[0-9a-f-]{36}\.(webp|mp4)$/.test(parsed.pathname))throw new Error('Adjunto fuera del almacén configurado');await del(url,options);},
  async discardUploads(entries,userId){if(!Array.isArray(entries)||entries.length>4)throw new MediaError('Lista de adjuntos inválida.');const urls=entries.map(entry=>ownedUpload(entry.url,userId,env).toString());if(urls.length)await del(urls,options);},
  async cleanupStaging(time=new Date()) {
   let cursor;do{const page=await list({...options,prefix:'uploads/',limit:1000,cursor});const expired=page.blobs.filter(blob=>new Date(blob.uploadedAt).getTime()<time.getTime()-3600000);if(expired.length)await del(expired.map(blob=>blob.url),options);cursor=page.hasMore?page.cursor:undefined;}while(cursor);
  }
 };
}
