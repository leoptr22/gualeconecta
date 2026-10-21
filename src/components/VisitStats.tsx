import { useEffect,useState } from 'react';
import { Alert,Button,Typography } from '@mui/material';
import { api,type VisitSummary } from '../services/api';

export function VisitStats() {
 const [stats,setStats]=useState<VisitSummary|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const load=async()=>{setLoading(true);setError('');try{setStats(await api.visitStats());}catch{setError('No pudimos cargar las visitas.');}finally{setLoading(false);}};
 useEffect(()=>{void load();},[]);
 return <section className="visit-stats" aria-label="Estadísticas de visitas">
  <div className="visit-stats-heading"><Typography component="h2" variant="h6">Así se mueve Guale.</Typography><Button size="small" disabled={loading} onClick={()=>void load()}>Actualizar visitas</Button></div>
  {error&&<Alert severity="error">{error}</Alert>}
  <div className="visit-stats-grid">{([['Visitas totales',stats?.total],['Visitas de hoy',stats?.today]] as const).map(([label,value])=><div className="visit-stat" key={label}><Typography>{label}</Typography><Typography component="p" className="visit-number" aria-label={label+': '+(value??'cargando')}>{value===undefined?'—':value.toLocaleString('es-AR')}</Typography></div>)}</div>
  <Typography variant="body2" color="text.secondary">Una visita por sesión, con 30 minutos de inactividad para iniciar otra. Las sesiones de administración se excluyen. Hoy se calcula con horario de Argentina.{stats&&` Conteo desde el ${new Date(stats.startedAt).toLocaleDateString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}.`}</Typography>
 </section>;
}
