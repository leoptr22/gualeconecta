import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvalWindow,hasExpired } from './publication-policy.js';
export const defaultDatabasePath=fileURLToPath(new URL('../data/publicaciones.sqlite',import.meta.url));
export function createRepository(env=process.env){
 if(env.STORAGE==='sheets'){
  if(!env.SHEETS_WEBHOOK_URL||!env.SHEETS_SECRET)throw new Error('Falta configurar Google Sheets');
  const call=async(action,payload={})=>{const response=await fetch(env.SHEETS_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.SHEETS_SECRET,action,...payload}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Sheets no disponible');const result=await response.json();if(!result.ok)throw new Error('Sheets rechazó la operación');return result.data;};
  return {list:()=>call('list'),create:item=>call('create',{item}),approve:async id=>{const item=(await call('list')).find(item=>item.id===id);if(!item)return undefined;if(item.status==='approved')return item;return call('approve',{id,window:approvalWindow(new Date(),item)});},removeExpired:time=>call('removeExpired',{now:(time||new Date()).toISOString(),window:approvalWindow(time)})};
 }
 if(env.STORAGE && env.STORAGE!=='sqlite')throw new Error('STORAGE debe ser sqlite o sheets');
 const databasePath=env.DATABASE_PATH ? (env.DATABASE_PATH===':memory:'?':memory:':resolve(env.DATABASE_PATH)) : defaultDatabasePath;
 if(databasePath!==':memory:')mkdirSync(dirname(databasePath),{recursive:true});
 const database=new DatabaseSync(databasePath);
 database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS publications (
   id TEXT PRIMARY KEY,
   status TEXT NOT NULL CHECK(status IN ('pending','approved')),
   payload TEXT NOT NULL,
   created_at TEXT NOT NULL
 );`);
 const decode=row=>row?{...JSON.parse(row.payload),status:row.status}:undefined;
 // Existing approved publications receive a full window when this policy is adopted.
 for(const row of database.prepare("SELECT id,payload,status FROM publications WHERE status='approved'").all()) {
  const item=decode(row);
  if(!item.expiresAt)database.prepare('UPDATE publications SET payload=? WHERE id=?').run(JSON.stringify({...item,...approvalWindow(new Date(),item)}),row.id);
 }
 return {
  databasePath,
  list:async()=>database.prepare('SELECT payload, status FROM publications ORDER BY created_at DESC, id').all().map(decode),
  create:async item=>{database.prepare('INSERT INTO publications (id,status,payload,created_at) VALUES (?,?,?,?)').run(item.id,item.status,JSON.stringify(item),item.createdAt);return item;},
  approve:async id=>{
   const item=decode(database.prepare('SELECT payload,status FROM publications WHERE id=?').get(id));
   if(!item)return undefined;
   if(item.status==='approved')return item;
   const approved={...item,status:'approved',...approvalWindow(new Date(),item)};
   database.prepare("UPDATE publications SET status='approved',payload=? WHERE id=? AND status='pending'").run(JSON.stringify(approved),id);
   return decode(database.prepare('SELECT payload,status FROM publications WHERE id=?').get(id));
  },
  removeExpired:async(time=new Date())=>{
   database.exec('BEGIN IMMEDIATE');
   try {
    const expired=database.prepare("SELECT id,payload,status FROM publications WHERE status='approved'").all().map(decode).filter(item=>hasExpired(item,time));
    for(const item of expired)database.prepare('DELETE FROM publications WHERE id=?').run(item.id);
    database.exec('COMMIT');return expired;
   }catch(error){database.exec('ROLLBACK');throw error;}
  },
  close:()=>database.close()
 };
}
