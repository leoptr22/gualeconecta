# Avisos push de revisión

## Activar en un dispositivo

1. Abrir la web por HTTPS e ingresar con la cuenta administradora.
2. Abrir Panel → Avisos de revisión → Activar notificaciones.
3. Permitir las notificaciones cuando lo solicite el navegador.
4. Pulsar Enviar aviso de prueba y comprobar la recepción.

Activar cada teléfono o computadora por separado. En iPhone/iPad, agregar la web a la pantalla de inicio y abrir esa instalación antes de activar. Si el permiso está bloqueado, el propietario debe cambiarlo en los permisos del sitio. El envío depende del servicio push del navegador y de los ajustes del sistema; el permiso concedido no demuestra que un aviso ya haya llegado.

Al tocar un aviso se abre `/?adminReview=ID`. Si falta sesión, la app solicita ingresar; la publicación pendiente nunca se expone al catálogo público. El panel abre su detalle una vez y muestra el botón de aprobación. Si ya se revisó o desapareció, informa su estado actual.

Si aparece «Registration failed - push service error», el registro falló en el servicio push del navegador antes de guardar el dispositivo. En Brave, revisar `brave://settings/privacy` → «Usar los servicios de Google para mensajes push», reiniciar y repetir la activación. Si ya estaba habilitado, comprobar la conexión y posibles bloqueos de red al servicio push. Esta preferencia la cambia el propietario del navegador. [Ayuda oficial de Brave](https://support.brave.app/hc/en-us/articles/360017989132-How-do-I-change-my-Privacy-Settings).

## Servidor

Se utiliza Web Push con VAPID, sin una cuenta de mensajería adicional. Generar las claves una sola vez con `node scripts/configure-review-push.mjs` y guardar las variables de producción con `scripts/configure-review-push.ps1`. La clave privada permanece fuera de Git, del frontend y de los registros. Conservar las mismas claves entre despliegues; cambiarlas requiere volver a activar los dispositivos.

Las tablas `push_subscriptions`, `push_jobs` y `push_deliveries` se guardan en la base de cuentas (Neon en producción, SQLite local). Solo las cuentas cuyo email sigue siendo el administrador configurado reciben avisos. Las rutas de configuración requieren sesión administrativa y las mutaciones verifican CSRF y origen. Los endpoints de suscripción y las claves de cifrado son privados.

El envío se prepara antes de guardar la publicación y se habilita después de confirmar el guardado. Una publicación que falla no genera un aviso. La entrega corre con `waitUntil` en Vercel y no impide guardar cuando falla el servicio push. Se registra el envío por publicación y dispositivo para evitar duplicados; el service worker usa una etiqueta estable para reemplazar reentregas. Los errores transitorios se reintentan en próximos procesos y las respuestas 404/410 eliminan suscripciones vencidas. El panel y el cron reconcilian los pendientes con Sheets para recuperar avisos cuya habilitación falló.

El botón de prueba envía únicamente al dispositivo de la sesión que lo solicita. Desactivar elimina esa suscripción del servidor y del navegador. La activación y la comprobación final en un dispositivo real requieren la intervención de su propietario.
