import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createHandler,hash} from '../server/api.mjs';
import {validate,content} from '../server/validation.mjs';
let db;
const business='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222',next='33333333-3333-4333-8333-333333333333',stranger='44444444-4444-4444-8444-444444444444';
const company='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',pass='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',area='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
let project;
const originalToken='a'.repeat(64),inviteHash='b'.repeat(64),transferHash='c'.repeat(64),nextToken='d'.repeat(64);
async function rpc(op,args={},actor=owner){return (await db.query('select public.pp_customer($1,$2::uuid,$3::jsonb) as result',[op,actor,JSON.stringify(args)])).rows[0].result;}
before(async()=>{
 db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 for(const file of ['schema.sql','workflow.sql','operator.sql','customer-continuation.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 await db.query('insert into pp_private.companies(id,profile) values($1,$2)',[company,JSON.stringify({name:'Fiktiver Betrieb'})]);
 await db.query('insert into pp_private.members(user_id,company_id) values($1,$2)',[business,company]);
 await db.query('insert into pp_private.passes(id,company_id,number,token) values($1,$2,1,$3)',[pass,company,originalToken]);
 const activated=(await db.query("select public.pp_api('activate',$1::uuid,$2::jsonb) as result",[business,JSON.stringify({pass_id:pass,title:'Testbad'})])).rows[0].result;
 project=activated.id;
 await db.query('update pp_private.projects set content=$1 where id=$2',[JSON.stringify({areas:[{id:area,name:'Duschwand',trade:'tile',products:{tile:{name:'Testfliese'}}}]}),project]);
 await db.query("select public.pp_api('handover',$1::uuid,$2::jsonb)",[business,JSON.stringify({id:project,version:1})]);
 await db.exec('set role service_role');
});
after(async()=>{await db.close();});
test('new customer tables and RPC remain closed to browser roles',async()=>{
 await db.exec('reset role');
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>rpc('customer_bootstrap'),/permission denied/);await assert.rejects(()=>db.query('select * from pp_private.customer_events'),/permission denied/);await db.exec('reset role');}
 const rows=(await db.query("select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='pp_private' and c.relname like 'customer_%' and c.relkind='r'")).rows;
 assert.equal(rows.length,3);assert.ok(rows.every(r=>r.relrowsecurity));await db.exec('set role service_role');
});
test('invitation binds identity, expires, is single use; owner events never alter original or public scan',async()=>{
 await assert.rejects(()=>rpc('customer_invite',{id:project,email:'owner@example.test',token_hash:inviteHash},stranger),/PP_FORBIDDEN/);
 await rpc('customer_invite',{id:project,email:'owner@example.test',token_hash:inviteHash},business);
 const info=await rpc('customer_access_info',{token_hash:inviteHash},null);assert.equal(info.email,'owner@example.test');assert.equal(info.transfer,false);
 await assert.rejects(()=>rpc('customer_access_redeem',{token_hash:inviteHash,email:'other@example.test'},owner),/PP_FORBIDDEN/);
 await rpc('customer_access_begin',{token_hash:inviteHash},null);
 await rpc('customer_access_redeem',{token_hash:inviteHash,email:'owner@example.test'},owner);
 await assert.rejects(()=>rpc('customer_access_redeem',{token_hash:inviteHash,email:'owner@example.test'},owner),/PP_INVITE_INVALID/);
 await assert.rejects(()=>rpc('customer_project',{id:project},stranger),/PP_FORBIDDEN/);
 const bootstrap=await rpc('customer_bootstrap');assert.equal(bootstrap.role,'customer');assert.equal(bootstrap.projects[0].id,project);
 const before=await rpc('customer_project',{id:project});
 const event=validate('customer_add',{id:project,event:{id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',kind:'maintenance',area_id:area,occurred_on:'2026-01-01',description:'Fiktiver Wartungsnachweis',company:'Anderer Betrieb',effect:'evidence',author_label:'Forged',recorded_at:'1900-01-01'}}).event;
 const after=await rpc('customer_add',{id:project,event});assert.equal(after.additions.length,1);assert.equal(after.additions[0].author_label,'owner@example.test');assert.equal(after.additions[0].author_id,owner);assert.notEqual(after.additions[0].recorded_at,'1900-01-01');assert.deepEqual(after.handover_snapshot,before.handover_snapshot);
 assert.equal((await rpc('customer_add',{id:project,event})).additions.length,1);
 await assert.rejects(()=>rpc('customer_add',{id:project,event:{...event,description:'changed'}}),/PP_CONFLICT/);
 await assert.rejects(()=>rpc('customer_add',{id:project,event:{...event,id:stranger,area_id:stranger}}),/PP_INVALID_AREA/);
 const scan=(await db.query("select public.pp_api('scan',null,$1::jsonb) as result",[JSON.stringify({token:originalToken})])).rows[0].result;
 assert.equal(scan.additions,undefined);assert.equal(scan.content.areas[0].products.tile.name,'Testfliese');
 await assert.rejects(()=>db.query("update pp_private.projects set content='{}' where id=$1",[project]),/PP_HANDOVER_LOCKED/);
 const businessRead=await rpc('customer_project',{id:project},business);assert.equal(businessRead.permissions.can_add,false);assert.equal(businessRead.additions.length,1);
 await assert.rejects(()=>rpc('customer_add',{id:project,event:{...event,id:stranger}},business),/PP_FORBIDDEN/);
});
test('transfer leaves current owner active until accept, then revokes owner and old capability',async()=>{
 await assert.rejects(()=>rpc('customer_invite',{id:project,email:'other@example.test',token_hash:transferHash},business),/PP_ALREADY_OWNER/);
 await rpc('customer_transfer',{id:project,email:'new@example.test',token_hash:transferHash});assert.equal((await rpc('customer_project',{id:project})).permissions.can_add,true);
 await rpc('customer_access_redeem',{token_hash:transferHash,email:'new@example.test',pass_token:nextToken},next);
 await assert.rejects(()=>rpc('customer_project',{id:project},owner),/PP_FORBIDDEN/);await assert.rejects(()=>rpc('customer_bootstrap',{},owner),/PP_FORBIDDEN/);
 const newProject=await rpc('customer_project',{id:project},next);assert.equal(newProject.token,nextToken);assert.equal(newProject.additions.length,1);assert.equal(newProject.current_owner_email,'new@example.test');
 await assert.rejects(()=>db.query("select public.pp_api('scan',null,$1::jsonb)",[JSON.stringify({token:originalToken})]),/PP_NOT_FOUND/);
 assert.ok((await db.query("select public.pp_api('scan',null,$1::jsonb) as result",[JSON.stringify({token:nextToken})])).rows[0].result);
});
test('invitation rate limit and replacement cannot reopen revoked authority',async()=>{
 await rpc('customer_transfer',{id:project,email:'third@example.test',token_hash:'e'.repeat(64)},next);
 for(let i=0;i<5;i++)await rpc('customer_access_begin',{token_hash:'e'.repeat(64)},null);
 await assert.rejects(()=>rpc('customer_access_begin',{token_hash:'e'.repeat(64)},null),/PP_RATE_LIMIT/);
 await rpc('customer_transfer',{id:project,email:'fourth@example.test',token_hash:'f'.repeat(64)},next);
 await assert.rejects(()=>rpc('customer_access_info',{token_hash:'e'.repeat(64)},null),/PP_INVITE_INVALID/);
});
const origin='https://projektpass.example';const env={APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_TEST_ONLY',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_TEST_ONLY'};
const req=(op,body={},cookie='')=>new Request(origin+'/api/'+op,{method:'POST',headers:{origin,'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
const json=(v,status=200)=>new Response(JSON.stringify(v),{status});
test('customer API authenticates independently, hashes invitations and derives author',async()=>{
 const calls=[];const handle=createHandler(async(url,options)=>{const body=options.body?JSON.parse(options.body):{};calls.push({url,body});if(url.endsWith('/user'))return json({id:owner});if(url.includes('/token'))return json({access_token:'TEST-JWT',user:{id:owner}});if(url.endsWith('/pp_control'))return json({message:'PP_FORBIDDEN'},400);return json({role:'customer',projects:[],additions:[]});});
 const logged=await handle(req('login',{email:'owner@example.test',password:'test'}),env);assert.equal(logged.status,200);assert.equal((await logged.json()).role,'customer');assert.match(logged.headers.get('set-cookie'),/HttpOnly/);
 const invited=await handle(req('customer_transfer',{id:company,email:'new@example.test',token_hash:'FORGED'},'__Host-pp_session=TEST'),env);assert.equal(invited.status,200);const reply=await invited.json();assert.match(reply.link,/#customer-access\/[a-f0-9]{64}$/);const token=reply.link.split('/').pop();const call=calls.at(-1);assert.equal(call.body.args.token_hash,await hash(token));assert.equal(call.body.actor,owner);assert.equal(call.body.args.token,undefined);
 const event={kind:'repair',area_id:area,occurred_on:'2026-01-01',description:'Repair',effect:'replaced',material_role:'silicone',author_id:stranger};const added=await handle(req('customer_add',{id:company,event},'__Host-pp_session=TEST'),env);assert.equal(added.status,200);assert.equal(calls.at(-1).body.args.event.author_id,undefined);assert.equal(calls.at(-1).body.actor,owner);
 assert.equal((await handle(req('customer_access_redeem',{token:'a'.repeat(64)}),env)).status,404);
 assert.equal((await handle(req('customer_project',{id:company}),env)).status,401);
});
test('metadata/status and customer event validation preserve allowed data and reject invalid dates',()=>{
 const c=content({trade:'tile',project:{object_label:'Gästebad',completed_on:'2026-09-01',scope:'Fliesenarbeiten'},areas:[{id:area,name:'Wand',position:'walls',trade:'tile',scope:'other',scope_company:'Fiktiver Fremdbetrieb',roles_status:{tile:'unknown'},status_notes:{tile:'Bestand'},products:{}}]});assert.equal(c.project.object_label,'Gästebad');assert.equal(c.areas[0].roles_status.tile,'unknown');assert.equal(c.areas[0].scope,'other');assert.equal(c.areas[0].scope_company,'Fiktiver Fremdbetrieb');
 assert.throws(()=>content({project:{completed_on:'2026-02-30'}}));assert.throws(()=>validate('customer_add',{id:company,event:{kind:'change',area_id:area,occurred_on:'2026-02-30',description:'x'}}));assert.throws(()=>validate('customer_add',{id:company,event:{kind:'change',area_id:area,occurred_on:'2026-01-01',description:'x',effect:'replaced'}}));
});
test('expired customer invitation is denied before Auth account creation',async()=>{
 const calls=[];const handle=createHandler(async(url,options)=>{calls.push(url);return json({message:'PP_INVITE_INVALID'},400);});
 const response=await handle(req('customer_access_activate',{token:'a'.repeat(64),password:'a-long-test-password'}),env);assert.equal(response.status,410);assert.equal(calls.length,1);assert.ok(calls[0].endsWith('/pp_customer'));
});
test('customer activation binds invite email, does not reset existing password and issues customer session',async()=>{
 const calls=[];const handle=createHandler(async(url,options)=>{
  const body=options.body?JSON.parse(options.body):{};calls.push({url,body});
  if(url.endsWith('/pp_customer')){
   if(body.op==='customer_access_begin')return json({email:'owner@example.test'});
   if(body.op==='customer_access_redeem')return json({project_id:company});
   return json({role:'customer',projects:[{id:company,title:'Bad'}]});
  }
  if(url.includes('/admin/users'))return json({code:'email_exists'},422);
  if(url.includes('/token'))return json({access_token:'customer-jwt',expires_in:3600,user:{id:owner,email:'owner@example.test'}});
  throw Error('Unexpected request');
 });
 const activated=await handle(req('customer_access_activate',{token:'a'.repeat(64),password:'a-long-test-password',email:'forged@example.test'}),env);assert.equal(activated.status,200);assert.equal((await activated.json()).role,'customer');assert.match(activated.headers.get('set-cookie'),/HttpOnly/);
 const auth=calls.find(c=>c.url.includes('/token'));assert.equal(auth.body.email,'owner@example.test');assert.equal(auth.body.password,'a-long-test-password');
 const redeemed=calls.find(c=>c.body.op==='customer_access_redeem');assert.equal(redeemed.body.actor,owner);assert.equal(redeemed.body.args.email,'owner@example.test');assert.match(redeemed.body.args.pass_token,/^[a-f0-9]{64}$/);assert.ok(!calls.some(c=>c.url.includes('/admin/users/')||c.body?.password_reset));
});
test('release API enforces required metadata and explicit gap acknowledgment',async()=>{
 const projected={id:company,title:'Testbad',content:{project:{object_label:'',completed_on:'',scope:''},areas:[]}};let releaseCalls=0;
 const handle=createHandler(async(url,options)=>{if(url.endsWith('/user'))return json({id:business});const b=JSON.parse(options.body);if(b.op==='handover')releaseCalls++;return json(projected);});
 assert.equal((await handle(req('handover',{id:company,version:1},'__Host-pp_session=TEST'),env)).status,400);assert.equal(releaseCalls,0);
 projected.content.project={object_label:'Gästebad',completed_on:'2026-01-01',scope:'Wände'};projected.content.areas=[{id:area,name:'Wand',position:'walls',trade:'tile',scope:'own',roles_status:{tile:'unknown'},products:{},care:{}}];
 assert.equal((await handle(req('handover',{id:company,version:1},'__Host-pp_session=TEST'),env)).status,400);assert.equal(releaseCalls,0);
});
test('handed-over originals cannot be deleted through the legacy business RPC',async()=>{
 await assert.rejects(()=>db.query("select public.pp_api('delete',$1::uuid,$2::jsonb)",[business,JSON.stringify({id:project,version:2})]),/PP_HANDOVER_LOCKED/);
 assert.equal((await rpc('customer_project',{id:project},next)).title,'Testbad');
 const snapshot=await db.query('select handover_snapshot from pp_private.projects where id=$1',[project]);assert.ok(snapshot.rows[0].handover_snapshot);
});
test('photo and document addition kinds require their actual attachments',()=>{
 const base={kind:'photo',area_id:area,occurred_on:'2026-01-01',description:'Added photo'};
 assert.throws(()=>validate('customer_add',{id:company,event:base}),/mindestens ein Foto/);
 assert.throws(()=>validate('customer_add',{id:company,event:{...base,kind:'document'}}),/mindestens eine Unterlage/);
 assert.throws(()=>validate('customer_add',{id:company,event:{...base,kind:'document',documents:[{name:'Empty'}]}}),/Datei oder Link/);
 assert.equal(validate('customer_add',{id:company,event:{...base,photos:['data:image/jpeg;base64,/9j/AA==']}}).event.photos.length,1);
});
test('serialized invite replacement/consumption preserves exactly one current owner',async()=>{
 const token_hash='9'.repeat(64);await rpc('customer_transfer',{id:project,email:'race@example.test',token_hash},next);
 const requests=await Promise.allSettled([rpc('customer_access_redeem',{token_hash,email:'race@example.test',pass_token:'7'.repeat(64)},stranger),rpc('customer_access_redeem',{token_hash,email:'race@example.test',pass_token:'8'.repeat(64)},business)]);
 assert.equal(requests.filter(r=>r.status==='fulfilled').length,1);assert.equal(requests.filter(r=>r.status==='rejected').length,1);
 const members=(await db.query('select user_id from pp_private.customer_members where project_id=$1 and revoked_at is null',[project])).rows;assert.equal(members.length,1);
 await assert.rejects(()=>rpc('customer_project',{id:project},next),/PP_FORBIDDEN/);
 const current=members[0].user_id;await rpc('customer_transfer',{id:project,email:'expired@example.test',token_hash:'6'.repeat(64)},current);
 await db.query("update pp_private.customer_invites set expires_at=now()-interval '1 minute' where project_id=$1",[project]);
 await assert.rejects(()=>rpc('customer_access_info',{token_hash:'6'.repeat(64)},null),/PP_INVITE_INVALID/);
});
