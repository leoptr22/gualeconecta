import { afterEach,beforeEach,describe,it,expect,vi } from 'vitest';
import { useState } from 'react';
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import { MediaPicker,emptyMedia } from '../components/MediaPicker';
function Harness(){const [value,setValue]=useState(emptyMedia);return <MediaPicker value={value} onChange={setValue} disabled={false} onChecking={()=>{}}/>;}
beforeEach(()=>{vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn().mockImplementation(()=>`blob:${Math.random()}`),revokeObjectURL:vi.fn()}));});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('Seleccionar adjuntos',()=>{
 it('agrega hasta tres fotos, rechaza la cuarta y permite quitar una',async()=>{render(<Harness/>);const input=screen.getByLabelText('Seleccionar fotos');fireEvent.change(input,{target:{files:[new File(['a'],'uno.png',{type:'image/png'}),new File(['b'],'dos.png',{type:'image/png'})]}});expect(await screen.findByRole('button',{name:'Quitar foto 2'})).toBeInTheDocument();fireEvent.change(input,{target:{files:[new File(['c'],'tres.png',{type:'image/png'}),new File(['d'],'cuatro.png',{type:'image/png'})]}});expect(screen.getByText(/Podés agregar hasta 3 fotos/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Quitar foto 3'})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Quitar foto 1'}));expect(screen.queryByRole('button',{name:'Quitar foto 2'})).not.toBeInTheDocument();});
 it('rechaza archivos con formato no permitido',()=>{render(<Harness/>);fireEvent.change(screen.getByLabelText('Seleccionar fotos'),{target:{files:[new File(['svg'],'imagen.svg',{type:'image/svg+xml'})]}});expect(screen.getByText(/Usá fotos JPG/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Quitar foto 1'})).not.toBeInTheDocument();});
});
