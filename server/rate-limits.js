import { createHash } from 'node:crypto';
import { postgres } from './state-database.js';
const initialized=new Map();

export function rateOptions(env,prefix,windowMs,limit) {
 const options={windowMs,limit,standardHeaders:'draft-7',legacyHeaders:false};
 if(env.STATE_STORAGE!=='postgres')return options;
 const sql=postgres(env);
 let ready=initialized.get(env.DATABASE_URL);
 if(!ready){ready=sql.transaction([sql.query("SELECT pg_advisory_xact_lock(hashtext('guale-schema'))",[]),sql.query('CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY,hits INTEGER NOT NULL,reset_at BIGINT NOT NULL)',[])]);initialized.set(env.DATABASE_URL,ready);ready.catch(()=>initialized.delete(env.DATABASE_URL));}
 const keyFor=key=>prefix+':'+createHash('sha256').update(key).digest('hex');
 return {...options,store:{
  async increment(key){await ready;const time=Date.now();const [row]=await sql.query(`INSERT INTO rate_limits VALUES ($1,1,$2)
   ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.reset_at<=$3 THEN 1 ELSE rate_limits.hits+1 END,
   reset_at=CASE WHEN rate_limits.reset_at<=$3 THEN $2 ELSE rate_limits.reset_at END RETURNING hits,reset_at`,[keyFor(key),time+windowMs,time]);return {totalHits:Number(row.hits),resetTime:new Date(Number(row.reset_at))};},
  async decrement(key){await ready;await sql.query('UPDATE rate_limits SET hits=GREATEST(hits-1,0) WHERE key=$1',[keyFor(key)]);},
  async resetKey(key){await ready;await sql.query('DELETE FROM rate_limits WHERE key=$1',[keyFor(key)]);}
 }};
}
