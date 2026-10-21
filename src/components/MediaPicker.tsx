import { useEffect,useRef,useState } from 'react';
import { Alert,Box,Button,IconButton,Typography } from '@mui/material';
import AddPhotoAlternate from '@mui/icons-material/AddPhotoAlternate';
import VideoLibrary from '@mui/icons-material/VideoLibrary';
import Close from '@mui/icons-material/Close';

export type MediaSelection={photos:File[];video:File|null};
export const emptyMedia=():MediaSelection=>({photos:[],video:null});

function usePreviewUrls(files:File[]){
 const [urls,setUrls]=useState<string[]>([]);
 useEffect(()=>{const next=files.map(file=>URL.createObjectURL(file));setUrls(next);return()=>next.forEach(url=>URL.revokeObjectURL(url));},[files]);
 return urls;
}

function videoDuration(file:File):Promise<number>{
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file);const element=document.createElement('video');
  const finish=(error?:Error)=>{clearTimeout(timer);element.removeAttribute('src');URL.revokeObjectURL(url);if(error)reject(error);};
  const timer=setTimeout(()=>finish(new Error('No pudimos leer el video. Probá con otro MP4.')),10000);
  element.preload='metadata';
  element.onloadedmetadata=()=>{const duration=element.duration;finish();resolve(duration);};
  element.onerror=()=>finish(new Error('No pudimos leer el video. Usá MP4 con H.264.'));
  element.src=url;
 });
}

export function MediaPicker({value,onChange,disabled,onChecking}:{value:MediaSelection;onChange:(value:MediaSelection)=>void;disabled:boolean;onChecking:(checking:boolean)=>void}){
 const [error,setError]=useState('');const [checking,setChecking]=useState(false);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const photos=usePreviewUrls(value.photos);
 const [videoUrl,setVideoUrl]=useState('');
 useEffect(()=>{if(!value.video){setVideoUrl('');return;}const url=URL.createObjectURL(value.video);setVideoUrl(url);return()=>URL.revokeObjectURL(url);},[value.video]);
 function selectPhotos(files:File[]){
  setError('');
  if(value.photos.length+files.length>3){setError('Podés agregar hasta 3 fotos. Quitá una antes de agregar otra.');return;}
  if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)){setError('Usá fotos JPG, PNG o WebP de hasta 8 MB cada una.');return;}
  onChange({...value,photos:[...value.photos,...files]});
 }
 async function selectVideo(file?:File){
  if(!file)return;setError('');
  if(file.type!=='video/mp4'||file.size>20*1024*1024){setError('Usá un video MP4 de hasta 20 MB.');return;}
  setChecking(true);onChecking(true);
  try{const duration=await videoDuration(file);if(!Number.isFinite(duration)||duration<=0||duration>30)throw new Error('El video debe durar como máximo 30 segundos.');if(mounted.current)onChange({...value,video:file});}
  catch(error){if(mounted.current)setError((error as Error).message);}
  finally{if(mounted.current){setChecking(false);onChecking(false);}}
 }
 return <Box component="section" className="media-picker" aria-label="Fotos y video">
  <Typography fontWeight={700}>Fotos y video <Typography component="span" color="text.secondary">(opcional)</Typography></Typography>
  <Typography variant="body2" color="text.secondary" mt={.5}>Hasta 3 fotos de 8 MB y un video MP4 H.264 de 30 segundos y 20 MB.</Typography>
  <Box display="flex" gap={1} flexWrap="wrap" mt={2}>
   <Button component="label" variant="outlined" startIcon={<AddPhotoAlternate/>} disabled={disabled||checking||value.photos.length===3}>Agregar fotos<input className="file-input" aria-label="Seleccionar fotos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled||checking||value.photos.length===3} onChange={event=>{selectPhotos(Array.from(event.target.files||[]));event.target.value='';}}/></Button>
   <Button component="label" variant="outlined" startIcon={<VideoLibrary/>} disabled={disabled||checking}>{checking?'Revisando video…':value.video?'Cambiar video':'Agregar video'}<input className="file-input" aria-label="Seleccionar video" type="file" accept="video/mp4" disabled={disabled||checking} onChange={event=>{void selectVideo(event.target.files?.[0]);event.target.value='';}}/></Button>
  </Box>
  {error&&<Alert severity="error" sx={{mt:2}}>{error}</Alert>}
  {!!photos.length&&<div className="media-previews">{photos.map((url,index)=><div className="media-preview" key={url}><img src={url} alt={`Foto ${index+1}: ${value.photos[index]?.name}`}/><IconButton className="media-remove" size="small" aria-label={`Quitar foto ${index+1}`} disabled={disabled||checking} onClick={()=>onChange({...value,photos:value.photos.filter((_,i)=>i!==index)})}><Close fontSize="small"/></IconButton></div>)}</div>}
  {videoUrl&&<div className="video-preview"><video src={videoUrl} controls playsInline preload="metadata" aria-label="Vista previa del video"/><Button startIcon={<Close/>} disabled={disabled||checking} onClick={()=>onChange({...value,video:null})}>Quitar video</Button></div>}
 </Box>;
}
