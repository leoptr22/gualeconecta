import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { neon } from '@neondatabase/serverless';

export function postgres(env) {
 if(!env.DATABASE_URL)throw new Error('Falta la base de datos persistente');
 return neon(env.DATABASE_URL);
}
export function createStateDatabase(env,path,schema) {
 if(env.STATE_STORAGE!=='postgres') {
  if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
  const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;'+schema);return db;
 }
 const sql=postgres(env);
 const ready=sql.transaction([sql.query("SELECT pg_advisory_xact_lock(hashtext('guale-schema'))",[]),...schema.split(';').map(value=>value.trim()).filter(Boolean).map(value=>sql.query(value.replaceAll('INTEGER','BIGINT'),[]))]);
 // A rejected initialization is observed by the request that uses the store.
 ready.catch(()=>{});
 return {prepare(statement){let position=0;const query=statement.replace(/\?/g,()=>'$'+(++position));
  const run=async(...params)=>{await ready;return sql.query(query,params);};
  return {run,get:async(...params)=>(await run(...params))[0],all:run};
 },close(){}};
}
