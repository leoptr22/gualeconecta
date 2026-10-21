// @vitest-environment node
import { it,expect } from 'vitest';
import { mkdtempSync,existsSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRepository } from './repository.js';
import { cleanupExpired } from './publication-cleanup.js';
import { isActive } from './domain.js';

it('assigns exactly 24 hours at approval and does not extend on repeated approval',async()=>{
 const repo=createRepository({DATABASE_PATH:':memory:'});
 try {
  await repo.create({id:'test',status:'pending',createdAt:'2026-01-01T00:00:00Z',endsAt:'2099-01-01'});
  expect((await repo.list())[0].expiresAt).toBeUndefined();
  const approved=await repo.approve('test');expect(Date.parse(approved.expiresAt)-Date.parse(approved.approvedAt)).toBe(86400000);
  expect((await repo.approve('test')).expiresAt).toBe(approved.expiresAt);
  expect(isActive(approved,new Date(Date.parse(approved.expiresAt)-1))).toBe(true);
  expect(isActive(approved,new Date(approved.expiresAt))).toBe(false);
 }finally{repo.close();}
});
it('removes expired records and attachments while preserving pending and live content',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'guale-expiry-'));const repo=createRepository({DATABASE_PATH:':memory:'});
 const expiredName='11111111-1111-4111-8111-111111111111.webp';const liveName='22222222-2222-4222-8222-222222222222.mp4';
 try {
  writeFileSync(join(directory,expiredName),'test-only');writeFileSync(join(directory,liveName),'test-only');
  await repo.create({id:'expired',status:'approved',createdAt:'2026-01-01T00:00:00Z',expiresAt:'2026-01-02T00:00:00Z',media:[{url:'/api/media/'+expiredName},{url:'/api/media/../../outside'}]});
  await repo.create({id:'live',status:'approved',createdAt:'2026-01-01T00:00:00Z',expiresAt:'2026-01-03T00:00:00Z',media:[{url:'/api/media/'+liveName}]});
  await repo.create({id:'pending',status:'pending',createdAt:'2020-01-01T00:00:00Z'});
  expect(await cleanupExpired(repo,directory,new Date('2026-01-02T00:00:00Z'))).toBe(1);
  expect(existsSync(join(directory,expiredName))).toBe(false);expect(existsSync(join(directory,liveName))).toBe(true);
  expect((await repo.list()).map(item=>item.id).sort()).toEqual(['live','pending']);
  expect(await cleanupExpired(repo,directory,new Date('2026-01-02T00:00:00Z'))).toBe(0);
 }finally{repo.close();rmSync(directory,{recursive:true,force:true});}
});
it('keeps the expiry after restarting, including the adoption window for existing approved items',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'guale-expiry-persistence-'));const env={DATABASE_PATH:join(directory,'test.sqlite')};let repo=createRepository(env);
 try {
  await repo.create({id:'legacy',status:'approved',createdAt:'2026-01-01T00:00:00Z'});repo.close();repo=createRepository(env);
  const item=(await repo.list())[0];expect(Date.parse(item.expiresAt)-Date.parse(item.approvedAt)).toBe(86400000);
  repo.close();repo=createRepository(env);expect((await repo.list())[0].expiresAt).toBe(item.expiresAt);
 }finally{repo.close();rmSync(directory,{recursive:true,force:true});}
});
