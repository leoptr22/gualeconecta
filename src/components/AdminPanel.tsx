import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { api, type AdminPublication } from '../services/api';
import { MediaGallery } from './MediaGallery';
import { VisitStats } from './VisitStats';
import { publicationDeadline } from '../publication-time';


export function AdminPanel({ onApproved }: { onApproved:()=>void }) {
  const [items,setItems] = useState<AdminPublication[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [filter,setFilter] = useState<'pending'|'approved'>('pending');
  const [query,setQuery] = useState('');
  const [selected,setSelected] = useState<AdminPublication|null>(null);
  const [saving,setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);setError('');
    try { setItems((await api.adminList()).items); }
    catch(error) { setError((error as Error).message); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{void load();},[load]);
  const visible = useMemo(()=>items.filter(item=>item.status===filter&&`${item.title} ${item.business}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))),[items,filter,query]);
  const approve = async () => {
    if(!selected||saving)return;
    setSaving(true);setError('');setNotice('');
    try {
      const approved=await api.approve(selected.id);
      setItems(current=>current.map(item=>item.id===selected.id?{...item,...approved}:item));
      setNotice(`Publicación aprobada: ${selected.title}`);setSelected(null);onApproved();
    } catch(error) { setError((error as Error).message); }
    finally { setSaving(false); }
  };
  return <section className="admin-panel" aria-labelledby="admin-panel-title">
    <VisitStats/>
    <Alert severity="info" sx={{mb:3}}>Cada publicación gratuita dura 24 horas desde su aprobación. Al vencer, se elimina junto con sus fotos y video. El tiempo de revisión no consume esas 24 horas.</Alert>
    <div className="admin-heading"><div><Typography component="h1" id="admin-panel-title">Revisá antes de publicar.</Typography><Typography color="text.secondary">Comprobá los datos y los adjuntos. Solo las publicaciones aprobadas y vigentes aparecen en la ciudad.</Typography></div><Button variant="outlined" onClick={()=>void load()} disabled={loading||saving}>Actualizar</Button></div>
    <div className="admin-toolbar"><div className="admin-filters">{(['pending','approved'] as const).map(status=><Button key={status} variant={filter===status?'contained':'outlined'} aria-pressed={filter===status} onClick={()=>{setFilter(status);setNotice('');}}>{status==='pending'?'Pendientes':'Aprobadas'} · {items.filter(item=>item.status===status).length}</Button>)}</div><TextField label="Buscar por título o comercio" value={query} onChange={event=>setQuery(event.target.value)} size="small"/></div>
    {notice&&<Alert severity="success" onClose={()=>setNotice('')}>{notice}</Alert>}
    {error&&<Alert severity="error" action={<Button onClick={()=>void load()}>Reintentar</Button>}>{error}</Alert>}
    {loading?<div className="admin-loading"><CircularProgress aria-label="Cargando revisión"/></div>:!error&&visible.length===0?<div className="empty-state"><Typography variant="h6">{query?'No encontramos publicaciones':filter==='pending'?'No hay publicaciones pendientes':'Todavía no hay publicaciones aprobadas'}</Typography><Typography color="text.secondary">{query?'Probá con otro título o comercio.':'Los envíos reales aparecerán acá.'}</Typography></div>:<div className="admin-list">{visible.map(item=><article key={item.id} className="admin-row"><div><Chip label={item.status==='pending'?'Pendiente':'Aprobada'} size="small"/><Typography component="h2" variant="h6">{item.title}</Typography><Typography>{item.business} · {item.town}</Typography><Typography color="text.secondary" variant="body2">{item.kind} · {publicationDeadline(item)} · {item.media?.length||0} {item.media?.length===1?'adjunto':'adjuntos'}</Typography></div><Button variant="outlined" onClick={()=>{setSelected(item);setError('');}}>Revisar publicación</Button></article>)}</div>}
    <Dialog open={!!selected} onClose={()=>{if(!saving)setSelected(null);}} fullWidth maxWidth="sm" aria-labelledby="review-title">
      {selected&&<><DialogTitle id="review-title">{selected.title}</DialogTitle><DialogContent className="admin-review"><Chip label={selected.status==='pending'?'Pendiente de revisión':'Publicación aprobada'}/><Typography variant="h6">{selected.business}</Typography><MediaGallery media={selected.media} title={selected.title}/><Typography sx={{whiteSpace:'pre-wrap'}}>{selected.description}</Typography><div className="review-facts"><Typography>{selected.address} · {selected.town}</Typography><Typography>{publicationDeadline(selected)}</Typography><Typography>Contacto: {selected.contact||'Sin contacto'}</Typography><Typography variant="body2" color="text.secondary">{selected.category} · {selected.kind}</Typography></div>{selected.endsAt<new Date().toLocaleDateString('en-CA',{timeZone:'America/Argentina/Buenos_Aires'})&&<Alert severity="warning">La vigencia terminó. Revisá la fecha de la oferta antes de aprobar. La publicación tendrá 24 horas de exposición.</Alert>}{error&&<Alert severity="error">{error}</Alert>}</DialogContent><DialogActions><Button disabled={saving} onClick={()=>setSelected(null)}>Cerrar</Button>{selected.status==='pending'&&<Button variant="contained" disabled={saving} onClick={()=>void approve()}>{saving?'Aprobando…':'Aprobar publicación'}</Button>}</DialogActions></>}
    </Dialog>
  </section>;
}



