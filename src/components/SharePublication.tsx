import { useState } from 'react';
import { Alert,Button,Dialog,DialogActions,DialogContent,DialogTitle,TextField,Typography } from '@mui/material';
import ShareOutlined from '@mui/icons-material/ShareOutlined';
import ContentCopy from '@mui/icons-material/ContentCopy';
import { publicationShareData } from '../services/sharing';
import type { Publication } from '../types';

export function SharePublication({item}:{item:Publication}) {
 const [open,setOpen]=useState(false);
 const [message,setMessage]=useState('');
 const [working,setWorking]=useState(false);
 const data=publicationShareData(item);
 const shareNative=async()=>{
  setMessage('');
  if(navigator.share){
   setWorking(true);
   try{await navigator.share(data);return;}catch(error){if((error as Error).name==='AbortError')return;setMessage('Probá copiando el enlace o compartiendo por WhatsApp.');}finally{setWorking(false);}
  }
 };
 const copy=async()=>{
  try{await navigator.clipboard.writeText(data.url);setMessage('Enlace copiado.');}
  catch{setMessage('Seleccioná el enlace y copialo manualmente.');}
 };
 return <><Button className="share-publication" startIcon={<ShareOutlined/>} onClick={()=>{setMessage('');setOpen(true);}} aria-label={`Compartir ${item.title}`}>Compartir</Button>
  <Dialog open={open} onClose={()=>setOpen(false)} fullWidth maxWidth="xs" aria-labelledby={`share-title-${item.id}`}>
   <DialogTitle id={`share-title-${item.id}`}>Compartir publicación</DialogTitle>
   <DialogContent className="share-dialog-content"><Typography fontWeight={700}>{item.title}</Typography>
    <TextField label="Enlace a la publicación" value={data.url} fullWidth slotProps={{input:{readOnly:true}}} onFocus={event=>(event.target as HTMLInputElement).select()}/>
    <Button variant="contained" startIcon={<ContentCopy/>} onClick={()=>void copy()}>Copiar enlace</Button>
    <Button component="a" href={`https://wa.me/?text=${encodeURIComponent(data.text+'\n'+data.url)}`} target="_blank" rel="noopener noreferrer" variant="outlined">Compartir por WhatsApp</Button>
    {typeof navigator.share==='function'&&<Button startIcon={<ShareOutlined/>} disabled={working} onClick={()=>void shareNative()}>Otras aplicaciones</Button>}
    {message&&<Alert severity={message==='Enlace copiado.'?'success':'info'} role="status">{message}</Alert>}
    {['localhost','127.0.0.1','::1','[::1]'].includes(window.location.hostname)&&<Typography variant="body2" color="text.secondary">Este enlace es local. Otras personas podrán abrirlo cuando la web esté publicada con su dominio.</Typography>}
   </DialogContent><DialogActions><Button onClick={()=>setOpen(false)}>Cerrar</Button></DialogActions>
  </Dialog>
 </>;
}
