// Preview-only response until /api is routed to the persistent backend.
export default function handler(_request,response) {
 response.setHeader('Cache-Control','no-store');
 response.status(503).json({error:'La conexión con el servidor de Guale Conecta todavía no está configurada. Las publicaciones y el inicio de sesión estarán disponibles cuando se conecte la API.'});
}
