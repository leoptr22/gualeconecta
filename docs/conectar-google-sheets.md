# Conectar la hoja de Guale Conecta

Hoja seleccionada: https://docs.google.com/spreadsheets/d/1KLbRqN9Wswot7TCXcBILHqFlpIfN3UT5jxNPhjlb5lA/edit

Estado de esta instalación: conexión verificada y `STORAGE=sheets` activo. Se migraron dos publicaciones reales conservando IDs, aprobación, propietarios, medios y vencimiento. La API pública respondió correctamente con ambas publicaciones. La copia SQLite se conservó. Los pasos siguientes sirven para reinstalar o actualizar la conexión; no es necesario repetir la configuración inicial.

1. Abrí la hoja con la cuenta propietaria y elegí **Extensiones → Apps Script**.
2. Pegá el contenido de `data/sheets-setup.gs` en `Código.gs`. Este archivo contiene la configuración privada de esta instalación: no lo publiques ni lo compartas.
3. Guardá. Seleccioná `configurarGualeConecta` y ejecutala una vez. Autorizá el acceso del script a la hoja. Se guardan las propiedades `SPREADSHEET_ID` y `SHARED_SECRET`.
4. Elegí **Implementar → Nueva implementación → Aplicación web**. Ejecutar como **Yo**, acceso **Cualquier usuario**. El endpoint necesita ese acceso para recibir las peticiones del servidor; cada operación comprueba el secreto antes de acceder a la hoja. La hoja puede mantenerse privada.
5. Copiá la URL terminada en `/exec` y pasala en el chat para completar la conexión. No hace falta enviar la contraseña de Google ni el secreto.

El enlace de la hoja no reemplaza la URL del endpoint. En una instalación nueva, conservar `STORAGE=sqlite` hasta verificar esa conexión.

## Migración

Con `SHEETS_WEBHOOK_URL` configurado en `.env`, ejecutar `node scripts/migrate-to-sheets.mjs`. Copia las publicaciones conservando aprobación, propietarios, medios y hora de vencimiento; verifica los registros y rechaza conflictos. Repetirlo no duplica IDs. No reinicia las 24 horas. SQLite permanece intacto. Después de verificar la copia, seleccionar `STORAGE=sheets` y reiniciar el servidor.

Las fotos y videos permanecen en `data/uploads`; la hoja guarda sus enlaces. Las cuentas y estadísticas siguen en sus bases SQLite. La pestaña `Publicaciones` se crea automáticamente y no modifica `Hoja 1`. La eliminación al vencer sigue requiriendo que el servidor esté encendido.
