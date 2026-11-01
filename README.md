# Guale Conecta

Primera versión React + TypeScript + Material UI para descubrir eventos, promociones y descuentos en Gualeguaychú, Pueblo Belgrano y Urdinarrain. Interfaz adaptable a celular, búsqueda por comercio, categorías, localidades, agenda, detalle y envío a revisión.

## Ejecutar

Producción en Vercel: frontend y Express se despliegan juntos. Sheets conserva las publicaciones, Neon guarda cuentas/sesiones/visitas y Blob guarda fotos/videos con cargas directas. La ejecución local conserva SQLite y archivos locales según `.env`. Ver [despliegue y migración](docs/despliegue-vercel.md).

Requiere Node 22.14 o superior (SQLite incluido en Node, marcado experimental en Node 22).

```sh
npm install
copy .env.example .env
npm run dev
```

Abrir http://127.0.0.1:5173. `npm test` verifica la interfaz y la API; `npm run build` genera el frontend. `npm start` sirve la compilación y la API en el puerto 3001.

## Inicio de sesión con Google

Guía paso a paso de activación: [docs/google-login.md](docs/google-login.md). Al solicitar Publicar sin sesión, la app retoma el formulario después del acceso. Antes de publicar vuelve a verificar la sesión y antes de salir renueva el CSRF; los errores de cierre se muestran sin simular que se cerró la cuenta.

Explorar es público; enviar una publicidad requiere ingresar con Google. La integración usa Google Identity Services y verifica el token en el servidor. Sin `GOOGLE_CLIENT_ID`, la app explica que el acceso no está habilitado y bloquea las publicaciones. No hay un acceso simulado.

