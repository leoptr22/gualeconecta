// @vitest-environment node
import { it,expect } from 'vitest';
import request from 'supertest';
import { adminEventExpiry,approvalWindow } from './publication-policy.js';
import { createApp } from './app.js';
import { createRepository } from './repository.js';
import { isActive } from './domain.js';

it('keeps admin events through the full following day in Argentina',()=>{
 const item={status:'approved',publicationPlan:'admin-event',endsAt:'2026-11-13',...approvalWindow(new Date('2026-11-01T12:00:00Z'),{publicationPlan:'admin-event',endsAt:'2026-11-13'})};
 expect(item.expiresAt).toBe('2026-11-15T03:00:00.000Z');
 expect(isActive(item,new Date('2026-11-15T02:59:59.999Z'))).toBe(true);
 expect(isActive(item,new Date('2026-11-15T03:00:00.000Z'))).toBe(false);
 expect(adminEventExpiry('2026-12-31')).toBe('2027-01-02T03:00:00.000Z');
 expect(adminEventExpiry('2028-02-28')).toBe('2028-03-01T03:00:00.000Z');
 expect(()=>adminEventExpiry('2026-02-30')).toThrow();
});
it('assigns the policy from the authenticated author and ignores client attempts to choose it',async()=>{
 const fixture={title:'Evento de prueba aislado',business:'Organización de prueba',description:'Descripción aislada para verificar las políticas de duración.',category:'Cultura',kind:'Evento',town:'Gualeguaychú',address:'Dirección de prueba',endsAt:'2099-11-13',contact:'test@example.com',publicationPlan:'admin-event',role:'admin'};
 for(const role of ['admin','publisher']){
  const repo=createRepository({DATABASE_PATH:':memory:'});
  const auth={mount:()=>{},requireUser:(req,_res,next)=>{req.user={id:'test-only',role};next();}};
  try{
   const app=createApp(repo,{},auth);const created=await request(app).post('/api/publications').send(fixture);expect(created.status).toBe(201);
   const approved=await repo.approve(created.body.id);
   if(role==='admin'){expect(approved.publicationPlan).toBe('admin-event');expect(approved.expiresAt).toBe('2099-11-15T03:00:00.000Z');}
   else{expect(approved.publicationPlan).toBe('free');expect(Date.parse(approved.expiresAt)-Date.parse(approved.approvedAt)).toBe(86400000);}
   expect((await repo.approve(created.body.id)).expiresAt).toBe(approved.expiresAt);
  }finally{repo.close();}
 }
});
