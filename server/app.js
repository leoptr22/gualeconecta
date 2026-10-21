import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomUUID,timingSafeEqual } from 'node:crypto';
import { publicationSchema,isActive,publicItem } from './domain.js';
import multer from 'multer';
import { createMediaStorage,MediaError } from './media.js';
import { createAuth } from './auth.js';
import { createAnalytics } from './analytics.js';
export function createApp(repository,env=process.env,authService){
 const auth=authService||createAuth(env);
 const mediaStorage=createMediaStorage(env);
 const analytics=createAnalytics(env);
 const app=express();app.disable('x-powered-by');app.use(express.json({limit:'20kb'}));
 auth.mount(app);
 app.post('/api/visits',rateLimit({windowMs:60000,limit:30,standardHeaders:'draft-7',legacyHeaders:false}),(req,res)=>{
  if(req.headers.origin!==(env.APP_ORIGIN||'http://127.0.0.1:5173'))return res.sendStatus(403);
  if(auth.currentUser?.(req)?.role!=='admin')analytics.record(req,res);
  res.sendStatus(204);
 });
 app.use('/api/media',express.static(mediaStorage.directory,{dotfiles:'deny',index:false,maxAge:'1y',immutable:true,setHeaders:res=>res.setHeader('X-Content-Type-Options','nosniff')}),(req,res)=>res.sendStatus(404));
 app.get('/api/publications',async(req,res)=>res.json({items:(await repository.list()).filter(x=>isActive(x)).map(publicItem)}));
 app.post('/api/publications',rateLimit({windowMs:3600000,limit:20,standardHeaders:'draft-7',legacyHeaders:false}),auth.requireUser,mediaStorage.upload,async(req,res)=>{
  const parsed=publicationSchema.safeParse(req.body);
  if(!parsed.success){await mediaStorage.discard(req.files);return res.status(400).json({error:'Revisá los campos y la fecha de vigencia.'});}
  const saved=await mediaStorage.save(req.files);
  try{const item=await repository.create({...parsed.data,ownerId:req.user.id,media:saved.media,id:randomUUID(),status:'pending',createdAt:new Date().toISOString()});res.status(201).json({id:item.id,status:'pending'});}
  catch(error){await saved.rollback();throw error;}
 });
 app.use('/api/admin',(req,res,next)=>{const expected=Buffer.from(env.ADMIN_TOKEN||'');const actual=Buffer.from(req.headers.authorization?.replace(/^Bearer /,'')||'');if(expected.length&&expected.length===actual.length&&timingSafeEqual(expected,actual)){res.setHeader('Cache-Control','no-store');return next();}if(auth.requireAdmin)return auth.requireAdmin(req,res,next);res.status(401).json({error:'No autorizado'});});
 app.get('/api/admin/publications',async(req,res)=>res.json({items:await repository.list()}));
 app.get('/api/admin/visits',(req,res)=>res.json(analytics.stats()));
 app.post('/api/admin/publications/:id/approve',async(req,res)=>{const item=await repository.approve(req.params.id);if(!item)return res.status(404).json({error:'Publicación no encontrada'});res.json({id:item.id,status:item.status,approvedAt:item.approvedAt,expiresAt:item.expiresAt});});
 app.use((err,req,res,next)=>{
  if(err instanceof MediaError)return res.status(400).json({error:err.message});
  if(err instanceof multer.MulterError)return res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'El archivo supera el máximo de 20 MB.':'Podés adjuntar hasta 3 fotos y un video. Revisá los archivos y volvé a intentar.'});
  console.error(err.message);res.status(err.type==='entity.parse.failed'?400:503).json({error:'No pudimos completar la operación. Intentá nuevamente.'});
 });return app;
}
