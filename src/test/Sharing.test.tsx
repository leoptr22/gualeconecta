import { afterEach,it,expect,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { SharePublication } from '../components/SharePublication';
import { publicationShareData } from '../services/sharing';
import { usePublicationNavigation } from '../hooks/usePublicationNavigation';
import type { Publication } from '../types';
const item:Publication={id:'test/only &ñ',title:'Beneficio de prueba',business:'Comercio aislado',description:'Descripción de prueba',category:'Compras',kind:'Descuento',town:'Gualeguaychú',address:'Prueba',endsAt:'2099-12-31'};
afterEach(()=>{cleanup();vi.restoreAllMocks();window.history.replaceState(null,'','/');});
const navigatorMethod=(name:string,value:unknown)=>{const original=Object.getOwnPropertyDescriptor(navigator,name);Object.defineProperty(navigator,name,{configurable:true,value});return()=>{if(original)Object.defineProperty(navigator,name,original);else delete (navigator as unknown as Record<string,unknown>)[name];};};
it('copies a stable direct link and builds an encoded WhatsApp message',async()=>{
 const restoreShare=navigatorMethod('share',undefined);const writeText=vi.fn().mockResolvedValue(undefined);const restoreClipboard=navigatorMethod('clipboard',{writeText});
 try{
  render(<SharePublication item={item}/>);fireEvent.click(screen.getByRole('button',{name:'Compartir '+item.title}));
  const data=publicationShareData(item);expect(new URL(data.url).searchParams.get('publicacion')).toBe(item.id);
  fireEvent.click(screen.getByRole('button',{name:'Copiar enlace'}));expect(await screen.findByText('Enlace copiado.')).toBeInTheDocument();expect(writeText).toHaveBeenCalledWith(data.url);
  const whatsapp=new URL(screen.getByRole('link',{name:'Compartir por WhatsApp'}).getAttribute('href')!);expect(whatsapp.searchParams.get('text')).toBe(data.text+'\n'+data.url);
 }finally{restoreShare();restoreClipboard();}
});
it('uses native sharing and treats cancellation as a normal action',async()=>{
 const native=vi.fn().mockRejectedValue(new DOMException('Cancelado','AbortError'));const restore=navigatorMethod('share',native);
 try{render(<SharePublication item={item}/>);fireEvent.click(screen.getByRole('button',{name:'Compartir '+item.title}));fireEvent.click(screen.getByRole('button',{name:'Otras aplicaciones'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Otras aplicaciones'})).toBeEnabled());expect(native).toHaveBeenCalledWith(publicationShareData(item));expect(screen.getByRole('dialog')).toBeInTheDocument();expect(screen.queryByRole('status')).not.toBeInTheDocument();}finally{restore();}
});
it('offers a selectable link if clipboard access fails',async()=>{
 const restoreShare=navigatorMethod('share',undefined);const restoreClipboard=navigatorMethod('clipboard',{writeText:vi.fn().mockRejectedValue(new Error('No permiso'))});
 try{render(<SharePublication item={item}/>);fireEvent.click(screen.getByRole('button',{name:'Compartir '+item.title}));fireEvent.click(screen.getByRole('button',{name:'Copiar enlace'}));expect(await screen.findByText('Seleccioná el enlace y copialo manualmente.')).toBeInTheDocument();expect(screen.getByRole('textbox',{name:'Enlace a la publicación'})).toHaveValue(publicationShareData(item).url);}finally{restoreShare();restoreClipboard();}
});
function Navigation({items,loading=false}:{items:Publication[];loading?:boolean}){const navigation=usePublicationNavigation(items,loading,'');return <><span>{navigation.selected?.title||'Sin detalle'}</span>{navigation.unavailable&&<span>Vencida</span>}<button onClick={()=>navigation.open(item)}>Abrir</button><button onClick={navigation.close}>Cerrar</button></>;}
it('opens direct links after loading and handles missing or expired publications',()=>{
 window.history.replaceState(null,'',publicationShareData(item).url);const view=render(<Navigation items={[]} loading/>);expect(screen.queryByText('Vencida')).not.toBeInTheDocument();
 view.rerender(<Navigation items={[item]}/>);expect(screen.getByText(item.title)).toBeInTheDocument();
 view.rerender(<Navigation items={[]}/>);expect(screen.getByText('Vencida')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Cerrar'}));expect(new URL(window.location.href).searchParams.has('publicacion')).toBe(false);
});
it('updates the URL when opening and responds to browser history',()=>{
 render(<Navigation items={[item]}/>);fireEvent.click(screen.getByRole('button',{name:'Abrir'}));expect(new URL(window.location.href).searchParams.get('publicacion')).toBe(item.id);
 window.history.replaceState(null,'','/');fireEvent.popState(window);expect(screen.getByText('Sin detalle')).toBeInTheDocument();
});
