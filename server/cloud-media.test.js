// @vitest-environment node
import { it,expect,vi,afterEach } from 'vitest';
import sharp from 'sharp';
import { put,del,head } from '@vercel/blob';
import { createCloudMedia,ownedUpload,uploadPrefix } from './cloud-media.js';
vi.mock('@vercel/blob',()=>({put:vi.fn(),del:vi.fn().mockResolvedValue(undefined),head:vi.fn(),list:vi.fn()}));
afterEach(()=>{vi.clearAllMocks();vi.unstubAllGlobals();});
const env={MEDIA_BLOB_HOST:'test-store.public.blob.vercel-storage.com'};
const filename='11111111-1111-4111-8111-111111111111.webp';
it('only accepts uploaded files in the configured store and the authenticated owner prefix',()=>{
 const url='https://'+env.MEDIA_BLOB_HOST+'/'+uploadPrefix('test-user')+filename;
 expect(ownedUpload(url,'test-user',env).toString()).toBe(url);
 for(const invalid of [url.replace('https:','http:'),url.replace(env.MEDIA_BLOB_HOST,'other.public.blob.vercel-storage.com'),url+'?redirect=1',url.replace('/uploads/','/publications/'),'https://localhost/file','https://'+env.MEDIA_BLOB_HOST+'/'+uploadPrefix('test-user')+'../../file.webp'])expect(()=>ownedUpload(invalid,'test-user',env)).toThrow();
 expect(()=>ownedUpload(url,'another-user',env)).toThrow();
});
it('validates and optimizes uploaded photos before storing permanent publication files',async()=>{
 const buffer=await sharp({create:{width:30,height:20,channels:3,background:'#4477aa'}}).png().toBuffer();
 head.mockResolvedValue({size:buffer.length});put.mockImplementation(async pathname=>({url:'https://'+env.MEDIA_BLOB_HOST+'/'+pathname}));
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(buffer)));
 const original='https://'+env.MEDIA_BLOB_HOST+'/'+uploadPrefix('test-user')+filename;
 const result=await createCloudMedia(env).finalize([{type:'image',url:original}],'test-user');
 expect(result.media[0].url).toMatch(/\/publications\/[0-9a-f-]+\.webp$/);expect(result.media[0].type).toBe('image');
 const processed=put.mock.calls[0][1];expect((await sharp(processed).metadata()).format).toBe('webp');
 expect(del).toHaveBeenCalledWith([original],expect.any(Object));
 await result.rollback();expect(del).toHaveBeenCalledWith([result.media[0].url],expect.any(Object));
});
it('rejects foreign uploads and too many photos without downloading or deleting them',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const media=createCloudMedia(env);
 await expect(media.finalize([{type:'image',url:'https://other.example/file'}],'test-user')).rejects.toThrow();
 await expect(media.finalize(Array.from({length:4},()=>({type:'image',url:'https://example.com'})),'test-user')).rejects.toThrow();
 expect(fetch).not.toHaveBeenCalled();expect(del).not.toHaveBeenCalled();
});
it('rejects forged image contents and never creates permanent files',async()=>{
 head.mockResolvedValue({size:20});vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('not-an-image')));
 const original='https://'+env.MEDIA_BLOB_HOST+'/'+uploadPrefix('test-user')+filename;
 await expect(createCloudMedia(env).finalize([{type:'image',url:original}],'test-user')).rejects.toThrow();expect(put).not.toHaveBeenCalled();expect(del).toHaveBeenCalledWith([original],expect.any(Object));
});
