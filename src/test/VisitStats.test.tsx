import { afterEach,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { VisitStats } from '../components/VisitStats';
import { api } from '../services/api';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('shows real metrics and refreshes them',async()=>{
 const get=vi.spyOn(api,'visitStats').mockResolvedValueOnce({total:25,today:4,startedAt:'2026-10-04T12:00:00Z'}).mockResolvedValueOnce({total:26,today:5,startedAt:'2026-10-04T12:00:00Z'});
 render(<VisitStats/>);expect(await screen.findByLabelText('Visitas totales: 25')).toBeInTheDocument();expect(screen.getByLabelText('Visitas de hoy: 4')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Actualizar visitas'}));expect(await screen.findByLabelText('Visitas totales: 26')).toBeInTheDocument();expect(get).toHaveBeenCalledTimes(2);
});
it('shows a retryable failure without inventing counts',async()=>{
 vi.spyOn(api,'visitStats').mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({total:0,today:0,startedAt:'2026-10-04T12:00:00Z'});
 render(<VisitStats/>);expect(await screen.findByText('No pudimos cargar las visitas.')).toBeInTheDocument();expect(screen.queryByLabelText('Visitas totales: 0')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Actualizar visitas'}));expect(await screen.findByLabelText('Visitas totales: 0')).toBeInTheDocument();
});
