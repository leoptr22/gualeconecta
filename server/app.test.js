// @vitest-environment node
import { describe,it,expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { createRepository } from './repository.js';
const testAuth={mount:()=>{},requireUser:(req,res,next)=>{req.user={id:'test-user'};next();}};
const valid={title:'Nueva promoción',business:'Mi comercio',description:'Una oferta válida para todos.',category:'Compras',kind:'Descuento',town:'Gualeguaychú',address:'Calle ejemplo 123',endsAt:'2099-12-31',contact:'hola@example.com'};
describe('Publicaciones y moderación',()=>{
it('oculta pendientes y contactos, y exige autorización para aprobar',async()=>{const app=createApp(createRepository({STORAGE:'sqlite',DATABASE_PATH:':memory:'}),{ADMIN_TOKEN:'test-secret'},testAuth);const created=await request(app).post('/api/publications').send(valid);expect(created.status).toBe(201);let response=await request(app).get('/api/publications');expect(response.body.items.some(x=>x.id===created.body.id)).toBe(false);expect((await request(app).post(`/api/admin/publications/${created.body.id}/approve`)).status).toBe(401);expect((await request(app).post(`/api/admin/publications/${created.body.id}/approve`).set('Authorization','Bearer test-secret')).status).toBe(200);response=await request(app).get('/api/publications');const item=response.body.items.find(x=>x.id===created.body.id);expect(item.title).toBe(valid.title);expect(item.contact).toBeUndefined();});
it('rechaza localidades externas y fechas vencidas',async()=>{const app=createApp(createRepository({STORAGE:'sqlite',DATABASE_PATH:':memory:'}),{},testAuth);for(const body of [{...valid,town:'Buenos Aires'},{...valid,endsAt:'2020-01-01'}])expect((await request(app).post('/api/publications').send(body)).status).toBe(400);});
it('no expone publicaciones vencidas',async()=>{const app=createApp({list:async()=>[{...valid,id:'expired',status:'approved',endsAt:'2020-01-01'}]});expect((await request(app).get('/api/publications')).body.items).toEqual([]);});
});
