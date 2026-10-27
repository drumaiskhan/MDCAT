import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const req=createRequire(path.join(root,'backend/package.json'));
const temp=await mkdtemp(path.join(root,'.mdcat-auth-'));
Object.assign(process.env,{NODE_ENV:'development',DATABASE_URL:'postgresql://test:test@127.0.0.1/test',JWT_SECRET:'test-only-random-session-secret',LOCAL_DEMO_ACCOUNT:'1',LOCAL_STUDENT_EMAIL:'student@localhost.test',LOCAL_STUDENT_PASSWORD:'Test-student-only-123!',DEFAULT_ADMIN_EMAIL:'admin@localhost.test',DEFAULT_ADMIN_PASSWORD:'Test-admin-only-123!'});
await writeFile(path.join(temp,'db.ts'),`import {PGlite} from '@electric-sql/pglite';import {drizzle} from 'drizzle-orm/pglite';import * as schema from '${root}/backend/lib/db/src/schema/index.ts';export * from '${root}/backend/lib/db/src/schema/index.ts';export const pool=new PGlite();export const db=drizzle(pool,{schema});export {ensureSchema} from '${root}/backend/lib/db/src/ensureSchema.ts';`);
await writeFile(path.join(temp,'entry.ts'),`export {default as auth} from '${root}/backend/src/routes/auth.ts';export {attachUser} from '${root}/backend/src/middlewares/auth.ts';export {seedLocalStudent} from '${root}/backend/src/lib/seedLocalStudent.ts';export {seedDefaultAdmin} from '${root}/backend/src/lib/seedAdmin.ts';export {renderPageJpeg} from '${root}/backend/src/lib/bookReader.ts';export {pool} from './db.ts';`);
try {
 await build({entryPoints:[path.join(temp,'entry.ts')],outfile:path.join(temp,'test.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',banner:{js:"import {createRequire as cr} from 'node:module';const require=cr(import.meta.url);"},plugins:[{name:'database-only-adapter',setup(b){b.onResolve({filter:/^\.\/index$/},a=>a.importer.endsWith('/ensureSchema.ts')?{path:path.join(temp,'db.ts')}:undefined);b.onResolve({filter:/^@workspace\/db$/},()=>({path:path.join(temp,'db.ts')}));b.onResolve({filter:/^@workspace\//},a=>({path:req.resolve(a.path)}));b.onResolve({filter:/^[a-z@][^:]*$/},a=>{if(a.path.startsWith('node:'))return;try{return {path:req.resolve(a.path),external:true}}catch{return undefined}});}}]});
 const {auth,attachUser,seedLocalStudent,seedDefaultAdmin,renderPageJpeg,pool}=await import(pathToFileURL(path.join(temp,'test.mjs')).href);
 try {
 await pool.exec(await readFile(path.join(root,'backend/lib/db/ensure-schema.sql'),'utf8'));
 const pdfjs=await import(pathToFileURL(req.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
 const pdfTask=pdfjs.getDocument({data:Uint8Array.from(await readFile(path.join(root,'backend/tests/mdcat/fixtures/mcq-sample.pdf'))),verbosity:0});
 try { const pdf=await pdfTask.promise; const jpeg=await renderPageJpeg({key:'test',pdf,task:pdfTask,bytes:100,pageCount:pdf.numPages,sizes:null,lastUsed:Date.now()},1,480,null);assert.equal(jpeg[0],0xff);assert.equal(jpeg[1],0xd8);assert(jpeg.length>1000);console.log('PASS: actual secure PDF page renderer produces a JPEG using current PDF.js and native canvas.'); } finally {await pdfTask.destroy();}

 await seedDefaultAdmin(); await seedLocalStudent(); await seedLocalStudent();
 assert.equal((await pool.query('select count(*)::int as n from med_users')).rows[0].n,2);
 const app=express();app.use(express.json(),cookieParser(),attachUser,auth);
 for(const role of ['admin','student']){
 const login=await request(app).post('/auth/login').send({email:`${role}@localhost.test`,password:role==='admin'?process.env.DEFAULT_ADMIN_PASSWORD:process.env.LOCAL_STUDENT_PASSWORD}).expect(200);
 const cookie=login.headers['set-cookie'];assert.ok(cookie?.length,'session cookie returned');
 const me=await request(app).get('/auth/me').set('Cookie',cookie).expect(200);assert.equal(me.body.role,role);
 }
 await request(app).post('/auth/login').send({email:'student@localhost.test',password:'wrong'}).expect(401);
 await request(app).get('/auth/me').expect(401);
 process.env.NODE_ENV='production';process.env.LOCAL_STUDENT_EMAIL='never@localhost.test';await seedLocalStudent();
 assert.equal((await pool.query('select count(*)::int as n from med_users')).rows[0].n,2);
 console.log('PASS: genuine admin/student login, bcrypt, session cookies, authenticated identity, wrong password, signed-out rejection, idempotent local seed and production seed guard (PGlite database adapter only).');
 } finally {await pool.close();}
} finally {await rm(temp,{recursive:true,force:true});}
