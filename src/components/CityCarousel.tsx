import { useState } from 'react';
import { IconButton } from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
const slides=[
 {src:'/city/river.webp',title:'El río, siempre cerca.',alt:'Río Gualeguaychú frente al Club de Pescadores',source:'https://commons.wikimedia.org/wiki/File:RioGualeguaychu-Clubpescadores.jpg'},
 {src:'/city/coast.webp',title:'Nuestra costanera.',alt:'Paseo de la costanera de Gualeguaychú con palmeras y comercios',source:'https://commons.wikimedia.org/wiki/File:Gualeguaychu-Costanera-mar2024-1.jpg'}
];
export function CityCarousel(){
 const [index,setIndex]=useState(0);const [failed,setFailed]=useState(false);const next=(step:number)=>{setIndex(i=>(i+step+slides.length)%slides.length);setFailed(false);};
 return <section className="city-carousel" aria-label="Fotografías de Gualeguaychú" aria-roledescription="carrusel" tabIndex={0} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();next(1);}if(event.key==='ArrowLeft'){event.preventDefault();next(-1);}}}>
  <div className="city-image-frame">{slides.map((slide,i)=><img key={slide.src} src={slide.src} srcSet={`${slide.src.replace('.webp','-800.webp')} 800w, ${slide.src.replace('.webp','-1600.webp')} 1600w`} sizes="(max-width: 800px) 100vw, 50vw" alt={slide.alt} className={i===index?'city-image is-active':'city-image'} aria-hidden={i!==index} loading={i===0?'eager':'lazy'} fetchPriority={i===0?'high':'auto'} onError={()=>{if(i===index)setFailed(true);}}/>)}{failed&&<p className="city-image-error">No pudimos cargar esta fotografía. Probá la siguiente.</p>}<div className="carousel-controls"><IconButton aria-label="Foto anterior" onClick={()=>next(-1)}><ChevronLeft/></IconButton><IconButton aria-label="Foto siguiente" onClick={()=>next(1)}><ChevronRight/></IconButton></div></div>
  <div className="city-caption"><strong aria-live="polite">{slides[index].title}</strong><small><a href={slides[index].source} target="_blank" rel="noopener noreferrer">Foto: Ezarate</a> / <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></small></div>
 </section>;
}
