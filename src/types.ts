export const categories=['Gastronomía','Compras','Cultura','Educación','Servicios','Deportes'] as const;
export const towns=['Gualeguaychú','Pueblo Belgrano','Urdinarrain'] as const;
export type PublicationMedia={type:'image'|'video';url:string;duration?:number};
export type Publication={id:string;title:string;business:string;description:string;category:typeof categories[number];kind:'Promoción'|'Evento'|'Descuento';town:string;address:string;endsAt:string;expiresAt?:string;approvedAt?:string;publicationPlan?:'free'|'admin-event';badge?:string;media?:PublicationMedia[]};
