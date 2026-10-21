import 'dotenv/config';
import { createRepository } from '../server/repository.js';

// Run only after deploying Apps Script and configuring the webhook URL.
const local=createRepository({...process.env,STORAGE:'sqlite'});
try {
 const remote=createRepository({...process.env,STORAGE:'sheets'});
 const items=await local.list();
 const current=await remote.list();
 const keys=['id','title','business','description','category','kind','town','address','endsAt','contact','status','createdAt','media','ownerId','approvedAt','expiresAt','publicationPlan'];
 const comparable=item=>JSON.stringify(keys.map(key=>key==='media'?JSON.stringify(item.media||[]):String(item[key]||'')));
 for(const item of items){const existing=current.find(value=>value.id===item.id);if(existing&&comparable(existing)!==comparable(item))throw new Error('Una publicación tiene datos diferentes en la hoja. No se sobrescribió.');}
 for(const item of items)await remote.create(item);
 const saved=await remote.list();
 if(items.some(item=>!saved.some(value=>value.id===item.id&&comparable(value)===comparable(item))))throw new Error('No se pudo verificar la migración completa. SQLite sigue intacto.');
 console.log(`Migración verificada: ${items.length} publicaciones. SQLite y adjuntos se conservaron. Ahora podés seleccionar STORAGE=sheets y reiniciar.`);
}catch(error){console.error(error.message);process.exitCode=1;}finally{local.close();}
