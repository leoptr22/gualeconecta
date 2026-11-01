import { createPostgresAnalytics } from './postgres-analytics.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes,createHash } from 'node:crypto';
import { parseCookie,stringifySetCookie } from 'cookie';

const day = time => new Date(time).toLocaleDateString('en-CA',{timeZone:'America/Argentina/Buenos_Aires'});
const hash = value => createHash('sha256').update(value).digest('hex');
const windowMs = 30*60*1000;
export function createAnalytics(env=process.env,now=Date.now) {
 if(env.STATE_STORAGE==='postgres')return createPostgresAnalytics(env,now);
 const path=env.ANALYTICS_DATABASE_PATH===':memory:'||process.env.NODE_ENV==='test'?':memory:':env.ANALYTICS_DATABASE_PATH?resolve(env.ANALYTICS_DATABASE_PATH):fileURLToPath(new URL('../data/visitas.sqlite',import.meta.url));
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS visit_days (day TEXT PRIMARY KEY,count INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS visit_sessions (token_hash TEXT PRIMARY KEY,last_seen INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS visit_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
 db.prepare('INSERT OR IGNORE INTO visit_meta VALUES (?,?)').run('startedAt',new Date(now()).toISOString());
 return {
  record(req,res) {
   const time=now();
   const cookie=parseCookie(req.headers.cookie||'').guale_visit;
   let token=typeof cookie==='string'&&/^[a-zA-Z0-9_-]{32}$/.test(cookie)?cookie:null;
   const previous=token?db.prepare('SELECT last_seen FROM visit_sessions WHERE token_hash=?').get(hash(token)):null;
   db.exec('BEGIN IMMEDIATE');
   try {
    db.prepare('DELETE FROM visit_sessions WHERE last_seen<=?').run(time-windowMs);
    if(!previous||previous.last_seen<=time-windowMs) {
     token=randomBytes(24).toString('base64url');
     db.prepare('INSERT INTO visit_days VALUES (?,1) ON CONFLICT(day) DO UPDATE SET count=count+1').run(day(time));
    }
    db.prepare('INSERT INTO visit_sessions VALUES (?,?) ON CONFLICT(token_hash) DO UPDATE SET last_seen=excluded.last_seen').run(hash(token),time);
    db.exec('COMMIT');
   } catch(error) {db.exec('ROLLBACK');throw error;}
   res.append('Set-Cookie',stringifySetCookie({name:'guale_visit',value:token,path:'/',httpOnly:true,sameSite:'lax',secure:env.NODE_ENV==='production',maxAge:1800}));
   res.setHeader('Cache-Control','no-store');
  },
  stats() {return {total:Number(db.prepare('SELECT COALESCE(SUM(count),0) AS total FROM visit_days').get().total),today:Number(db.prepare('SELECT count FROM visit_days WHERE day=?').get(day(now()))?.count||0),startedAt:db.prepare('SELECT value FROM visit_meta WHERE key=?').get('startedAt').value};},
  close() {db.close();}
 };
}
