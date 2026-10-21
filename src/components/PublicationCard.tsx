import { SharePublication } from './SharePublication';
import { publicationDeadline } from '../publication-time';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutline';
import LocalCafe from '@mui/icons-material/LocalCafe';
import ShoppingBag from '@mui/icons-material/ShoppingBag';
import MusicNote from '@mui/icons-material/MusicNote';
import School from '@mui/icons-material/School';
import DirectionsRun from '@mui/icons-material/DirectionsRun';
import Storefront from '@mui/icons-material/Storefront';
import Place from '@mui/icons-material/Place';
import { Card,CardActionArea,Chip,Typography,Box } from '@mui/material';
import type { Publication } from '../types';
const icons={Gastronomía:LocalCafe,Compras:ShoppingBag,Cultura:MusicNote,Educación:School,Deportes:DirectionsRun,Servicios:Storefront};
export function PublicationCard({item,onOpen}:{item:Publication;onOpen:(item:Publication)=>void}){const Icon=icons[item.category];const photos=item.media?.filter(media=>media.type==='image')||[];const hasVideo=item.media?.some(media=>media.type==='video');return <Card className="publication-card" elevation={0}><CardActionArea onClick={()=>onOpen(item)} aria-label={`Ver ${item.title}`}><Box className={`card-art art-${item.category} ${photos.length?'has-media':''}`}><Chip size="small" label={item.kind}/><>{photos.length?<img className="card-cover" src={photos[0].url} alt={item.title} loading="lazy"/>:hasVideo?<span className="video-card-label"><PlayCircleOutline sx={{fontSize:50}}/>Ver video</span>:<><Icon className="feature-icon"/><span className="art-caption">{item.badge||item.category}</span></>}{(photos.length>0||hasVideo)&&<span className="card-media-count">{photos.length?`${photos.length} foto${photos.length>1?'s':''}`:''}{photos.length>0&&hasVideo?' · ':''}{hasVideo?'Video':''}</span>}</></Box><Box p={2.5}><Typography className="eyebrow" color="primary">{item.category}</Typography><Typography variant="h6" mt={.7}>{item.title}</Typography><Typography color="text.secondary" mt={.7}>{item.business}</Typography><Box display="flex" gap={.5} alignItems="center" mt={2}><Place sx={{fontSize:17}} color="action"/><Typography variant="body2" color="text.secondary">{item.town}</Typography></Box><Typography variant="body2" color="text.secondary" mt={.5}>{publicationDeadline(item)}</Typography></Box></CardActionArea><Box className="card-share-actions"><SharePublication item={item}/></Box></Card>;}

