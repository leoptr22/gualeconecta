import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const user = { id:'test-user', name:'Cuenta de prueba', email:'test@example.com' };
const session = { user:null, clientId:'test-client', configured:true, csrfToken:'fresh-nonce' };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('continues from Google authentication directly to the requested publication form', async () => {
  vi.spyOn(api, 'list').mockResolvedValue({ items:[] });
  vi.spyOn(api, 'session').mockResolvedValue(session);
  vi.spyOn(api, 'login').mockResolvedValue({ user });
  vi.stubGlobal('google', { accounts:{ id:{
    initialize:vi.fn(options => {
      vi.stubGlobal('testGoogleCallback', options.callback);
    }),
    renderButton:vi.fn((element:HTMLElement) => {
      const button = document.createElement('button');
      button.textContent = 'Continuar con Google';
      button.onclick = () => (window as unknown as { testGoogleCallback:(response:{credential:string})=>void }).testGoogleCallback({ credential:'test-only-token' });
      element.append(button);
    })
  } } });
  render(<App />);
  await screen.findByText('La próxima propuesta puede ser la tuya');
  fireEvent.click(screen.getByRole('button', { name:'Publicar gratis' }));
  fireEvent.click(await screen.findByRole('button', { name:'Continuar con Google' }));
  expect(await screen.findByLabelText(/Nombre del comercio/)).toBeInTheDocument();
  expect(api.login).toHaveBeenCalledWith('test-only-token', 'fresh-nonce');
});

it('rechecks an expired session before permitting the publication form', async () => {
  vi.spyOn(api, 'list').mockResolvedValue({ items:[] });
  vi.spyOn(api, 'session').mockResolvedValueOnce({ ...session, user }).mockResolvedValue({ ...session, clientId:null, configured:false });
  render(<App />);
  await screen.findByRole('button', { name:'Salir' });
  fireEvent.click(screen.getByRole('button', { name:'Publicar gratis' }));
  expect(await screen.findByText(/todavía no está habilitado/)).toBeInTheDocument();
  expect(screen.queryByLabelText(/Nombre del comercio/)).not.toBeInTheDocument();
});

it('renews CSRF before logout and preserves the account when logout fails', async () => {
  vi.spyOn(api, 'session').mockResolvedValueOnce({ ...session, user, csrfToken:'old-nonce' }).mockResolvedValue({ ...session, user });
  const logout = vi.spyOn(api, 'logout').mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValue({ ok:true });
  const { result } = renderHook(useAuth);
  await waitFor(() => expect(result.current.user).toEqual(user));
  await act(() => result.current.logout());
  expect(logout).toHaveBeenCalledWith('fresh-nonce');
  expect(result.current.user).toEqual(user);
  expect(result.current.actionError).toBe('Sin conexión');
  await act(() => result.current.logout());
  expect(result.current.user).toBeNull();
  expect(result.current.actionError).toBe('');
});
