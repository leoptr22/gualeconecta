// @vitest-environment node
import { it,expect } from 'vitest';
import { createAnalytics } from './analytics.js';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from './app.js';

it('deduplicates refreshes, starts a new session after inactivity and uses Argentina dates',()=>{
 let time=Date.parse('2026-10-04T02:50:00Z');
 const analytics=createAnalytics({ANALYTICS_DATABASE_PATH:':memory:'},()=>time);
 let cookie='';const response={append:(_name,value)=>{cookie=value.split(';')[0];},setHeader:()=>{}};
 try {
  analytics.record({headers:{}},response);expect(analytics.stats()).toMatchObject({total:1,today:1});
  time+=5*60000;analytics.record({headers:{cookie}},response);expect(analytics.stats().total).toBe(1);
  time+=31*60000;expect(analytics.stats().today).toBe(0);
  analytics.record({headers:{cookie}},response);expect(analytics.stats()).toMatchObject({total:2,today:1});
  analytics.record({headers:{cookie:'guale_visit=forged'}},response);expect(analytics.stats().total).toBe(3);
 }finally{analytics.close();}
});
it('persists aggregated visits after reopening the database',()=>{
 const directory=mkdtempSync(join(tmpdir(),'guale-visits-'));
 // The injected environment selects disk storage for this persistence test.
 const before=process.env.NODE_ENV;process.env.NODE_ENV='development';
 try {
  const env={ANALYTICS_DATABASE_PATH:join(directory,'visits.sqlite')};
  let analytics=createAnalytics(env);analytics.record({headers:{}},{append:()=>{},setHeader:()=>{}});const startedAt=analytics.stats().startedAt;analytics.close();
  analytics=createAnalytics(env);expect(analytics.stats()).toMatchObject({total:1,startedAt});analytics.close();
 }finally{process.env.NODE_ENV=before;rmSync(directory,{recursive:true,force:true});}
});
it('restricts metrics to administrators and rejects cross-origin counting',async()=>{
 const auth={mount:()=>{},requireUser:(_req,_res,next)=>next(),currentUser:req=>req.headers['x-test-admin']?{role:'admin'}:null};
 const app=createApp({list:async()=>[]},{ADMIN_TOKEN:'test-only',ANALYTICS_DATABASE_PATH:':memory:'},auth);
 expect((await request(app).get('/api/admin/visits')).status).toBe(401);
 expect((await request(app).post('/api/visits').set('Origin','https://other.example')).status).toBe(403);
 await request(app).post('/api/visits').set('Origin','http://127.0.0.1:5173').set('x-test-admin','1');
 expect((await request(app).get('/api/admin/visits').set('Authorization','Bearer test-only')).body.total).toBe(0);
 const browser=request.agent(app);await browser.post('/api/visits').set('Origin','http://127.0.0.1:5173');await browser.post('/api/visits').set('Origin','http://127.0.0.1:5173');
 const metrics=await request(app).get('/api/admin/visits').set('Authorization','Bearer test-only');expect(metrics.body.total).toBe(1);expect(metrics.headers['cache-control']).toBe('no-store');
});
