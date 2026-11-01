import type { Publication } from './types';
export function publicationDeadline(item:Publication) {
 return item.expiresAt?`Visible hasta ${new Date(Date.parse(item.expiresAt)-(item.publicationPlan==='admin-event'?1:0)).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'})}`:`Hasta el ${new Date(item.endsAt+'T12:00:00').toLocaleDateString('es-AR')}`;
}
