// Copiar en Extensiones > Apps Script de una hoja privada.
// Propiedad del script: SHARED_SECRET. Desplegar como aplicación web,
// ejecutar como propietario y permitir acceso a cualquiera (la API valida el secreto).
const HEADERS = ['id','title','business','description','category','kind','town','address','endsAt','contact','status','createdAt','media','ownerId','approvedAt','expiresAt','publicationPlan'];
function doPost(e) {
 const lock=LockService.getScriptLock();
 try {
  const input=JSON.parse(e.postData.contents);
  const secret=PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
  if(!secret||input.secret!==secret)throw new Error('Unauthorized');
  lock.waitLock(10000);
  const spreadsheetId=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const book=spreadsheetId?SpreadsheetApp.openById(spreadsheetId):SpreadsheetApp.getActiveSpreadsheet();
  const sheet=book.getSheetByName('Publicaciones')||book.insertSheet('Publicaciones');
  if(sheet.getLastRow()===0)sheet.appendRow(HEADERS);
  // Añadir la columna de adjuntos a hojas existentes sin mover sus datos.
  ['media','ownerId','approvedAt','expiresAt','publicationPlan'].forEach(key=>{const column=HEADERS.indexOf(key)+1;if(sheet.getRange(1,column).getValue()==='')sheet.getRange(1,column).setValue(key);});
  if(sheet.getRange(1,1,1,HEADERS.length).getDisplayValues()[0].some((value,i)=>value!==HEADERS[i]))throw new Error('Unexpected columns');
  const read=()=>sheet.getLastRow()<2?[]:sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS.length).getDisplayValues().map(row=>{
   const item=Object.fromEntries(HEADERS.map((key,i)=>[key,row[i]]));
   item.media=item.media?JSON.parse(item.media):[];
   return item;
  });
  let data;
  if(input.action==='list')data=read();
  else if(input.action==='create'){
   // Retried migrations never create duplicate rows or overwrite existing content.
   const existing=read().find(item=>item.id===input.item.id);
   if(existing){
    const comparable=item=>HEADERS.map(key=>key==='media'?JSON.stringify(item.media||[]):String(item[key]||''));
    if(JSON.stringify(comparable(existing))!==JSON.stringify(comparable(input.item)))throw new Error('Conflicting id');
    return json({ok:true,data:existing});
   }
   const row=HEADERS.map(key=>key==='media'?JSON.stringify(input.item.media||[]):String(input.item[key]||''));
   // Texto plano evita fórmulas inyectadas desde campos de usuarios.
   const range=sheet.getRange(sheet.getLastRow()+1,1,1,HEADERS.length);
   range.setNumberFormat('@');range.setValues([row.map(value=>/^[=+@-]/.test(value)?"'"+value:value)]);data=input.item;
  } else if(input.action==='approve'){
   const rows=read();const index=rows.findIndex(row=>row.id===input.id);
   data=null;if(index>=0){
    data=rows[index];if(data.status!=='approved'){
     data={...data,status:'approved',...input.window};
     ['status','approvedAt','expiresAt','publicationPlan'].forEach(key=>sheet.getRange(index+2,HEADERS.indexOf(key)+1).setNumberFormat('@').setValue(data[key]));
    }
   }
  } else if(input.action==='removeExpired'){
   const rows=read();data=[];
   for(let index=rows.length-1;index>=0;index--){
    const item=rows[index];if(item.status!=='approved')continue;
    if(!item.expiresAt){
     ['approvedAt','expiresAt','publicationPlan'].forEach(key=>sheet.getRange(index+2,HEADERS.indexOf(key)+1).setNumberFormat('@').setValue(input.window[key]));
    }else if(Date.parse(item.expiresAt)<=Date.parse(input.now)){sheet.deleteRow(index+2);data.push(item);}
   }
  } else throw new Error('Unknown action');
  return json({ok:true,data});
 }catch(err){return json({ok:false,error:'Operation failed'});}finally{if(lock.hasLock())lock.releaseLock();}
}
function json(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
