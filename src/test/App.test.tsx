import { afterEach,describe,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import App from '../App';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const items=[{id:'1',title:'Oferta de café',business:'Café Test',description:'Una oferta vigente',category:'Gastronomía',kind:'Promoción',town:'Gualeguaychú',address:'Centro',endsAt:'2099-12-31'},{id:'2',title:'Taller de música',business:'Escuela Test',description:'Un taller abierto',category:'Cultura',kind:'Evento',town:'Pueblo Belgrano',address:'Centro',endsAt:'2099-12-31'}];
describe('Descubrimiento',()=>{
it('un catálogo vacío permite cargar la primera publicación sin mostrar ejemplos',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({items:[],user:{id:'test-user',name:'Cuenta de prueba',email:'test@example.com'},csrfToken:'test-csrf'})}));render(<App/>);await screen.findByText('La próxima propuesta puede ser la tuya');expect(screen.queryByText('Oferta de café')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Publicar gratis'}));expect(await screen.findByRole('dialog')).toBeInTheDocument();expect(screen.getByLabelText(/Nombre del comercio/)).toBeInTheDocument();});
it('busca por comercio y filtra la agenda',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({items,user:{id:'test-user',name:'Cuenta de prueba',email:'test@example.com'},csrfToken:'test-csrf'})}));render(<App/>);await screen.findByText('Oferta de café');fireEvent.change(screen.getByRole('textbox',{name:'Buscar publicaciones'}),{target:{value:'Escuela'}});expect(screen.queryByText('Oferta de café')).not.toBeInTheDocument();expect(screen.getByText('Taller de música')).toBeInTheDocument();fireEvent.change(screen.getByRole('textbox',{name:'Buscar publicaciones'}),{target:{value:''}});fireEvent.click(screen.getByRole('button',{name:'Agenda'}));expect(screen.queryByText('Oferta de café')).not.toBeInTheDocument();});
it('muestra errores recuperables',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Sin conexión')));render(<App/>);expect(await screen.findByText('Sin conexión')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Reintentar'})).toBeInTheDocument();});
});


