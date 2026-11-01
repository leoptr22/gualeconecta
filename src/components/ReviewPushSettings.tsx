import { useEffect,useState } from 'react';
import { Alert,Button,Typography } from '@mui/material';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import { api } from '../services/api';

function serverKey(value:string){const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,char=>char.charCodeAt(0));}
export function ReviewPushSettings(){
 const supported=typeof Notification!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window;
 const [config,setConfig]=useState<{configured:boolean;publicKey:string|null}|null>(null);
 const [subscription,setSubscription]=useState<PushSubscription|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
 useEffect(()=>{if(!supported)return;let alive=true;
  void Promise.all([api.pushConfig(),navigator.serviceWorker.getRegistration('/')]).then(async([data,registration])=>{const existing=await registration?.pushManager.getSubscription();if(alive){setConfig(data);setSubscription(Notification.permission==='granted'?existing||null:null);}}).catch(()=>{if(alive)setError('No pudimos cargar los avisos. Volvé a abrir el panel.');});
  return()=>{alive=false;};
 },[supported]);
 const enable=async()=>{
  if(!config?.publicKey)return;setBusy(true);setError('');setMessage('');let created:PushSubscription|null=null;
  try{
   const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Las notificaciones no están permitidas. Habilitalas en los permisos del sitio para recibir los avisos.');
   await navigator.serviceWorker.register('/push-sw.js',{scope:'/'});const registration=await navigator.serviceWorker.ready;
   const previous=await registration.pushManager.getSubscription();if(previous)await previous.unsubscribe();
   created=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:serverKey(config.publicKey)});
   await api.pushSubscribe(created.toJSON());setSubscription(created);setMessage('Avisos activados en este dispositivo.');
  }catch(error){if(created)await created.unsubscribe().catch(()=>{});setError((error as Error).message||'No se pudieron activar los avisos. Revisá los permisos del navegador.');}
  finally{setBusy(false);}
 };
 const disable=async()=>{if(!subscription)return;setBusy(true);setError('');setMessage('');try{await api.pushUnsubscribe(subscription.endpoint);await subscription.unsubscribe();setSubscription(null);setMessage('Avisos desactivados en este dispositivo.');}catch{setError('No pudimos desactivar los avisos. Volvé a intentar.');}finally{setBusy(false);}};
 const test=async()=>{if(!subscription)return;setBusy(true);setError('');setMessage('');try{await api.pushTest(subscription.endpoint);setMessage('Aviso enviado. Comprobá las notificaciones de este dispositivo.');}catch(error){setError((error as Error).message);}finally{setBusy(false);}};
 return <section className="review-push-settings" aria-label="Avisos de revisión">
  <div><Typography component="h2" variant="h6">Avisos de revisión</Typography><Typography>Recibí una notificación cuando una publicación espere aprobación. Al tocarla, abrirás su revisión.</Typography></div>
  {!supported?<Alert severity="info">Este navegador no ofrece notificaciones push. En iPhone, agregá la web a la pantalla de inicio y abrila desde allí.</Alert>:<>
   {config&&!config.configured?<Alert severity="info">Los avisos todavía no están configurados en el servidor.</Alert>:<div className="review-push-actions">{subscription?<><Typography color="success.main">Activadas en este dispositivo</Typography><Button variant="outlined" disabled={busy} onClick={()=>void test()}>Enviar aviso de prueba</Button><Button disabled={busy} onClick={()=>void disable()}>Desactivar avisos</Button></>:<Button variant="contained" startIcon={<NotificationsActiveOutlined/>} disabled={busy||!config?.configured} onClick={()=>void enable()}>{busy?'Activando…':'Activar notificaciones'}</Button>}</div>}
  </>}
  {error&&<Alert severity="error">{error}</Alert>}{message&&<Alert severity="success" role="status">{message}</Alert>}
 </section>;
}
