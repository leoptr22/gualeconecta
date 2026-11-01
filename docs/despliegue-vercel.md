# Despliegue en Vercel

Repositorio: https://github.com/leoptr22/gualeconecta. Rama actual: `master`.

## Estado preparado

Vercel compila el frontend Vite con `npm ci` y `npm run build`, y publica `dist`. `vercel.json` conserva las rutas de la SPA. Hasta disponer del backend público, `/api` responde con un error 503 explícito. Es una vista previa de la interfaz: no habilita cuentas, publicaciones ni adjuntos. No se debe presentar como la aplicación completa.

`.vercelignore` excluye configuración privada, datos locales y archivos que no necesita el frontend. No cargar secretos con prefijo `VITE_`. La integración con GitHub puede desplegar automáticamente cada push a la rama de producción configurada en Vercel.

## Backend persistente

El `Dockerfile` prepara el servidor Node 22. El proveedor debe ejecutar un servicio continuo con un volumen persistente montado en `/app/data`, accesible para el usuario `node`. El servidor escucha en `HOST=0.0.0.0` y en el `PORT` provisto por el hosting. Un volumen temporal pierde sesiones, estadísticas y medios; un proceso sin ejecución continua no realiza la limpieza cada minuto.

Configurar estas variables en el backend a partir de la configuración local, sin publicarlas en Git: `STORAGE=sheets`, `SHEETS_WEBHOOK_URL`, `SHEETS_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `GOOGLE_CLIENT_ID`, `APP_ORIGIN=https://DOMINIO-FRONTEND` y `NODE_ENV=production`. Conservar las rutas predeterminadas bajo `/app/data`; migrar por un canal privado los medios y bases locales que se quieran mantener.

Con la URL HTTPS del backend, reemplazar la primera regla de `vercel.json` por `{ "source": "/api/:path*", "destination": "https://BACKEND/api/:path*" }` y volver a desplegar. Mantener la regla de API antes de la SPA. El proxy mantiene cookies y peticiones del navegador bajo el dominio del frontend. No apuntar la regla a localhost ni a la URL de Apps Script: Apps Script almacena publicaciones, pero no reemplaza la API de autenticación y adjuntos.

Registrar el dominio exacto del frontend en los orígenes JavaScript autorizados del cliente Google. Probar sesión, publicación con medios, aprobación, visitas, enlaces compartidos y vencimiento antes de anunciar el lanzamiento. No copiar las bases o secretos al repositorio ni a los archivos públicos de Vercel.
