import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { parse } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { createRepository } from '../server/repository.js';
import { adminEventExpiry } from '../server/publication-policy.js';

const env={...parse(readFileSync('.env','utf8')),...parse(readFileSync('.env.local','utf8'))};
const owners=await neon(env.DATABASE_URL).query('SELECT id FROM users WHERE lower(email)=lower($1)',[env.ADMIN_EMAIL]);
const ids=new Set(owners.map(row=>row.id));
const records=await createRepository(env).list();
const changes=records.flatMap((item,index)=>ids.has(item.ownerId)&&item.status==='approved'&&item.publicationPlan!=='admin-event'?[{id:item.id,row:index+2,previousExpiresAt:item.expiresAt,expiresAt:adminEventExpiry(item.endsAt),publicationPlan:'admin-event'}]:[]);
mkdirSync('data',{recursive:true});writeFileSync('data/admin-expiry-migration.json',JSON.stringify(changes,null,2));
console.log(JSON.stringify({publicacionesIdentificadas:changes.length,archivo:'data/admin-expiry-migration.json',datosModificados:false}));
