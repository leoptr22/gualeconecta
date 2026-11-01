import { afterEach,beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminPanel } from '../components/AdminPanel';
import { api, type AdminPublication } from '../services/api';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
beforeEach(()=>{vi.spyOn(api,'visitStats').mockResolvedValue({total:12,today:3,startedAt:'2026-10-04T12:00:00Z'});});
const item:AdminPublication={id:'test-only',title:'Propuesta aislada',business:'Cuenta de prueba',description:'Texto completo para revisión.',category:'Compras',kind:'Promoción',town:'Gualeguaychú',address:'Dirección de prueba',contact:'test@example.com',endsAt:'2099-12-31',createdAt:'2026-01-01',status:'pending',media:[]};
it('opens the private review from a notification link and consumes the link once',async()=>{
 window.history.replaceState(null,'','/?adminReview='+item.id);vi.spyOn(api,'adminList').mockResolvedValue({items:[item]});
 try{render(<AdminPanel onApproved={()=>{}}/>);expect(await screen.findByText(item.description)).toBeInTheDocument();expect(new URL(window.location.href).searchParams.has('adminReview')).toBe(false);expect(screen.getByRole('button',{name:'Aprobar publicación'})).toBeInTheDocument();}finally{window.history.replaceState(null,'','/');}
});
it('reviews details before approval and updates pending and approved lists',async()=>{
 vi.spyOn(api,'adminList').mockResolvedValue({items:[item]});const approve=vi.spyOn(api,'approve').mockResolvedValue({id:item.id,status:'approved'});const onApproved=vi.fn();
 render(<AdminPanel onApproved={onApproved}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Revisar publicación'}));
 expect(screen.getByText(item.description)).toBeInTheDocument();expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Aprobar publicación'}));
 await waitFor(()=>expect(onApproved).toHaveBeenCalledOnce());expect(approve).toHaveBeenCalledWith(item.id);
 expect(await screen.findByText('No hay publicaciones pendientes')).toBeInTheDocument();
 fireEvent.click(await screen.findByRole('button',{name:/Aprobadas · 1/}));expect(screen.getByRole('button',{name:'Revisar publicación'})).toBeInTheDocument();
});
it('keeps a failed approval pending and allows another attempt',async()=>{
 vi.spyOn(api,'adminList').mockResolvedValue({items:[item]});vi.spyOn(api,'approve').mockRejectedValue(new Error('Sin conexión'));const onApproved=vi.fn();
 render(<AdminPanel onApproved={onApproved}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Revisar publicación'}));fireEvent.click(screen.getByRole('button',{name:'Aprobar publicación'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Aprobar publicación'})).toBeEnabled());
 expect(screen.getAllByText('Sin conexión').length).toBeGreaterThan(0);expect(onApproved).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Cerrar'}));expect(await screen.findByRole('button',{name:/Pendientes · 1/})).toBeInTheDocument();
});
