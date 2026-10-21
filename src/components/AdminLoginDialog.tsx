import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';

export function AdminLoginDialog({ open, onClose, onLogin }: { open:boolean; onClose:()=>void; onLogin:(email:string,password:string)=>Promise<void> }) {
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [error,setError] = useState('');
  const [working,setWorking] = useState(false);
  const close = () => { if(!working){ setPassword(''); setError(''); onClose(); } };
  const submit = async (event:React.FormEvent) => {
    event.preventDefault(); if(working)return;
    setWorking(true); setError('');
    try { await onLogin(email,password); setPassword(''); onClose(); }
    catch(error) { setError((error as Error).message); }
    finally { setWorking(false); }
  };
  return <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby="admin-login-title">
    <form onSubmit={submit}>
      <DialogTitle id="admin-login-title">Administrar Guale Conecta</DialogTitle>
      <DialogContent className="admin-login-fields">
        <Typography color="text.secondary">Ingresá con tu cuenta de administración para revisar las publicaciones.</Typography>
        <TextField label="Email de administración" type="email" autoComplete="username" required fullWidth value={email} onChange={event=>setEmail(event.target.value)} disabled={working}/>
        <TextField label="Contraseña" type="password" autoComplete="current-password" required fullWidth value={password} onChange={event=>setPassword(event.target.value)} disabled={working}/>
        {error&&<Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions><Button onClick={close} disabled={working}>Cancelar</Button><Button type="submit" variant="contained" disabled={working}>{working?'Verificando…':'Entrar al panel'}</Button></DialogActions>
    </form>
  </Dialog>;
}
