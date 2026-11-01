import { readFileSync,existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parse } from 'dotenv';
import { postgres,createStateDatabase } from '../server/state-database.js';
import { createPostgresAnalytics } from '../server/postgres-analytics.js';

const env={...parse(readFileSync('.env','utf8')),...parse(readFileSync('.env.local','utf8')),STATE_STORAGE:'postgres'};
const schema='CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL,name TEXT NOT NULL);CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at BIGINT NOT NULL);';
const auth=createStateDatabase(env,':memory:',schema);await auth.prepare('SELECT COUNT(*) AS count FROM users').get();
await createPostgresAnalytics(env).stats();
const sql=postgres(env);
await sql.query('CREATE TABLE IF NOT EXISTS state_migrations (id TEXT PRIMARY KEY,created_at TEXT NOT NULL)',[]);
const operations=[sql.query("SELECT pg_advisory_xact_lock(hashtext('guale-local-state-v1'))",[])];
let users=0,days=0;
const accountPath=env.AUTH_DATABASE_PATH||'data/accounts.sqlite';
if(existsSync(accountPath)){
 const db=new DatabaseSync(accountPath,{readOnly:true});const rows=db.prepare('SELECT id,email,name FROM users').all();db.close();users=rows.length;
 for(const row of rows)operations.push(sql.query('INSERT INTO users VALUES ($1,$2,$3) ON CONFLICT(id) DO NOTHING',[row.id,row.email,row.name]));
}
const analyticsPath=env.ANALYTICS_DATABASE_PATH||'data/visitas.sqlite';
if(existsSync(analyticsPath)){
 const db=new DatabaseSync(analyticsPath,{readOnly:true});const rows=db.prepare('SELECT day,count FROM visit_days').all();const startedAt=db.prepare("SELECT value FROM visit_meta WHERE key='startedAt'").get()?.value;db.close();days=rows.length;
 for(const row of rows)operations.push(sql.query(`INSERT INTO visit_days SELECT $1,$2 WHERE NOT EXISTS (SELECT 1 FROM state_migrations WHERE id='local-state-v1') ON CONFLICT(day) DO UPDATE SET count=visit_days.count+EXCLUDED.count`,[row.day,row.count]));
 if(startedAt)operations.push(sql.query("UPDATE visit_meta SET value=LEAST(value,$1) WHERE key='startedAt'",[startedAt]));
}
operations.push(sql.query("INSERT INTO state_migrations VALUES ('local-state-v1',$1) ON CONFLICT(id) DO NOTHING",[new Date().toISOString()]));
await sql.transaction(operations);
console.log(JSON.stringify({migracion:'verificada',usuariosLeidos:users,diasLeidos:days,sesionesLocales:'no copiadas',estadisticas:await createPostgresAnalytics(env).stats()}));
