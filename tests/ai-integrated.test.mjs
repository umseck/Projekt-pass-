import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createAIHandler} from '../server/ai-api.mjs';
import {content} from '../server/validation.mjs';
import {areaBasis} from '../public/bath-model.mjs';
const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const company='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',otherCompany='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const pass='33333333-3333-4333-8333-333333333333',otherPass='44444444-4444-4444-8444-444444444444';
const env={APP_ORIGIN:'https://projekt-pass.pages.dev',SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'PUBLIC-TEST',SUPABASE_SECRET_KEY:'SERVER-TEST',GEMINI_API_KEY:'FAKE-TRANSPORT-TEST'};
let db,p,foreign,geminiCalls=0,providerStatus=200;
async function rpc(op,args={},user=actor){return (await db.query('select public.pp_api($1,$2::uuid,$3::jsonb) as result',[op,user,JSON.stringify(args)])).rows[0].result;}
async function ai(op,args={},user=actor){return (await db.query('select public.pp_ai($1,$2::uuid,$3::jsonb) as result',[op,user,JSON.stringify(args)])).rows[0].result;}
const handler=createAIHandler(async(url,options)=>{
 if(url.endsWith('/auth/v1/user'))return Response.json({id:options.headers.Authorization==='Bearer other'?other:actor});
 if(url.endsWith('/rpc/pp_ai')){const b=JSON.parse(options.body);try{return Response.json(await ai(b.op,b.args,b.actor));}catch(e){return Response.json({message:e.message},{status:400});}}
 if(url.startsWith('https://generativelanguage.googleapis.com/')){geminiCalls++;if(providerStatus!==200)return Response.json({error:'PROVIDER-PRIVATE-DETAIL'},{status:providerStatus});const b=JSON.parse(options.body),c=JSON.parse(b.contents[0].parts[0].text);assert.ok(!options.body.includes('PRIVATE-CUSTOMER'));return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({question:'',suggestions:[{type:'spares',area_ids:[c.areas[0].id],new_area:'',position:'walls',material_kind:'',values:{},text:'Zwei Kartons im Keller',file_index:-1,evidence:'SIMULATED fixture',uncertain:false}]})}]}}]});}
 throw Error('Unexpected upstream');
});
async function request(op,body={},cookie='owner',origin=env.APP_ORIGIN,settings=env){const r=await handler(new Request(env.APP_ORIGIN+'/api/ai/'+op,{method:'POST',headers:{origin,'Content-Type':'application/json',cookie:cookie?'__Host-pp_session='+cookie:''},body:JSON.stringify({project_id:p.id,...body})}),settings);return {status:r.status,body:await r.json()};}
before(async()=>{
 db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const file of ['schema','operator','workflow','communication','standards','ai'])await db.exec(await readFile('database/'+file+'.sql','utf8'));
 for(const [cid,uid,pid,t] of [[company,actor,pass,'a'.repeat(64)],[otherCompany,other,otherPass,'b'.repeat(64)]]){
  await db.query('insert into pp_private.companies(id,profile) values ($1,$2)',[cid,JSON.stringify({name:'Testbetrieb',trade:'tile',onboarding_complete:true})]);
  await db.query('insert into pp_private.members(user_id,company_id) values($1,$2)',[uid,cid]);
  await db.query('insert into pp_private.passes(id,company_id,number,token) values($1,$2,1,$3)',[pid,cid,t]);
 }
 await db.query('insert into pp_private.ai_access(actor) values($1)',[actor]);await db.exec('set role service_role');
 p=await rpc('activate',{pass_id:pass,title:'Fiktives Testbad'});foreign=await rpc('activate',{pass_id:otherPass,title:'Fremd'},other);
 p=await rpc('save',{id:p.id,version:p.version,title:p.title,internal:{address:'PRIVATE-CUSTOMER'},content:content({trade:'tile',tile:{name:'Bestehende Fliese'},substrate:'Bestand'})});
});
after(async()=>{await db.close();});
test('Integrated auth: session, CSRF, developer entitlement, project tenant and private tables',async()=>{
 assert.equal((await request('capability',{},'')).status,401);
 assert.equal((await request('capability',{},'owner','https://other.example')).status,403);
 assert.equal((await request('capability',{},'other')).status,403);
 assert.equal((await request('project',{project_id:foreign.id})).status,404);
 assert.equal((await request('capability')).status,200);
 for(const role of ['anon','authenticated']){await db.exec('reset role; set role '+role);await assert.rejects(()=>ai('capability'),/permission denied/);await assert.rejects(()=>db.query('select * from pp_private.ai_state'),/permission denied/);}
 await db.exec('reset role; set role service_role');assert.equal(geminiCalls,0);
});
test('Integrated existing project: original persists, duplicate safe, explicit accept reaches normal customer preview',async()=>{
 const before=await rpc('project',{id:p.id});const loaded=(await request('project')).body;assert.equal(loaded.content.areas[0].id,p.id);assert.equal(loaded.content.areas[0].products.tile.name,'Bestehende Fliese');
 const first=await request('submit',{text:'Zwei Kartons im Keller'});assert.equal(first.status,200);
 const duplicate=await request('submit',{text:'Zwei Kartons im Keller'});assert.equal(duplicate.body.input.id,first.body.input.id);assert.equal(duplicate.body.duplicate,true);
 assert.equal((await request('process',{input_id:first.body.input.id})).status,503);assert.equal(geminiCalls,0);
 const processed=await request('process',{input_id:first.body.input.id,free_project_confirmed:true});assert.equal(processed.status,200);assert.equal(processed.body.input.state,'review');assert.equal(geminiCalls,1);
 const accepted=await request('accept',{input_id:first.body.input.id,version:before.version,confirm:true,suggestions:processed.body.input.result.suggestions});assert.equal(accepted.status,200);
 const normal=await rpc('project',{id:p.id});assert.equal(normal.content.areas[0].spares,'Zwei Kartons im Keller');assert.equal(normal.internal.address,'PRIVATE-CUSTOMER');assert.equal(normal.content.tile.name,'Bestehende Fliese');
 const preview=await rpc('preview',{id:p.id});assert.equal(preview.content.areas[0].spares,'Zwei Kartons im Keller');assert.ok(!JSON.stringify(preview).includes('SIMULATED'));assert.ok(!JSON.stringify(preview).includes('PRIVATE-CUSTOMER'));
 const internal=await request('submit',{text:'INTERNAL-SECRET',internal:true});assert.equal((await request('process',{input_id:internal.body.input.id,free_project_confirmed:true})).status,403);assert.ok(!JSON.stringify(await rpc('preview',{id:p.id})).includes('INTERNAL-SECRET'));
 assert.equal((await rpc('project',{id:foreign.id},other)).title,'Fremd');
});
test('Integrated stale proposals, quota error, CAS and handed-over snapshot remain protected',async()=>{
 let current=await rpc('project',{id:p.id});let state=await ai('load',{project_id:p.id});
 const old=Object.values(state.state.inputs).find(i=>i.state==='accepted');old.state='review';old.base_version=current.version-1;
 await ai('commit',{project_id:p.id,version:state.version,state:state.state});
 assert.equal((await request('accept',{input_id:old.id,version:current.version,confirm:true,suggestions:old.result.suggestions})).status,409);
 state=await ai('load',{project_id:p.id});state.state.requests.forEach(r=>r.at='2026-01-01T00:00:00.000Z');await ai('commit',{project_id:p.id,version:state.version,state:state.state});
 await assert.rejects(()=>ai('commit',{project_id:p.id,version:state.version,state:state.state}),/PP_CONFLICT/);
 const input=(await request('submit',{text:'QUOTA-ORIGINAL'})).body.input;providerStatus=429;
 const result=await request('process',{input_id:input.id,free_project_confirmed:true});assert.equal(result.body.input.state,'error');assert.equal(result.body.input.text,'QUOTA-ORIGINAL');assert.match(result.body.input.error,/Kontingent/);assert.equal(geminiCalls,2);
 assert.equal((await request('process',{input_id:input.id,free_project_confirmed:true})).status,429);assert.equal(geminiCalls,2);
 current.content.areas.forEach(a=>a.confirmation=areaBasis(a));current=await rpc('save',{...current});await rpc('handover',{id:p.id,version:current.version});
 const snapshot=await rpc('scan',{token:'a'.repeat(64)},null);assert.equal((await request('submit',{text:'AFTER-HANDOVER'})).status,409);assert.deepEqual(await rpc('scan',{token:'a'.repeat(64)},null),snapshot);
});
