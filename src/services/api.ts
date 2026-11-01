import type { Publication } from '../types';
export type VisitSummary={total:number;today:number;startedAt:string};
export type AdminPublication=Publication & {status:'pending'|'approved';createdAt:string;contact:string};
import type { AuthUser } from '../hooks/useAuth';
async function request(path:string,options?:RequestInit){const response=await fetch('/api'+path,options);const data=await response.json();if(!response.ok)throw new Error(data.error||'No pudimos conectar. Intentá nuevamente.');return data;}
export const api={
 pushConfig:():Promise<{configured:boolean;publicKey:string|null}>=>request('/admin/push/config'),
 pushSubscribe:async(subscription:PushSubscriptionJSON)=>{const session=await api.session();return request('/admin/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},body:JSON.stringify(subscription)});},
 pushUnsubscribe:async(endpoint:string)=>{const session=await api.session();return request('/admin/push/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},body:JSON.stringify({endpoint})});},
 pushTest:async(endpoint:string)=>{const session=await api.session();return request('/admin/push/test',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},body:JSON.stringify({endpoint})});},
 visit:async()=>{const response=await fetch('/api/visits',{method:'POST'});if(!response.ok)throw new Error('No se pudo registrar la visita');},
 visitStats:():Promise<VisitSummary>=>request('/admin/visits'),
 list:():Promise<{items:Publication[]}>=>request('/publications'),
 publish:async(body:FormData,csrfToken:string)=>{
  const session=await api.session();
  if(session.mediaStorage!=='blob')return request('/publications',{method:'POST',headers:{'X-CSRF-Token':session.csrfToken||csrfToken},body});
  if(!session.user||!session.mediaUploadPrefix)throw new Error('Iniciá sesión para publicar.');
  const {upload}=await import('@vercel/blob/client');
  const media=[];
  try {
  for(const field of ['photos','video'])for(const entry of body.getAll(field)){
   if(!(entry instanceof File)||!entry.size)continue;
   const extension=field==='video'?'mp4':entry.type==='image/png'?'png':entry.type==='image/webp'?'webp':'jpg';
   const blob=await upload(session.mediaUploadPrefix+crypto.randomUUID()+'.'+extension,entry,{access:'public',handleUploadUrl:'/api/uploads/authorize',headers:{'X-CSRF-Token':session.csrfToken},contentType:entry.type,multipart:entry.size>4*1024*1024});
   media.push({type:field==='video'?'video':'image',url:blob.url});
  }
  const fields=Object.fromEntries([...body.entries()].filter(([key])=>!['photos','video'].includes(key)));
  return await request('/publications',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},body:JSON.stringify({...fields,media})});
  }catch(error){if(media.length)await fetch('/api/uploads/discard',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},body:JSON.stringify({media})}).catch(()=>{});throw error;}
 },
 session:():Promise<{user:AuthUser|null;clientId:string|null;csrfToken:string;configured:boolean;adminLoginEnabled?:boolean;mediaStorage?:'blob'|'local';mediaUploadPrefix?:string|null}>=>request('/auth/session'),
 login:(credential:string,csrfToken:string):Promise<{user:AuthUser}>=>request('/auth/google',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify({credential})}),
 logout:(csrfToken:string)=>request('/auth/logout',{method:'POST',headers:{'X-CSRF-Token':csrfToken}}),
 loginAdmin:(email:string,password:string,csrfToken:string):Promise<{user:AuthUser}>=>request('/auth/admin',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify({email,password})}),
 adminList:():Promise<{items:AdminPublication[]}>=>request('/admin/publications'),
 approve:async(id:string):Promise<{id:string;status:'approved';approvedAt?:string;expiresAt?:string}>=>{const session=await api.session();return request('/admin/publications/'+encodeURIComponent(id)+'/approve',{method:'POST',headers:{'X-CSRF-Token':session.csrfToken}});}
};
