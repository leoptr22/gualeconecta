// @vitest-environment node
import { it,expect,vi } from 'vitest';
import { createECDH,randomBytes } from 'node:crypto';
import webpush from 'web-push';
import request from 'supertest';
import { createReviewPush,pushSubscriptionSchema } from './review-push.js';
import { createApp } from './app.js';
const keys=webpush.generateVAPIDKeys();
const env={AUTH_DATABASE_PATH:':memory:',ADMIN_EMAIL:'owner@example.com',VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey};
const user={id:'isolated-admin',email:env.ADMIN_EMAIL,name:'Prueba aislada'};
const subscription=(suffix='one')=>({endpoint:'https://fcm.googleapis.com/fcm/send/test-'+suffix,keys:{p256dh:createECDH('prime256v1').generateKeys().toString('base64url'),auth:randomBytes(16).toString('base64url')}});
const item={id:'test-only',title:'Publicación aislada',business:'Organización de prueba',status:'pending'};
it('sends only saved and ready pending publications, once per device',async()=>{
 const send=vi.fn().mockResolvedValue({statusCode:201});const service=createReviewPush(env,{send});const repo={list:async()=>[item]};
 try{await service.subscribe(user,subscription());await service.prepare(item);await service.flush(repo);expect(send).not.toHaveBeenCalled();await service.ready(item.id);await service.flush(repo);await service.flush(repo);expect(send).toHaveBeenCalledOnce();const payload=JSON.parse(send.mock.calls[0][1]);expect(payload.url).toBe('/?adminReview=test-only');expect(payload.body).toContain(item.title);}finally{service.close();}
});
it('does not notify cancelled writes or publications already reviewed',async()=>{
 const send=vi.fn();const service=createReviewPush(env,{send});
 try{await service.subscribe(user,subscription());await service.prepare(item);await service.cancel(item.id);await service.flush({list:async()=>[item]});await service.prepare(item);await service.ready(item.id);await service.flush({list:async()=>[{...item,status:'approved'}]});expect(send).not.toHaveBeenCalled();}finally{service.close();}
});
it('retries failed devices without duplicating successful deliveries',async()=>{
 let time=1000000;let failed=true;const send=vi.fn(async sub=>{if(sub.endpoint.endsWith('bad')&&failed){failed=false;throw {statusCode:503};}});const service=createReviewPush(env,{send,now:()=>time});const repo={list:async()=>[item]};
 try{await service.subscribe(user,subscription('good'));await service.subscribe(user,subscription('bad'));await service.prepare(item);await service.ready(item.id);await service.flush(repo);await service.flush(repo);expect(send).toHaveBeenCalledTimes(2);time+=120001;await service.flush(repo);expect(send).toHaveBeenCalledTimes(3);expect(send.mock.calls.filter(([sub])=>sub.endpoint.endsWith('good'))).toHaveLength(1);}finally{service.close();}
});
it('removes expired subscriptions and excludes accounts that no longer administer',async()=>{
 const send=vi.fn().mockRejectedValue({statusCode:410});const settings={...env};const service=createReviewPush(settings,{send});
 try{await service.subscribe(user,subscription());await service.prepare(item);await service.ready(item.id);await service.flush({list:async()=>[item]});const next={...item,id:'next-test'};await service.prepare(next);await service.ready(next.id);await service.flush({list:async()=>[next]});expect(send).toHaveBeenCalledOnce();await service.subscribe(user,subscription('second'));settings.ADMIN_EMAIL='another@example.com';await service.flush({list:async()=>[next]});expect(send).toHaveBeenCalledOnce();}finally{service.close();}
});
it('rejects internal URLs and malformed encryption keys',()=>{
 const valid=subscription();expect(pushSubscriptionSchema.safeParse(valid).success).toBe(true);
 for(const endpoint of ['http://fcm.googleapis.com/a','https://localhost/a','https://fcm.googleapis.com.attacker.example/a','https://fcm.googleapis.com:444/a'])expect(pushSubscriptionSchema.safeParse({...valid,endpoint}).success).toBe(false);
 expect(pushSubscriptionSchema.safeParse({...valid,keys:{auth:'bad',p256dh:'bad'}}).success).toBe(false);
});
it('prevents unauthenticated visitors and publishers from registering devices',async()=>{
 for(const role of [null,'publisher']){
  const auth={mount:()=>{},requireUser:(_req,res)=>res.sendStatus(401),requireAdmin:(req,res,next)=>{if(!role)return res.sendStatus(401);req.user={...user,role};next();}};
  const service=createReviewPush({});const app=createApp({list:async()=>[]},{},auth,{push:service});
  const result=await request(app).post('/api/admin/push/subscribe').send(subscription());expect(result.status).toBe(role?403:401);
 }
});