1. Crear un cliente OAuth de tipo **Aplicación web** en Google Cloud y completar la marca/pantalla de consentimiento. [Guía oficial de Google](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
2. Registrar el origen exacto de la web como origen JavaScript autorizado. Para desarrollo con localhost, Google indica registrar `http://localhost` y `http://localhost:5173`; abrir ese host y usar el mismo en `APP_ORIGIN`. Si se utiliza `127.0.0.1`, registrar ese origen también en Google.
3. En `.env`, colocar `GOOGLE_CLIENT_ID=tu-identificador.apps.googleusercontent.com` y `APP_ORIGIN` con el origen elegido. Reiniciar el servidor. No se utiliza un secreto OAuth en este flujo.
4. En producción, registrar el dominio HTTPS y usarlo en `APP_ORIGIN`, con `NODE_ENV=production` para cookies seguras. Mantener API y web bajo el mismo origen.

Usuarios y sesiones persisten en **`data/accounts.sqlite`**, incluso si las publicidades usan Sheets. `AUTH_DATABASE_PATH` cambia la ubicación. Las sesiones duran siete días; la cookie es HttpOnly, SameSite=Lax y Secure en producción, y la base guarda el hash del token. El servidor valida origen, CSRF, nonce, audiencia y email verificado. Cada nueva publicación guarda su propietario; la API pública oculta ese identificador y el email. Respaldar también esta base.

Las pruebas verifican sesiones y rechazos con un verificador de Google inyectado solamente en tests. El acceso contra una cuenta Google real queda pendiente hasta configurar el cliente OAuth. Iniciar sesión no concede acceso a tu Google Sheets: su conexión es independiente.

## Diseño y contenido local

Cada tarjeta y su detalle tienen **Compartir**. El menú permite copiar el enlace o abrir WhatsApp con el texto preparado. En navegadores compatibles, Otras aplicaciones abre el menú nativo del dispositivo. El usuario confirma el envío en la aplicación elegida. El enlace `/?publicacion=ID` abre el detalle público al terminar de cargar el catálogo. Si la publicación venció o se eliminó, muestra que no está disponible. Los enlaces usan el origen de la web: durante las pruebas locales no se pueden abrir desde otros dispositivos fuera del servidor; al publicar con dominio propio usarán ese dominio.

Dirección actual: neobrutalismo con detalles glass en la cabecera, sobre Material UI. Rosa intenso, violeta eléctrico, amarillo ácido y cian; bordes negros, esquinas rectas, sombras duras y tipografía Manrope de gran escala. Claro/oscuro según el sistema y movimiento reducido. La bandera permanece como logo y fondo sutil (4,5% en claro, 3,5% en oscuro). El carrusel se retiró por pedido del usuario. La bandera provista se usa como logo y fondo fijo tenue detrás del vidrio, con opacidad de 4,5% en claro y 3,5% en oscuro. El buscador alterna sugerencias con efecto máquina de escribir; se pausa al enfocar o ingresar texto y se vuelve estático con movimiento reducido. Los efectos de desplazamiento, rotación y sombras duras se limitan a punteros con hover. Las fotografías anteriores quedan como recursos sin mostrarse en la interfaz. La sección Consejos explica audiencia, beneficio, precio, imágenes, video, acción y verificación del contenido.

Se consultaron las guías oficiales de [Emil Kowalski](https://github.com/emilkowalski/skills), [Impeccable](https://github.com/pbakaus/impeccable) y [Taste](https://github.com/Leonxlnx/taste-skill). No estaban instaladas; se aplicaron sus referencias directamente, con revisión visual y documentación local, sin el launcher de Impeccable.

## Almacenamiento persistente y carga manual

La aplicación inicia vacía y no genera contenido de ejemplo. El almacenamiento predeterminado es **SQLite**, en **`data/publicaciones.sqlite`**, dentro del proyecto, en el disco de la computadora donde corre el servidor. Las publicaciones persisten al cerrar el navegador, reiniciar el servidor o reiniciar la computadora. El archivo se crea automáticamente.

`STORAGE=sqlite` selecciona SQLite. `DATABASE_PATH` permite cambiar su ubicación; vacío utiliza la ruta del proyecto. `data/` está excluido de Git: conservar este directorio al mover o actualizar la app. En un servidor remoto necesita un volumen persistente, no un disco temporal. Para múltiples servidores migrar a PostgreSQL.

SQLite usa WAL: pueden existir archivos `publicaciones.sqlite-wal` y `publicaciones.sqlite-shm`. Para respaldar, detener el servidor y comandos de moderación y copiar el directorio `data/` completo. Restaurar con los procesos detenidos.

Cargá el contenido real manualmente desde **Publicar gratis**, usando los datos de Instagram, diarios o comercios. Cada envío queda guardado inmediatamente como pendiente. Para revisarlo y aprobarlo desde una terminal de este proyecto:

```sh
npm run moderar -- list
npm run moderar -- approve IDENTIFICADOR
```

Copiá el identificador que aparece en el listado. Luego recargá la página: la publicación aparece si está vigente. El comando usa el mismo almacenamiento de `.env`. También podés usar el panel visual indicado abajo. No hay importador automático.

## Panel de administración

**Avisos de revisión:** el administrador puede activar Web Push por dispositivo desde el panel. El permiso del navegador se solicita únicamente al pulsar Activar notificaciones. Cada envío pendiente genera un aviso con enlace a su revisión; las suscripciones y la cola persisten en la base de cuentas. Las entregas fallidas se reintentan y los dispositivos vencidos se eliminan. En iPhone/iPad se debe agregar la web a la pantalla de inicio y abrirla desde allí. Ver [configuración y prueba de avisos](docs/avisos-push.md).

Duración por autor: las publicaciones creadas con una sesión administrativa guardan `publicationPlan=admin-event` y permanecen hasta finalizar el día posterior a la fecha indicada, en horario de Argentina. El rol se verifica en el servidor; el cliente no puede seleccionar este plan. Las de otros usuarios mantienen las 24 horas desde la aprobación. Todas siguen pasando por revisión. La política de las publicaciones existentes debe actualizarse en sus filas de Sheets para modificar sus vencimientos persistidos; aprobar otra vez no extiende ni cambia una publicación ya aprobada.

Las publicaciones gratuitas tienen 24 horas desde su aprobación, calculadas por el servidor con `approvedAt` y `expiresAt`. Repetir una aprobación no extiende su duración. Al vencer se ocultan de la API y se eliminan de la base/hoja junto con los adjuntos locales; la limpieza corre al iniciar y cada minuto mientras el servidor esté encendido. Si estuvo apagado, limpia al volver a iniciar. Los pendientes conservan su contenido mientras esperan revisión. Al adoptar la regla, las publicaciones ya aprobadas reciben una ventana completa de 24 horas desde esa actualización. La fecha de oferta/evento es informativa; no permite aumentar la duración de exposición. La política está centralizada en `server/publication-policy.js`; todavía no hay planes de suscripción habilitados.

Para Sheets, actualizar y volver a desplegar `integrations/google-apps-script.gs`: añade `approvedAt`, `expiresAt` y `publicationPlan`, y soporta la eliminación de filas vencidas. Cambiar la hoja manualmente a `approved` hace que la limpieza le asigne su ventana inicial. El servidor debe seguir ejecutándose para limpiar la hoja y los medios.

El panel muestra visitas totales y de hoy (horario de Argentina), con actualización manual. El conteo comienza al incorporar esta función; no recupera visitas anteriores ni mide personas únicas. Las aperturas y recargas del mismo navegador se agrupan mientras no pasen 30 minutos sin registrar otra apertura. Las sesiones administrativas se excluyen. Sin cookies, cada apertura puede sumar una visita nueva. No se guardan IP, email ni historial de páginas: solo conteos diarios y hashes temporales para agrupar sesiones. Los datos persisten en `data/visitas.sqlite` incluso al usar Sheets; `ANALYTICS_DATABASE_PATH` permite cambiar la ruta. Incluí esta base en los respaldos de `data/`.

Entrá en **Ingresar → Acceso administrador** y usá el email y la contraseña configurados para esta app. Se abre **Panel**, con filtros Pendientes y Aprobadas y búsqueda por título o comercio. Elegí **Revisar publicación** para ver contenido, contacto, fotos y video; **Aprobar publicación** la habilita en el catálogo si está vigente. La aprobación se guarda en el almacenamiento seleccionado, SQLite o Sheets.

`ADMIN_EMAIL` identifica al administrador y `ADMIN_PASSWORD_HASH` contiene un hash scrypt con sal. La contraseña no se guarda en texto plano ni se envía al frontend. El acceso administrativo utiliza sesiones HttpOnly y las aprobaciones requieren CSRF. El servidor comprueba el rol en cada petición. Una cuenta Google con el email administrativo verificado también puede acceder al panel. La contraseña del panel pertenece a esta app y no modifica la cuenta Google.

Google Sheets sigue disponible como alternativa, pero necesita configurar la hoja y credenciales. Al cambiar de almacenamiento los registros **no se migran automáticamente**; SQLite queda intacto. Si se selecciona Sheets y falta configuración, la app falla en vez de cambiar silenciosamente de almacenamiento.

## Conectar Google Sheets (alternativa)

1. Crear una hoja privada, entrar a Extensiones > Apps Script y pegar `integrations/google-apps-script.gs`.
2. En propiedades del script agregar `SHARED_SECRET` con un secreto largo y aleatorio.
3. Desplegar como aplicación web ejecutada por el propietario, con acceso a cualquiera. No compartir la hoja ni el secreto; la aplicación web valida el secreto en cada petición.
4. Configurar `.env`: `STORAGE=sheets`, `SHEETS_WEBHOOK_URL` con la URL `/exec` y `SHEETS_SECRET` con el mismo secreto. Configurar también `ADMIN_TOKEN` con otro secreto.
5. Reiniciar el servidor. La pestaña `Publicaciones` se crea automáticamente. La hoja debe estar dedicada a esta aplicación y conservar las columnas.

El navegador nunca accede directamente a Sheets ni recibe las credenciales. El email se conserva para gestión y se elimina de las respuestas públicas. La API valida localidad, contenido y vigencia; cada envío nace pendiente. El script usa bloqueo para escrituras concurrentes y guarda texto para impedir inyección de fórmulas.

Moderación: `GET /api/admin/publications` y `POST /api/admin/publications/:id/approve` admiten la sesión administrativa del panel o `Authorization: Bearer <ADMIN_TOKEN>`. El propietario también puede cambiar `status` a `approved` en la hoja. Los demás estados no son públicos. El panel permite revisar y aprobar; todavía no incluye edición de publicaciones. También se puede aprobar con el comando local indicado arriba.

## Arquitectura

### Fotos y video

Cada publicidad admite **hasta 3 fotos y un video opcional**, o solamente fotos o video. Fotos: JPG, PNG o WebP estático, máximo 8 MB cada una. Video: MP4 con H.264 y audio AAC/MP3, máximo 30 segundos y 20 MB. El formulario ofrece selección, vista previa y eliminación antes de enviar; el detalle muestra todas las fotos y reproduce el video con controles, sin reproducción automática.

El servidor valida los archivos, convierte las fotos a WebP con un máximo de 1600 píxeles y elimina sus metadatos. Verifica los videos con FFprobe (incluido en las dependencias). Rechaza formatos no compatibles, adjuntos adicionales y videos largos. Los archivos se guardan en **`data/uploads/`**, o la ruta configurada en `MEDIA_PATH`. Los archivos rechazados y los adjuntos de una publicación cuya escritura falla se limpian automáticamente.

SQLite almacena las referencias junto con la publicación. **Google Sheets almacena los enlaces en la columna `media`, no los archivos binarios.** Para usar adjuntos en Sheets, actualizar y volver a desplegar el script de Apps Script incluido: añade las columnas media y ownerId conservando las anteriores. Las publicaciones antiguas sin adjuntos siguen funcionando. No se ha conectado ni probado una hoja real en esta instalación.

Respaldar el directorio de medios junto con la base y conservarlo al desplegar. En hosting requiere almacenamiento persistente; los enlaces relativos usan el dominio de la app. Los archivos tienen enlaces públicos con nombres aleatorios, no acceso privado. No hay todavía carga directa a Google Drive ni almacenamiento externo de medios. No se insertan archivos o publicidades de prueba en la base de uso real.


- `src/components`: tarjetas y formulario reutilizables.
- `src/hooks`: estado de carga, errores y reintentos.
- `src/services`: cliente HTTP; sin acoplamiento a Sheets.
- `src/types.ts`: modelo de lectura y categorías.
- `server/domain.js`: validación y reglas de visibilidad.
- `server/repository.js`: adaptadores SQLite y Sheets.
- `server/moderate.js`: revisión y aprobación desde la terminal del propietario.
- `src/motion.css`: entrada de secciones y tarjetas, elevación al pasar el cursor y respuesta al foco, respetando movimiento reducido.
- `server/app.js`: API, moderación y límite de envíos.
- `integrations`: puente de Google Apps Script.

Las fechas representan días completos en Argentina; las publicaciones se muestran hasta el último día de vigencia inclusive. Los filtros geográficos usan una lista explícita de localidades, no geolocalización.

## Viabilidad y evolución

Sheets sirve para un piloto pequeño con revisión manual. Cada consulta lee la hoja: las cuotas y latencia de Apps Script limitan la escala. Antes de crecimiento sostenido, agregar caché y migrar a PostgreSQL con índices por localidad, estado y vigencia. El contrato de repositorio permite cambiar almacenamiento sin reescribir la interfaz.

La fase gratuita está implementada. Suscripciones, cobros, anuncios emergentes y push están pendientes: no se simulan pagos ni notificaciones. Para activarlos se necesitan cuentas verificadas, autorización por propietario, planes y derechos de publicación, proveedor de pagos con webhooks idempotentes, fechas de inicio/fin y límites de anuncios. Push requiere HTTPS, service worker, claves VAPID y consentimiento explícito, con opción de baja. Evitar anuncios que bloqueen la búsqueda.

Antes de apertura pública: asegurar disco persistente o configurar Sheets, dominio/HTTPS, activar Google OAuth, protección antispam adicional, políticas de privacidad, copias de seguridad y observabilidad. El servidor escucha localmente; el despliegue debe configurar su host/proxy. No hay publicación remota configurada en este repositorio.






