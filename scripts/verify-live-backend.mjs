import { spawn } from 'node:child_process';
import { readFileSync,unlinkSync } from 'node:fs';
import { randomBytes,randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import sharp from 'sharp';
import { put } from '@vercel/blob/client';

const [deployment,cliPath]=process.argv.slice(2);
if(!deployment?.startsWith('https://gualeconecta-')||!cliPath)throw new Error('Indicá el despliegue propio y la ruta del CLI oficial.');
const origin='https://gualeconecta.vercel.app';
const local=parse(readFileSync('.env','utf8'));const cookieFile=resolve('data/backend-verification.cookies');
async function request(path,{body,csrf}={}) {
 const args=[cliPath,'curl',path,'--deployment',deployment,'--scope','leoptr22s-projects','--','--silent','--show-error','--cookie',cookieFile,'--cookie-jar',cookieFile,'--header','Origin: '+origin];
 if(body)args.push('--request','POST','--header','Content-Type: application/json','--data-binary','@-');
 if(csrf)args.push('--header','X-CSRF-Token: '+csrf);
 return new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{stdio:['pipe','pipe','pipe']});let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.resume();child.on('error',reject);child.on('close',code=>{if(code)return reject(new Error('Falló la petición de verificación'));if(!output||output==='No Content')return resolve({});try{resolve(JSON.parse(output));}catch{reject(new Error('La API no devolvió JSON'));}});child.stdin.end(body?JSON.stringify(body):'');});
}
async function readPassword(){
 process.stdout.write('Contraseña administrativa (entrada oculta):\n');
 if(process.stdin.isTTY)process.stdin.setRawMode(true);
 return new Promise(resolve=>{let value='';const handle=data=>{const chunk=data.toString();if(chunk.includes('\u0003'))process.exit(130);value+=chunk;if(/[\r\n]/.test(value)){process.stdin.off('data',handle);if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();resolve(value.replace(/[\r\n].*$/s,''));}};process.stdin.on('data',handle);process.stdin.resume();});
}
let csrf,media,loggedIn=false;
try {
 const health=await request('/api/health');if(!health.ok)throw new Error('Salud del backend no verificada');
 const session=await request('/api/auth/session');csrf=session.csrfToken;if(!csrf)throw new Error('No se recibió CSRF');
 const password=await readPassword();const result=await request('/api/auth/admin',{body:{email:local.ADMIN_EMAIL,password},csrf});if(result.user?.role!=='admin')throw new Error(result.error||'No se pudo ingresar');loggedIn=true;
 const visits=await request('/api/admin/visits');if(typeof visits.total!=='number')throw new Error('Estadísticas no verificadas');
 const publications=await request('/api/publications');if(!Array.isArray(publications.items))throw new Error('Sheets no verificado');
 const uploadSession=await request('/api/auth/session');const pathname=uploadSession.mediaUploadPrefix+randomUUID()+'.png';
 const generated=await request('/api/uploads/authorize',{csrf,body:{type:'blob.generate-client-token',payload:{pathname,multipart:true,clientPayload:null}}});
 if(!generated.clientToken)throw new Error(generated.error||'No se pudo autorizar la carga');
 const buffer=await sharp(randomBytes(1600*1200*3),{raw:{width:1600,height:1200,channels:3}}).png().toBuffer();
 if(buffer.length<=4.5*1024*1024)throw new Error('El archivo técnico no alcanza el tamaño de prueba');
 const blob=await put(pathname,buffer,{access:'public',contentType:'image/png',multipart:true,token:generated.clientToken});media=[{type:'image',url:blob.url}];
 const check=await fetch(blob.url,{method:'HEAD'});if(!check.ok||Number(check.headers.get('content-length'))!==buffer.length)throw new Error('La carga no se pudo verificar');
 console.log(JSON.stringify({backend:'verificado',administrador:'verificado',sheets:'verificado',visitas:visits.total,cargaDirectaBytes:buffer.length,publicacionesDePruebaCreadas:0}));
}finally {
 if(media&&csrf)await request('/api/uploads/discard',{csrf,body:{media}});
 if(loggedIn&&csrf)await request('/api/auth/logout',{csrf,body:{}});
 try{unlinkSync(cookieFile);}catch{}
}
