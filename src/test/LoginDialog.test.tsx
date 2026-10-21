import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginDialog } from '../components/LoginDialog';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('renders the official Google button after session loading and can reopen after success', async () => {
  let callback: (response: { credential: string }) => void = () => {};
  const initialize = vi.fn(options => { callback = options.callback; });
  const renderButton = vi.fn((element: HTMLElement) => {
    const button = document.createElement('button');
    button.textContent = 'Continuar con Google';
    button.onclick = () => callback({ credential: 'test-only-token' });
    element.append(button);
  });
  vi.stubGlobal('google', { accounts: { id: { initialize, renderButton } } });
  const onClose = vi.fn();
  const onLogin = vi.fn().mockResolvedValue(undefined);
  const props = { open:true, onClose, onLogin, clientId:'test-client', csrfToken:'test-nonce', loading:true, error:'', onRetry:vi.fn() };
  const { rerender } = render(<LoginDialog {...props} />);
  expect(renderButton).not.toHaveBeenCalled();
  rerender(<LoginDialog {...props} loading={false} />);
  fireEvent.click(await screen.findByRole('button', { name:'Continuar con Google' }));
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(onLogin).toHaveBeenCalledWith('test-only-token');
  expect(initialize.mock.calls[0][0].nonce).toBe('test-nonce');
  rerender(<LoginDialog {...props} open={false} loading={false} />);
  rerender(<LoginDialog {...props} loading={false} />);
  await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('button', { name:'Cerrar' })).toBeEnabled();
});

it('does not load Google or offer a simulated login when client configuration is missing', () => {
  render(<LoginDialog open onClose={vi.fn()} onLogin={vi.fn()} clientId={null} csrfToken="" loading={false} error="" onRetry={vi.fn()} />);
  expect(screen.getByText(/todavía no está habilitado/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name:'Continuar con Google' })).not.toBeInTheDocument();
});
