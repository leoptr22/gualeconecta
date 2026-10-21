import 'dotenv/config';
import { createRepository } from './repository.js';
const [action='list',id]=process.argv.slice(2);
if(!['list','approve'].includes(action)||action==='approve'&&!id){console.error('Uso: npm run moderar -- list | approve <id>');process.exit(1);}
const repository=createRepository();
try{
 if(action==='list'){
  const items=await repository.list();
  if(!items.length)console.log('Todavía no hay publicaciones cargadas.');
  else console.table(items.map(({id,title,business,status,endsAt})=>({id,title,business,status,endsAt})));
 }else{
  const item=await repository.approve(id);
  if(!item){console.error('Publicación no encontrada.');process.exitCode=1;}
  else console.log(`Publicación aprobada: ${item.title}`);
 }
}finally{repository.close?.();}
