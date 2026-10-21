import { useCallback,useEffect,useState } from 'react';
import { api } from '../services/api';
export type AuthUser={id:string;email:string;name:string;role?:'admin'|'publisher'};
export function useAuth(){
 const [user,setUser]=useState<AuthUser|null>(null);const [clientId,setClientId]=useState<string|null>(null);const [adminLoginEnabled,setAdminLoginEnabled]=useState(false);const [csrfToken,setCsrfToken]=useState('');const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [actionError,setActionError]=useState('');const [signingOut,setSigningOut]=useState(false);
 const refresh=useCallback(async()=>{setLoading(true);setError('');try{const session=await api.session();setUser(session.user||null);setClientId(session.clientId||null);setAdminLoginEnabled(Boolean(session.adminLoginEnabled));setCsrfToken(session.csrfToken||'');return session;}catch(error){setError((error as Error).message);return null;}finally{setLoading(false);}},[]);
 useEffect(()=>{void refresh();},[refresh]);
 const login=useCallback(async(credential:string)=>{const data=await api.login(credential,csrfToken);setUser(data.user);},[csrfToken]);
 const loginAdmin=useCallback(async(email:string,password:string)=>{const session=await api.session();const data=await api.loginAdmin(email,password,session.csrfToken);setCsrfToken(session.csrfToken);setUser(data.user);},[]);
 async function logout(){if(signingOut)return;setSigningOut(true);setActionError('');try{const session=await api.session();await api.logout(session.csrfToken);setCsrfToken(session.csrfToken);setUser(null);}catch(error){setActionError((error as Error).message);}finally{setSigningOut(false);}}
 return {user,clientId,csrfToken,loading,error,refresh,login,loginAdmin,adminLoginEnabled,logout,signingOut,actionError,clearActionError:()=>setActionError('')};
}
