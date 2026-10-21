import { Box } from '@mui/material';
import type { PublicationMedia } from '../types';
export function MediaGallery({media=[],title}:{media?:PublicationMedia[];title:string}){
 const photos=media.filter(item=>item.type==='image');const video=media.find(item=>item.type==='video');
 if(!media.length)return null;
 return <Box className="media-gallery" mt={2} mb={2}>
  {!!photos.length&&<div className="gallery-photos">{photos.map((photo,index)=><a href={photo.url} target="_blank" rel="noopener noreferrer" key={photo.url} aria-label={`Abrir foto ${index+1} de ${title}`}><img src={photo.url} alt={`${title} · foto ${index+1}`} loading="lazy"/></a>)}</div>}
  {video&&<video src={video.url} controls playsInline preload="metadata" aria-label={`Video de ${title}`}/>}
 </Box>;
}
