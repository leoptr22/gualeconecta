import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { parse } from 'dotenv';

let text=readFileSync('.env','utf8');const local=parse(text);
if(!local.CRON_SECRET){local.CRON_SECRET=randomBytes(32).toString('hex');text+='\nCRON_SECRET='+local.CRON_SECRET+'\n';writeFileSync('.env',text);}
const config={STATE_STORAGE:'postgres',MEDIA_STORAGE:'blob',STORAGE:'sheets',APP_ORIGIN:'https://gualeconecta.vercel.app',MEDIA_BLOB_HOST:'azsfvccysthtfuuj.public.blob.vercel-storage.com',BLOB_STORE_ID:'store_AZSFVCCYsThTfUUJ'};
const secrets={};for(const key of ['SHEETS_WEBHOOK_URL','SHEETS_SECRET','ADMIN_EMAIL','ADMIN_PASSWORD_HASH','GOOGLE_CLIENT_ID','CRON_SECRET']){if(!local[key])throw new Error('Falta '+key);secrets[key]=local[key];}
mkdirSync('data',{recursive:true});writeFileSync('data/vercel-backend-env.json',JSON.stringify([...Object.entries(config).map(([key,value])=>({key,value,secret:false})),...Object.entries(secrets).map(([key,value])=>({key,value,secret:true}))]));
console.log('Configuración privada preparada en data; valores no expuestos.');
