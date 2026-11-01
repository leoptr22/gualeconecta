import { randomBytes,createHash } from 'node:crypto';
import { parseCookie,stringifySetCookie } from 'cookie';
import { postgres } from './state-database.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const day=time=>new Date(time).toLocaleDateString('en-CA',{timeZone:'America/Argentina/Buenos_Aires'});
export function createPostgresAnalytics(env,now=Date.now) {
 const sql=postgres(env);
 const ready=sql.transaction([
  sql.query("SELECT pg_advisory_xact_lock(hashtext('guale-schema'))",[]),
  sql.query('CREATE TABLE IF NOT EXISTS visit_days (day TEXT PRIMARY KEY,count BIGINT NOT NULL)',[]),
  sql.query('CREATE TABLE IF NOT EXISTS visit_sessions (token_hash TEXT PRIMARY KEY,last_seen BIGINT NOT NULL)',[]),
  sql.query('CREATE TABLE IF NOT EXISTS visit_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL)',[]),
  sql.query('INSERT INTO visit_meta VALUES ($1,$2) ON CONFLICT(key) DO NOTHING',['startedAt',new Date(now()).toISOString()])
 ]);ready.catch(()=>{});
 return {
  async record(req,res) {
   await ready;const time=now();const previous=parseCookie(req.headers.cookie||'').guale_visit;
   const token=typeof previous==='string'&&/^[a-zA-Z0-9_-]{32}$/.test(previous)?previous:randomBytes(24).toString('base64url');
   await sql.transaction([
    sql.query(`WITH accepted AS (
     INSERT INTO visit_sessions VALUES ($1,$2) ON CONFLICT(token_hash) DO UPDATE SET last_seen=EXCLUDED.last_seen
     WHERE visit_sessions.last_seen<=$3 RETURNING token_hash
    ) INSERT INTO visit_days SELECT $4,1 FROM accepted
    ON CONFLICT(day) DO UPDATE SET count=visit_days.count+1`,[hash(token),time,time-1800000,day(time)]),
    sql.query('UPDATE visit_sessions SET last_seen=GREATEST(last_seen,$1) WHERE token_hash=$2',[time,hash(token)]),
    sql.query('DELETE FROM visit_sessions WHERE last_seen<$1',[time-1800000])
   ]);
   res.append('Set-Cookie',stringifySetCookie({name:'guale_visit',value:token,path:'/',httpOnly:true,sameSite:'lax',secure:env.NODE_ENV==='production',maxAge:1800}));res.setHeader('Cache-Control','no-store');
  },
  async stats(){await ready;const [row]=await sql.query(`SELECT (SELECT COALESCE(SUM(count),0) FROM visit_days) AS total,
   (SELECT COALESCE(SUM(count),0) FROM visit_days WHERE day=$1) AS today,
   (SELECT value FROM visit_meta WHERE key='startedAt') AS "startedAt"`,[day(now())]);return {...row,total:Number(row.total),today:Number(row.today)};},close(){}
 };
}
