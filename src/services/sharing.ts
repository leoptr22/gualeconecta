import type { Publication } from '../types';

export function publicationShareData(item:Publication,origin=window.location.origin) {
 const url=new URL('/',origin);url.searchParams.set('publicacion',item.id);
 return {title:item.title,text:`${item.title} · ${item.business} · ${item.town}\nEncontralo en Guale Conecta.`,url:url.toString()};
}
