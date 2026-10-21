import type { Publication } from '../types';
export type VisitSummary={total:number;today:number;startedAt:string};
export type AdminPublication=Publication & {status:'pending'|'approved';createdAt:string;contact:string};
import type { AuthUser } from '../hooks/useAuth';
async function request(path:string,options?:RequestInit){const response=await fetch('/api'+path,options);const data=await response.json();if(!response.ok)throw new Error(data.error||'No pudimos conectar. Intentá nuevamente.');return data;}
export const api={
 visit:async()=>{const response=await fetch('/api/visits',{method:'POST'});if(!response.ok)throw new Error('No se pudo registrar la visita');},
 visitStats:():Promise<VisitSummary>=>request('/admin/visits'),
 list:():Promise<{items:Publication[]}>=>request('/publications'),
 publish:(body:FormData,csrfToken:string)=>request('/publications',{method:'POST',headers:{'X-CSRF-Token':csrfToken},body}),
 session:():Promise<{user:AuthUser|null;clientId:string|null;csrfToken:string;configured:boolean;adminLoginEnabled?:boolean}>=>request('/auth/session'),
 login:(credential:string,csrfToken:string):Promise<{user:AuthUser}>=>request('/auth/google',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify({credential})}),
 logout:(csrfToken:string)=>request('/auth/logout',{method:'POST',headers:{'X-CSRF-Token':csrfToken}}),
 loginAdmin:(email:string,password:string,csrfToken:string):Promise<{user:AuthUser}>=>request('/auth/admin',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify({email,password})}),
 adminList:():Promise<{items:AdminPublication[]}>=>request('/admin/publications'),
 approve:async(id:string):Promise<{id:string;status:'approved';approvedAt?:string;expiresAt?:string}>=>{const session=await api.session();return request('/admin/publications/'+encodeURIComponent(id)+'/approve',{method:'POST',headers:{'X-CSRF-Token':session.csrfToken}});}
};
