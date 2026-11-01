# Despliegue en Vercel

## Backend integrado

El origen principal es `https://gualeconecta.vercel.app`. El alias anterior `gualeconecta-leoptr22s-projects.vercel.app` redirige allí para conservar el origen configurado de las cookies, CSRF y Google. Al cambiar de dominio, actualizar tanto `APP_ORIGIN` como esa redirección y los orígenes autorizados de Google.

La versión actual ejecuta Express en `api/index.js`, junto al frontend Vite. Las publicaciones siguen en Sheets. `STATE_STORAGE=postgres` guarda usuarios, hashes de sesiones, visitas y límites de solicitudes en Neon; `MEDIA_STORAGE=blob` guarda los adjuntos en el almacén Blob del proyecto. En producción no se utilizan archivos SQLite ni el disco local como almacenamiento permanente. El directorio temporal se usa solo durante la validación de imágenes y video.

La carga del navegador va directamente a Blob, con autorización de sesión y CSRF. El servidor permite rutas temporales asociadas al propietario, verifica tamaño y contenido real, convierte las fotos y comprueba el video con FFprobe antes de generar los enlaces definitivos. Un archivo de 20 MB no atraviesa el cuerpo de una Function. Las cargas canceladas pueden eliminarse; una tarea programada limpia los temporales abandonados de más de una hora.

La duración de publicaciones de administradores se calcula desde la fecha del evento, hasta el final del día siguiente en Argentina. Se usa el valor persistido `publicationPlan=admin-event`, asignado exclusivamente por el backend al crear. El adaptador Sheets lee esa política antes de aprobar y envía la ventana calculada al Apps Script existente. No requiere cambiar las columnas ni volver a desplegar el script para nuevas publicaciones.

El catálogo oculta cada publicación al cumplirse sus 24 horas. La eliminación física se ejecuta al consultar el catálogo si hay vencidas y mediante el cron diario a las 03:00 UTC. Este esquema no depende de un intervalo en memoria. En periodos sin tráfico, la eliminación física puede esperar hasta el cron diario, aunque la publicidad ya esté oculta. La tarea requiere `CRON_SECRET` y no se expone al navegador.

`scripts/migrate-state-to-neon.mjs` conserva usuarios y estadísticas locales con una marca de migración para no sumar visitas dos veces. No copia sesiones locales al dominio público. `scripts/configure-vercel-backend.mjs` y su compañero PowerShell guardan la configuración por stdin sin imprimir valores. Los archivos temporales privados se guardan bajo `data/`, excluido de Git y Vercel.

Los apartados siguientes describen la preparación inicial y la alternativa de un servidor externo; ya no es necesario contratar ese servidor para la arquitectura integrada.

Repositorio: https://github.com/leoptr22/gualeconecta. Rama actual: `master`.

## Estado preparado

Vercel compila el frontend Vite con `npm ci` y `npm run build`, y publica `dist`. `vercel.json` conserva las rutas de la SPA. Hasta disponer del backend público, `/api` responde con un error 503 explícito. Es una vista previa de la interfaz: no habilita cuentas, publicaciones ni adjuntos. No se debe presentar como la aplicación completa.

`.vercelignore` excluye configuración privada, datos locales y archivos que no necesita el frontend. No cargar secretos con prefijo `VITE_`. La integración con GitHub puede desplegar automáticamente cada push a la rama de producción configurada en Vercel.

## Backend persistente

El `Dockerfile` prepara el servidor Node 22. El proveedor debe ejecutar un servicio continuo con un volumen persistente montado en `/app/data`, accesible para el usuario `node`. El servidor escucha en `HOST=0.0.0.0` y en el `PORT` provisto por el hosting. Un volumen temporal pierde sesiones, estadísticas y medios; un proceso sin ejecución continua no realiza la limpieza cada minuto.

Configurar estas variables en el backend a partir de la configuración local, sin publicarlas en Git: `STORAGE=sheets`, `SHEETS_WEBHOOK_URL`, `SHEETS_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `GOOGLE_CLIENT_ID`, `APP_ORIGIN=https://DOMINIO-FRONTEND` y `NODE_ENV=production`. Conservar las rutas predeterminadas bajo `/app/data`; migrar por un canal privado los medios y bases locales que se quieran mantener.

Con la URL HTTPS del backend, reemplazar la primera regla de `vercel.json` por `{ "source": "/api/:path*", "destination": "https://BACKEND/api/:path*" }` y volver a desplegar. Mantener la regla de API antes de la SPA. El proxy mantiene cookies y peticiones del navegador bajo el dominio del frontend. No apuntar la regla a localhost ni a la URL de Apps Script: Apps Script almacena publicaciones, pero no reemplaza la API de autenticación y adjuntos.

Registrar el dominio exacto del frontend en los orígenes JavaScript autorizados del cliente Google. Probar sesión, publicación con medios, aprobación, visitas, enlaces compartidos y vencimiento antes de anunciar el lanzamiento. No copiar las bases o secretos al repositorio ni a los archivos públicos de Vercel.
