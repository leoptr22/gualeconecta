import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes,createHash,timingSafeEqual } from 'node:crypto';
import { parseCookie as parse,stringifySetCookie } from 'cookie';
import { OAuth2Client } from 'google-auth-library';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAdminPassword } from './admin-password.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const serialize=(name,value,options)=>stringifySetCookie({name,value,...options});
const cookieNames={session:'guale_session',csrf:'guale_csrf'};
const equal=(a,b)=>{const left=Buffer.from(a||'');const right=Buffer.from(b||'');return left.length>0&&left.length===right.length&&timingSafeEqual(left,right);};
export function createAuth(env=process.env,verifyGoogle){
 const path=env.AUTH_DATABASE_PATH===':memory:'?':memory:':env.AUTH_DATABASE_PATH?resolve(env.AUTH_DATABASE_PATH):fileURLToPath(new URL('../data/accounts.sqlite',import.meta.url));
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path);db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL,name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL);`);
 const client=new OAuth2Client(env.GOOGLE_CLIENT_ID);
 const verify=verifyGoogle|| (async token=>(await client.verifyIdToken({idToken:token,audience:env.GOOGLE_CLIENT_ID})).getPayload());
 const configured=Boolean(env.GOOGLE_CLIENT_ID);
 const adminEmail=(env.ADMIN_EMAIL||'').trim().toLowerCase();
 const adminLoginEnabled=Boolean(adminEmail&&env.ADMIN_PASSWORD_HASH);
 const withRole=user=>({...user,role:adminEmail&&user.email.toLowerCase()===adminEmail?'admin':'publisher'});
 const origin=env.APP_ORIGIN||'http://127.0.0.1:5173';
 if(env.NODE_ENV==='production'&&(!env.APP_ORIGIN||!origin.startsWith('https://')))throw new Error('Producción requiere APP_ORIGIN con HTTPS');
 const cookieOptions={httpOnly:true,sameSite:'lax',secure:env.NODE_ENV==='production',path:'/'};
 const cookies=req=>parse(req.headers.cookie||'');
 const session=req=>{const token=cookies(req)[cookieNames.session];if(!token)return null;const row=db.prepare('SELECT users.id, users.email, users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?').get(hash(token),Date.now());return row?withRole(row):null;};
 const csrf=(req,res,next)=>{if(req.headers.origin!==origin||!equal(req.headers['x-csrf-token'],cookies(req)[cookieNames.csrf]))return res.status(403).json({error:'La sesión de seguridad cambió. Cerrá el formulario y volvé a intentar.'});next();};
 const router=express.Router();
 const startSession=(req,res,user)=>{
  db.prepare('INSERT INTO users (id,email,name) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name').run(user.id,user.email,user.name);
  const previous=cookies(req)[cookieNames.session];if(previous)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(previous));
  db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
  const token=randomBytes(32).toString('base64url');db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token),user.id,Date.now()+7*86400000);
  res.append('Set-Cookie',serialize(cookieNames.session,token,{...cookieOptions,maxAge:7*86400}));res.setHeader('Cache-Control','no-store');res.json({user:withRole(user)});
 };
 router.get('/session',(req,res)=>{const token=cookies(req)[cookieNames.csrf]||randomBytes(32).toString('base64url');res.setHeader('Cache-Control','no-store');res.append('Set-Cookie',serialize(cookieNames.csrf,token,{...cookieOptions,maxAge:900}));res.json({configured,adminLoginEnabled,clientId:env.GOOGLE_CLIENT_ID||null,csrfToken:token,user:session(req)});});
 router.post('/admin',rateLimit({windowMs:900000,limit:10,standardHeaders:'draft-7',legacyHeaders:false}),csrf,async(req,res)=>{
  if(!adminLoginEnabled)return res.status(503).json({error:'El acceso administrativo no está configurado.'});
  const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';
  const valid=await verifyAdminPassword(req.body?.password,env.ADMIN_PASSWORD_HASH);
  if(!valid||email!==adminEmail)return res.status(401).json({error:'Email o contraseña incorrectos.'});
  startSession(req,res,{id:`admin:${hash(adminEmail)}`,email:adminEmail,name:'Guale Conecta'});
 });
 router.post('/google',rateLimit({windowMs:900000,limit:30,standardHeaders:'draft-7',legacyHeaders:false}),csrf,async(req,res)=>{
  if(!configured)return res.status(503).json({error:'El acceso con Google todavía no está configurado.'});
  if(typeof req.body?.credential!=='string'||req.body.credential.length>10000)return res.status(400).json({error:'Credencial de Google inválida.'});
  let payload;try{payload=await verify(req.body.credential);}catch{return res.status(401).json({error:'Google no pudo verificar tu cuenta. Intentá ingresar otra vez.'});}
  if(!payload?.sub||!payload.email||!payload.email_verified||!equal(payload.nonce,cookies(req)[cookieNames.csrf]))return res.status(401).json({error:'No pudimos validar tu cuenta. Volvé a iniciar sesión.'});
  const user={id:payload.sub,email:payload.email,name:payload.name||payload.email};
  startSession(req,res,user);
 });
 router.post('/logout',csrf,(req,res)=>{const token=cookies(req)[cookieNames.session];if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));res.append('Set-Cookie',serialize(cookieNames.session,'',{...cookieOptions,maxAge:0}));res.json({ok:true});});
 return {currentUser:session,mount:app=>app.use('/api/auth',router),requireAdmin:(req,res,next)=>{const user=session(req);if(!user)return res.status(401).json({error:'Ingresá para administrar publicaciones.'});if(user.role!=='admin')return res.status(403).json({error:'Tu cuenta no tiene acceso al panel.'});req.user=user;if(['GET','HEAD'].includes(req.method)){res.setHeader('Cache-Control','no-store');return next();}csrf(req,res,next);},requireUser:(req,res,next)=>{const user=session(req);if(!user)return res.status(401).json({error:'Iniciá sesión para publicar.'});req.user=user;csrf(req,res,next);},close:()=>db.close()};
}

