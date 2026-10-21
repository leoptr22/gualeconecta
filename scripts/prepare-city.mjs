import sharp from 'sharp';
import { readFile,writeFile,unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root=fileURLToPath(new URL('../public/city/',import.meta.url));
const sources=JSON.parse(await readFile(resolve(root,'sources.json'),'utf8'));
for(const [index,name] of ['coast','river'].entries()){
 const source=sources[index];
 for(const width of [800,1600])await sharp(resolve(root,source.file)).resize({width,withoutEnlargement:true}).webp({quality:86}).toFile(resolve(root,`${name}-${width}.webp`));
 await sharp(resolve(root,source.file)).resize({width:1600,withoutEnlargement:true}).webp({quality:86}).toFile(resolve(root,`${name}.webp`));
 source.optimized=`${name}.webp`;source.modifications='Redimensionado y convertido a WebP. La interfaz puede recortar el encuadre. CC BY-SA 4.0.';
}
await writeFile(resolve(root,'sources.json'),JSON.stringify(sources,null,2));
// Only discard source copies downloaded for this task; never user uploads.
for(const name of ['1.jpg','2.jpg','city-1.jpg','city-2.jpg']){
 const target=resolve(root,name);if(!target.startsWith(root))throw new Error('Unexpected asset path');await unlink(target).catch(()=>{});
}
