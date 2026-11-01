import { rateOptions } from './rate-limits.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomUUID,timingSafeEqual } from 'node:crypto';
import { publicationSchema,isActive,publicItem } from './domain.js';
import multer from 'multer';
import { createMediaStorage,MediaError } from './media.js';
import { createAuth } from './auth.js';
import { createAnalytics } from './analytics.js';
import { createCloudMedia } from './cloud-media.js';
import { cleanupExpired } from './publication-cleanup.js';
import { hasExpired } from './publication-policy.js';
import { createReviewPush,pushSubscriptionSchema } from './review-push.js';
import { waitUntil } from '@vercel/functions';
export function createApp(repository,env=process.env,authService,services={}){
 const auth=authService||createAuth(env);
 const cloud=env.MEDIA_STORAGE==='blob'?createCloudMedia(env):null;
 const mediaStorage=createMediaStorage(cloud?{MEDIA_PATH:join(tmpdir(),'guale-media')}:env);
 const analytics=createAnalytics(env);
 const push=services.push||createReviewPush(env);
 const background=services.background||((promise)=>{if(env.VERCEL)waitUntil(promise);});
 const deliver=()=>background(push.flush(repository).catch(()=>console.error('No se pudo completar la entrega de avisos de revisión.')));
 const app=express();if(env.VERCEL)app.set('trust proxy',1);app.disable('x-powered-by');app.use(express.json({limit:'20kb'}));
 auth.mount(app);
 app.get('/api/health',async(req,res)=>{await analytics.stats();res.setHeader('Cache-Control','no-store');res.json({ok:true,storage:env.STORAGE||'sqlite',state:env.STATE_STORAGE||'sqlite',media:env.MEDIA_STORAGE||'local'});});
 app.get('/api/cron/cleanup',async(req,res)=>{
  const expected=Buffer.from('Bearer '+(env.CRON_SECRET||''));const actual=Buffer.from(req.headers.authorization||'');
  if(!env.CRON_SECRET||expected.length!==actual.length||!timingSafeEqual(expected,actual))return res.sendStatus(401);
  const removed=await cleanupExpired(repository,mediaStorage.directory,new Date(),cloud);await cloud?.cleanupStaging();await push.reconcile(await repository.list());await push.flush(repository);await push.cleanup();res.json({removed});
 });
 app.post('/api/visits',rateLimit(rateOptions(env,'visits',60000,30)),async(req,res)=>{
  if(req.headers.origin!==(env.APP_ORIGIN||'http://127.0.0.1:5173'))return res.sendStatus(403);
  if((await auth.currentUser?.(req))?.role!=='admin')await analytics.record(req,res);
  res.sendStatus(204);
 });
 app.use('/api/media',express.static(mediaStorage.directory,{dotfiles:'deny',index:false,maxAge:'1y',immutable:true,setHeaders:res=>res.setHeader('X-Content-Type-Options','nosniff')}),(req,res)=>res.sendStatus(404));
 app.get('/api/publications',async(req,res)=>{const items=await repository.list();if(cloud&&items.some(item=>hasExpired(item)))await cleanupExpired(repository,mediaStorage.directory,new Date(),cloud);res.setHeader('Cache-Control','no-store');res.json({items:items.filter(x=>isActive(x)).map(publicItem)});});
 if(cloud)app.post('/api/uploads/authorize',rateLimit(rateOptions(env,'uploads',3600000,80)),auth.requireUser,(req,res,next)=>{if(req.body?.type!=='blob.generate-client-token')return res.sendStatus(400);return cloud.authorize(req,res).catch(next);});
 if(cloud)app.post('/api/uploads/discard',auth.requireUser,async(req,res)=>{await cloud.discardUploads(req.body.media,req.user.id);res.sendStatus(204);});
 app.post('/api/publications',rateLimit(rateOptions(env,'publications',3600000,20)),auth.requireUser,cloud?(req,res,next)=>next():mediaStorage.upload,async(req,res)=>{
  const parsed=publicationSchema.safeParse(req.body);
  if(!parsed.success){await mediaStorage.discard(req.files);return res.status(400).json({error:'Revisá los campos y la fecha de vigencia.'});}
  const saved=cloud?await cloud.finalize(req.body.media||[],req.user.id):await mediaStorage.save(req.files);
  const item={...parsed.data,ownerId:req.user.id,publicationPlan:req.user.role==='admin'?'admin-event':'free',media:saved.media,id:randomUUID(),status:'pending',createdAt:new Date().toISOString()};
  try{await push.prepare(item);await repository.create(item);}
  catch(error){await push.cancel(item.id).catch(()=>{});await saved.rollback();throw error;}
  try{await push.ready(item.id);deliver();}catch{console.error('Aviso de revisión pendiente de reintento.');}
  res.status(201).json({id:item.id,status:'pending'});
 });
 app.use('/api/admin',(req,res,next)=>{const expected=Buffer.from(env.ADMIN_TOKEN||'');const actual=Buffer.from(req.headers.authorization?.replace(/^Bearer /,'')||'');if(expected.length&&expected.length===actual.length&&timingSafeEqual(expected,actual)){res.setHeader('Cache-Control','no-store');return next();}if(auth.requireAdmin)return auth.requireAdmin(req,res,next);res.status(401).json({error:'No autorizado'});});
 app.get('/api/admin/publications',async(req,res)=>{const items=await repository.list();background(push.reconcile(items).then(()=>push.flush(repository)).catch(()=>console.error('Avisos de revisión pendientes de reintento.')));res.json({items});});
 app.use('/api/admin/push',(req,res,next)=>{if(req.user?.role!=='admin')return res.status(403).json({error:'Ingresá con tu cuenta administradora para configurar los avisos.'});next();});
 app.get('/api/admin/push/config',(req,res)=>res.json({configured:push.configured,publicKey:push.publicKey}));
 app.post('/api/admin/push/subscribe',rateLimit(rateOptions(env,'push-subscribe',3600000,20)),async(req,res)=>{
  if(!push.configured)return res.status(503).json({error:'Los avisos todavía no están configurados.'});
  const parsed=pushSubscriptionSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'La suscripción de este dispositivo no es válida.'});
  await push.subscribe(req.user,parsed.data);deliver();res.json({subscribed:true});
 });
 app.post('/api/admin/push/unsubscribe',async(req,res)=>{if(typeof req.body?.endpoint!=='string'||req.body.endpoint.length>4096)return res.sendStatus(400);if(push.configured)await push.unsubscribe(req.user,req.body.endpoint);res.json({subscribed:false});});
 app.post('/api/admin/push/test',rateLimit(rateOptions(env,'push-test',60000,3)),async(req,res)=>{if(!push.configured)return res.status(503).json({error:'Los avisos todavía no están configurados.'});if(typeof req.body?.endpoint!=='string'||req.body.endpoint.length>4096)return res.sendStatus(400);try{await push.test(req.user,req.body.endpoint);res.json({sent:true});}catch(error){res.status(400).json({error:error.message});}});
 app.get('/api/admin/visits',async(req,res)=>res.json(await analytics.stats()));
 app.post('/api/admin/publications/:id/approve',async(req,res)=>{const item=await repository.approve(req.params.id);if(!item)return res.status(404).json({error:'Publicación no encontrada'});res.json({id:item.id,status:item.status,approvedAt:item.approvedAt,expiresAt:item.expiresAt});});
 app.use((err,req,res,next)=>{
  if(err instanceof MediaError)return res.status(400).json({error:err.message});
  if(err instanceof multer.MulterError)return res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'El archivo supera el máximo de 20 MB.':'Podés adjuntar hasta 3 fotos y un video. Revisá los archivos y volvé a intentar.'});
  console.error(err.message);res.status(err.type==='entity.parse.failed'?400:503).json({error:'No pudimos completar la operación. Intentá nuevamente.'});
 });return app;
}
