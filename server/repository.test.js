// @vitest-environment node
import { describe,it,expect } from 'vitest';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRepository } from './repository.js';
describe('Persistencia SQLite',()=>{
 it('inicia vacío y conserva contenido y aprobación al reabrir la base',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'guale-persistence-'));
  const env={STORAGE:'sqlite',DATABASE_PATH:join(directory,'publicaciones.sqlite')};
  let repository=createRepository(env);
  try{
   expect(await repository.list()).toEqual([]);
   await repository.create({id:'persistence-test',title:'Contenido de prueba aislado',status:'pending',createdAt:new Date().toISOString(),contact:'test@example.com'});
   repository.close();repository=createRepository(env);
   expect((await repository.list())[0].status).toBe('pending');
   expect(await repository.approve('missing')).toBeUndefined();
   await repository.approve('persistence-test');
   repository.close();repository=createRepository(env);
   expect((await repository.list())[0]).toMatchObject({id:'persistence-test',status:'approved',contact:'test@example.com'});
  }finally{repository.close();rmSync(directory,{recursive:true,force:true});}
 });
 it('no cae silenciosamente a otro almacenamiento ante configuración incorrecta',()=>{
  expect(()=>createRepository({STORAGE:'sheets'})).toThrow('Falta configurar');
  expect(()=>createRepository({STORAGE:'desconocido'})).toThrow('STORAGE debe ser');
 });
});
