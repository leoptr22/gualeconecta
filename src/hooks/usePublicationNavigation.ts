import { useCallback,useEffect,useState } from 'react';
import type { Publication } from '../types';

const readId=()=>new URL(window.location.href).searchParams.get('publicacion');
export function usePublicationNavigation(items:Publication[],loading:boolean,error:string) {
 const [id,setId]=useState(readId);
 useEffect(()=>{const handle=()=>setId(readId());window.addEventListener('popstate',handle);return()=>window.removeEventListener('popstate',handle);},[]);
 const open=useCallback((item:Publication)=>{
  const url=new URL(window.location.href);url.searchParams.set('publicacion',item.id);
  if(readId()!==item.id)window.history.pushState(null,'',url);
  setId(item.id);
 },[]);
 const close=useCallback(()=>{
  const url=new URL(window.location.href);url.searchParams.delete('publicacion');
  window.history.replaceState(null,'',url);setId(null);
 },[]);
 const selected=items.find(item=>item.id===id)||null;
 return {selected,open,close,unavailable:!!id&&!selected&&!loading&&!error};
}
