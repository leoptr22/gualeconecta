# Activar Google en Guale Conecta

El acceso está implementado y el cliente OAuth aportado por el usuario está configurado en `.env`. Se verificó que el servidor declara Google habilitado y la web muestra el botón oficial. Falta completar una entrada real con la cuenta del usuario. No hace falta enviar ni utilizar un secreto de cliente para este flujo.

1. Entrá a [Google Auth Platform](https://console.cloud.google.com/auth/overview) con tu cuenta y creá o seleccioná tu proyecto.
2. Completá **Branding** con Guale Conecta, email de soporte y contacto. En **Audience**, elegí público externo para una app abierta a la ciudad. Si el proyecto queda en pruebas, agregá las cuentas que usarán el piloto a sus usuarios de prueba.
3. En **Clients**, creá un cliente de tipo **Web application**. Registrá en **Authorized JavaScript origins** el origen exacto con el que abrirás la app. Google documenta `http://localhost` y `http://localhost:5173` para desarrollo. Para usar la vista actual, agregá también `http://127.0.0.1:5173` si la consola lo admite; en caso contrario abrí la web con localhost y cambiá `APP_ORIGIN` al mismo host.
4. Copiá el **Client ID**, terminado en `.apps.googleusercontent.com`, a `GOOGLE_CLIENT_ID` en `.env`. `APP_ORIGIN` debe coincidir exactamente con el host y puerto del navegador, sin barra final. Este flujo usa callback JavaScript, por lo que no necesita un URI de redirección propio.
5. Reiniciá `npm run dev`. En la web, **Ingresar** mostrará el botón oficial de Google. Completá el acceso con tu cuenta; si venías de **Publicar**, el formulario se abre después de verificarla.
6. Comprobá que aparece tu nombre, que recargar conserva la sesión y que **Salir** cierra el acceso. No hace falta crear anuncios de prueba en los datos reales.

Google puede solicitar datos adicionales de marca, dominio o políticas para la apertura pública; seguir las indicaciones de tu proyecto. En producción usar el dominio HTTPS en ambas configuraciones y `NODE_ENV=production`. Las sesiones requieren conservar `data/accounts.sqlite` junto con el resto del directorio persistente.

Fuentes: [configuración oficial](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) y [verificación de ID tokens](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token). La integración no pide acceso a Google Drive ni conecta Google Sheets; esas funciones tienen configuración independiente.

