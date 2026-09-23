import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
let db;
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const ca='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',cb='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const pa='33333333-3333-4333-8333-333333333333',pb='44444444-4444-4444-8444-444444444444',token='a'.repeat(64);
async function rpc(op,args={},actor=a){return (await db.query('select public.pp_api($1,$2::uuid,$3::jsonb) as result',[op,actor,JSON.stringify(args)])).rows[0].result;}
before(async()=>{
 db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(await readFile(new URL('../database/schema.sql',import.meta.url),'utf8'));
 for(const [cid,uid,pid,t] of [[ca,a,pa,token],[cb,b,pb,'b'.repeat(64)]]){
  await db.query('insert into pp_private.companies(id,profile) values ($1,$2)',[cid,JSON.stringify({name:'Betrieb',care_notes:{tile:'Vom Betrieb'},favorites:{tile:[]}})]);
  await db.query('insert into pp_private.members(user_id,company_id) values($1,$2)',[uid,cid]);
  await db.query('insert into pp_private.passes(id,company_id,number,token) values($1,$2,1,$3)',[pid,cid,t]);
 }
});
after(async()=>{await db.close();});
test('anonymous and authenticated roles cannot access tables or RPC; all tables have RLS',async()=>{
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);await assert.rejects(()=>rpc('bootstrap'),/permission denied/);
  await assert.rejects(()=>db.query('select * from pp_private.projects'),/permission denied/);await db.exec('reset role');
 }
 const {rows}=await db.query("select relname,relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='pp_private' and relkind='r'");
 assert.equal(rows.length,4);assert.ok(rows.every(r=>r.relrowsecurity));
});
test('business flow, privacy, owner control, stale writes and pass retirement',async()=>{
 await db.exec('set role service_role');
 await assert.rejects(()=>rpc('bootstrap',{},null),/PP_UNAUTHORIZED/);
 assert.equal((await rpc('bootstrap')).passes.length,1);
 await assert.rejects(()=>rpc('activate',{pass_id:pb,title:'Fremdes Bad'}),/PP_NOT_FOUND/);
 let p=await rpc('activate',{pass_id:pa,title:'Bad Maier'});const id=p.id;
 assert.equal(p.content.care_notes.tile,'Vom Betrieb');assert.ok(p.activated_at);assert.equal(p.owner_key_hash,undefined);
 assert.equal((await rpc('activate',{pass_id:pa,title:'Doppelklick'})).id,id);
 await assert.rejects(()=>rpc('scan',{token},null),/PP_NOT_FOUND/);
 await assert.rejects(()=>rpc('project',{id},b),/PP_NOT_FOUND/);
 p=await rpc('save',{id,version:p.version,title:'Bad Maier',content:{tile:{name:'Limestone'},grout:{color:'Basalt'}},internal:{customer_name:'Geheim',address:'Privatstraße 17'}});
 await assert.rejects(()=>rpc('save',{id,version:1,title:'Alt',content:{},internal:{}}),/PP_CONFLICT/);
 const preview=await rpc('preview',{id});assert.equal(preview.version,p.version);assert.equal(preview.internal,undefined);
 p=await rpc('handover',{id,version:p.version});let pub=await rpc('scan',{token},null);
 assert.equal(pub.content.grout.color,'Basalt');assert.ok(!JSON.stringify(pub).includes('Privatstraße'));assert.equal(pub.token,undefined);assert.equal(pub.company.favorites,undefined);
 await db.query('update pp_private.companies set profile=$1 where id=$2',[JSON.stringify({name:'Betrieb neu',phone:'123',favorites:{tile:[]}}),ca]);
 pub=await rpc('scan',{token},null);assert.equal(pub.company.name,'Betrieb neu');assert.equal(pub.company.phone,'123');
 p=await rpc('owner_key',{id,version:p.version,key_hash:'c'.repeat(64)});
 await assert.rejects(()=>rpc('owner_save',{token,key_hash:'d'.repeat(64),version:1,additions:[]},null),/PP_FORBIDDEN/);
 pub=await rpc('owner_save',{token,key_hash:'c'.repeat(64),version:1,additions:[{type:'Sanitär',products:[{name:'Grohe Armatur'}]}],content:{tile:{name:'Manipuliert'}}},null);
 assert.equal(pub.content.tile.name,'Limestone');assert.equal(pub.owner_additions[0].products[0].name,'Grohe Armatur');
 await assert.rejects(()=>rpc('owner_save',{token,key_hash:'c'.repeat(64),version:1,additions:[]},null),/PP_CONFLICT/);
 p=await rpc('owner_key',{id,version:p.version,key_hash:'e'.repeat(64)});
 await assert.rejects(()=>rpc('owner_save',{token,key_hash:'c'.repeat(64),version:2,additions:[]},null),/PP_FORBIDDEN/);
 p=await rpc('visibility',{id,version:p.version,disabled:true});await assert.rejects(()=>rpc('scan',{token},null),/PP_NOT_FOUND/);
 p=await rpc('visibility',{id,version:p.version,disabled:false});assert.ok(await rpc('scan',{token},null));
 await assert.rejects(()=>rpc('delete',{id,version:p.version},b),/PP_NOT_FOUND/);
 await rpc('delete',{id,version:p.version});await assert.rejects(()=>rpc('scan',{token},null),/PP_NOT_FOUND/);
 await assert.rejects(()=>rpc('activate',{pass_id:pa,title:'Nächstes Bad'}),/PP_NOT_FOUND/);
 const d=await rpc('bootstrap');assert.equal(d.projects.length,0);assert.equal(d.passes[0].disabled,true);await db.exec('reset role');
});
