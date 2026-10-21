import type { Publication } from './types';
export function publicationDeadline(item:Publication) {
 return item.expiresAt?`Visible hasta ${new Date(item.expiresAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'})}`:`Hasta el ${new Date(item.endsAt+'T12:00:00').toLocaleDateString('es-AR')}`;
}
