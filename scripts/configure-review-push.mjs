import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { parse } from 'dotenv';
import webpush from 'web-push';
let source=readFileSync('.env','utf8');const env=parse(source);
if(Boolean(env.VAPID_PUBLIC_KEY)!==Boolean(env.VAPID_PRIVATE_KEY))throw new Error('La configuración de claves push está incompleta.');
if(!env.VAPID_PUBLIC_KEY){const keys=webpush.generateVAPIDKeys();env.VAPID_PUBLIC_KEY=keys.publicKey;env.VAPID_PRIVATE_KEY=keys.privateKey;source+='\nVAPID_PUBLIC_KEY='+keys.publicKey+'\nVAPID_PRIVATE_KEY='+keys.privateKey+'\n';writeFileSync('.env',source);}
mkdirSync('data',{recursive:true});writeFileSync('data/vercel-review-push-env.json',JSON.stringify([{key:'VAPID_PUBLIC_KEY',value:env.VAPID_PUBLIC_KEY,secret:false},{key:'VAPID_PRIVATE_KEY',value:env.VAPID_PRIVATE_KEY,secret:true}]));
console.log('Claves de notificaciones preparadas; valores privados no expuestos.');
