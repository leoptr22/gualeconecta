import { afterEach,it,expect,vi } from 'vitest';
import { cleanup,render,screen,fireEvent,waitFor } from '@testing-library/react';
import { ReviewPushSettings } from '../components/ReviewPushSettings';
import { api } from '../services/api';
const original=Object.getOwnPropertyDescriptor(navigator,'serviceWorker');
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();if(original)Object.defineProperty(navigator,'serviceWorker',original);else delete (navigator as unknown as Record<string,unknown>).serviceWorker;});
function setup(permission='granted'){
 const requestPermission=vi.fn().mockResolvedValue(permission);vi.stubGlobal('Notification',{permission:'default',requestPermission});vi.stubGlobal('PushManager',function(){});
 const sub={endpoint:'https://fcm.googleapis.com/test-only',toJSON:()=>({endpoint:'https://fcm.googleapis.com/test-only'}),unsubscribe:vi.fn().mockResolvedValue(true)};
 const registration={pushManager:{getSubscription:vi.fn().mockResolvedValue(null),subscribe:vi.fn().mockResolvedValue(sub)}};
 const register=vi.fn().mockResolvedValue(registration);Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{register,ready:Promise.resolve(registration),getRegistration:vi.fn().mockResolvedValue(undefined)}});
 vi.spyOn(api,'pushConfig').mockResolvedValue({configured:true,publicKey:'B'+'A'.repeat(86)});const subscribe=vi.spyOn(api,'pushSubscribe').mockResolvedValue({subscribed:true});
 return {requestPermission,register,sub,subscribe};
}
it('requests permission only after an explicit click and saves the device subscription',async()=>{
 const context=setup();render(<ReviewPushSettings/>);const button=screen.getByRole('button',{name:'Activar notificaciones'});await waitFor(()=>expect(button).toBeEnabled());expect(context.requestPermission).not.toHaveBeenCalled();fireEvent.click(button);
 expect(await screen.findByText('Activadas en este dispositivo')).toBeInTheDocument();expect(context.register).toHaveBeenCalledWith('/push-sw.js',{scope:'/'});expect(context.subscribe).toHaveBeenCalledWith(context.sub.toJSON());
 vi.spyOn(api,'pushTest').mockResolvedValue({sent:true});fireEvent.click(screen.getByRole('button',{name:'Enviar aviso de prueba'}));expect(await screen.findByText('Aviso enviado. Comprobá las notificaciones de este dispositivo.')).toBeInTheDocument();
});
it('handles denied permission without registering a worker or device',async()=>{
 const context=setup('denied');render(<ReviewPushSettings/>);const button=screen.getByRole('button',{name:'Activar notificaciones'});await waitFor(()=>expect(button).toBeEnabled());fireEvent.click(button);expect(await screen.findByText(/Las notificaciones no están permitidas/)).toBeInTheDocument();expect(context.register).not.toHaveBeenCalled();expect(context.subscribe).not.toHaveBeenCalled();
});
