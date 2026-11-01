import { createApp } from '../server/app.js';
import { createRepository } from '../server/repository.js';

// Construct once per warm instance. All durable state lives in Sheets, Postgres and Blob.
let app;
export default function handler(request,response) {
 try {
  if(process.env.STATE_STORAGE!=='postgres'||process.env.MEDIA_STORAGE!=='blob'||process.env.STORAGE!=='sheets')throw new Error('Configuración de producción incompleta');
  if(!app){const env={...process.env,NODE_ENV:'production'};app=createApp(createRepository(env),env);}
  return app(request,response);
 }catch(error){console.error(error.message);response.setHeader('Cache-Control','no-store');return response.status(503).json({error:'El servidor todavía no está configurado. Intentá nuevamente en unos minutos.'});}
}
