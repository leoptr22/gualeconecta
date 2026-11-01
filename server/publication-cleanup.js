import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { hasExpired } from './publication-policy.js';

export async function cleanupExpired(repository,mediaDirectory,time=new Date(),cloud) {
 const items=await repository.list();
 const expired=items.filter(item=>hasExpired(item,time));
 const retainedUrls=new Set(items.filter(item=>!hasExpired(item,time)).flatMap(item=>(item.media||[]).map(media=>media.url)));
 for(const item of expired)for(const media of item.media||[]) {
  if(cloud&&media.url?.startsWith('https://')&&!retainedUrls.has(media.url)){await cloud.discardPublished(media.url);continue;}
  // Only locally generated filenames are eligible. Remote URLs never become paths.
  const match=/^\/api\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:webp|mp4))$/.exec(media.url||'');
  if(match&&!retainedUrls.has(media.url))try{await unlink(join(mediaDirectory,match[1]));}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 // Delete records after attachments, so failed file removal retries next cycle.
 return (await repository.removeExpired(time)).length;
}
export function startPublicationCleanup(repository,mediaDirectory) {
 let running=false;
 const run=async()=>{if(running)return;running=true;try{await cleanupExpired(repository,mediaDirectory);}catch(error){console.error('No se pudo completar la limpieza de publicaciones:',error.message);}finally{running=false;}};
 void run();const timer=setInterval(()=>void run(),60000);timer.unref();return ()=>clearInterval(timer);
}
