export const FREE_PUBLICATION_HOURS=24;
export function adminEventExpiry(date) {
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('Fecha del evento inválida');
 // Buenos Aires uses UTC-3. Expiration is exclusive: midnight after the following day.
 return new Date(Date.parse(date+'T00:00:00-03:00')+2*86400000).toISOString();
}
export function approvalWindow(time=new Date(),item={}) {
 const admin=item.publicationPlan==='admin-event';
 return {approvedAt:time.toISOString(),expiresAt:admin?adminEventExpiry(item.endsAt):new Date(time.getTime()+FREE_PUBLICATION_HOURS*3600000).toISOString(),publicationPlan:admin?'admin-event':'free'};
}
export function hasExpired(item,time=new Date()) {
 return item.status==='approved'&&!!item.expiresAt&&Date.parse(item.expiresAt)<=time.getTime();
}
