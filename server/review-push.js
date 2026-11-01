import { createHash,ECDH } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import webpush from 'web-push';
import { z } from 'zod';
import { createStateDatabase } from './state-database.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
function allowedEndpoint(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.hash&&(url.hostname==='fcm.googleapis.com'||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.push.services.mozilla.com')||url.hostname.endsWith('.notify.windows.com'));}catch{return false;}}
function validKeys(keys){try{const p=Buffer.from(keys.p256dh,'base64url');return p.length===65&&p[0]===4&&Buffer.from(keys.auth,'base64url').length===16&&ECDH.convertKey(p,'prime256v1').length===65;}catch{return false;}}
export const pushSubscriptionSchema=z.object({endpoint:z.url().max(4096).refine(allowedEndpoint),keys:z.object({p256dh:z.string().regex(/^[A-Za-z0-9_-]+$/),auth:z.string().regex(/^[A-Za-z0-9_-]+$/)}).refine(validKeys)});
const empty=async()=>{};
export function createReviewPush(env=process.env,{send=(...args)=>webpush.sendNotification(...args),now=Date.now,database}={}){
 const configured=Boolean(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.ADMIN_EMAIL);
 if(!configured)return {configured:false,publicKey:null,prepare:empty,ready:empty,cancel:empty,flush:empty,reconcile:empty,cleanup:empty,close(){}};
 const path=env.AUTH_DATABASE_PATH===':memory:'?':memory:':env.AUTH_DATABASE_PATH?resolve(env.AUTH_DATABASE_PATH):fileURLToPath(new URL('../data/accounts.sqlite',import.meta.url));
 const db=database||createStateDatabase(env,path,`
 CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL,name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS push_subscriptions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS push_jobs (id TEXT PRIMARY KEY,payload TEXT NOT NULL,created_at INTEGER NOT NULL,ready INTEGER NOT NULL DEFAULT 0,done INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,locked_until INTEGER NOT NULL DEFAULT 0,not_before INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS push_deliveries (job_id TEXT NOT NULL,subscription_id TEXT NOT NULL,PRIMARY KEY(job_id,subscription_id));`);
 const options={vapidDetails:{subject:env.APP_ORIGIN?.startsWith('https://')?env.APP_ORIGIN:'mailto:'+env.ADMIN_EMAIL,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY},TTL:86400,timeout:10000,urgency:'high'};
 const payload=item=>JSON.stringify({title:'Publicación pendiente de revisión',body:`${item.business}: ${item.title}`,tag:'review-'+item.id,url:'/?adminReview='+encodeURIComponent(item.id)});
 async function prepare(item){await db.prepare('INSERT INTO push_jobs (id,payload,created_at) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING').run(item.id,payload(item),now());}
 async function flush(repository){
  const jobs=await db.prepare('SELECT * FROM push_jobs WHERE ready=1 AND done=0 AND attempts<8 AND not_before<=? ORDER BY created_at LIMIT 20').all(now());
  if(!jobs.length)return;
  const pending=new Set((await repository.list()).filter(item=>item.status==='pending').map(item=>item.id));
  for(const job of jobs){
   const claimed=await db.prepare('UPDATE push_jobs SET locked_until=?,attempts=attempts+1 WHERE id=? AND done=0 AND locked_until<=? RETURNING id').get(now()+300000,job.id,now());if(!claimed)continue;
   if(!pending.has(job.id)){await db.prepare('UPDATE push_jobs SET done=1,locked_until=0 WHERE id=?').run(job.id);continue;}
   const subscriptions=await db.prepare('SELECT push_subscriptions.* FROM push_subscriptions JOIN users ON users.id=push_subscriptions.user_id WHERE lower(users.email)=lower(?)').all(env.ADMIN_EMAIL);
   if(!subscriptions.length){await db.prepare('UPDATE push_jobs SET locked_until=0,attempts=0 WHERE id=?').run(job.id);continue;}
   let failures=0;
   await Promise.all(subscriptions.map(async subscription=>{
    if(await db.prepare('SELECT job_id FROM push_deliveries WHERE job_id=? AND subscription_id=?').get(job.id,subscription.id))return;
    try{await send(JSON.parse(subscription.payload),job.payload,options);await db.prepare('INSERT INTO push_deliveries VALUES (?,?) ON CONFLICT(job_id,subscription_id) DO NOTHING').run(job.id,subscription.id);}
    catch(error){if([404,410].includes(error.statusCode))await db.prepare('DELETE FROM push_subscriptions WHERE id=?').run(subscription.id);else failures++;}
   }));
   await db.prepare('UPDATE push_jobs SET done=?,locked_until=0,not_before=? WHERE id=?').run(failures?0:1,failures?now()+Math.min(3600000,60000*2**(Number(job.attempts)+1)):0,job.id);
  }
 }
 return {configured:true,publicKey:env.VAPID_PUBLIC_KEY,prepare,
  ready:id=>db.prepare('UPDATE push_jobs SET ready=1 WHERE id=?').run(id),
  cancel:async id=>db.prepare('DELETE FROM push_jobs WHERE id=? AND ready=0').run(id),
  async subscribe(user,input){
   const subscription=pushSubscriptionSchema.parse(input);
   const existing=await db.prepare('SELECT id FROM push_subscriptions WHERE id=?').get(hash(subscription.endpoint));
   const count=await db.prepare('SELECT COUNT(*) AS count FROM push_subscriptions WHERE user_id=?').get(user.id);
   if(!existing&&Number(count.count)>=10)throw new Error('Ya tenés diez dispositivos registrados.');
   await db.prepare('INSERT INTO users VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name').run(user.id,user.email,user.name);
   await db.prepare('INSERT INTO push_subscriptions VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,payload=excluded.payload').run(hash(subscription.endpoint),user.id,JSON.stringify(subscription),now());
  },
  async unsubscribe(user,endpoint){await db.prepare('DELETE FROM push_subscriptions WHERE id=? AND user_id=?').run(hash(endpoint),user.id);},
  async test(user,endpoint){const row=await db.prepare('SELECT payload FROM push_subscriptions WHERE id=? AND user_id=?').get(hash(endpoint),user.id);if(!row)throw new Error('Activá las notificaciones en este dispositivo primero.');try{await send(JSON.parse(row.payload),JSON.stringify({title:'Guale Conecta',body:'Los avisos de publicaciones pendientes están activados.',tag:'review-test',url:'/?adminPanel=1'}),options);}catch(error){if([404,410].includes(error.statusCode))await db.prepare('DELETE FROM push_subscriptions WHERE id=?').run(hash(endpoint));throw new Error('No se pudo entregar el aviso. Volvé a activar las notificaciones.');}},
  flush,
  async reconcile(items){for(const item of items.filter(item=>item.status==='pending')){await prepare(item);await db.prepare('UPDATE push_jobs SET ready=1 WHERE id=?').run(item.id);}},
  async cleanup(){await db.prepare('DELETE FROM push_jobs WHERE created_at<? AND (done=1 OR ready=0)').run(now()-7*86400000);await db.prepare('DELETE FROM push_deliveries WHERE job_id NOT IN (SELECT id FROM push_jobs)').run();},
  close(){db.close();}
 };
}
