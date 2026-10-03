import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../server/api.mjs';
import {validate,company,content} from '../server/validation.mjs';
import {labelPhoto} from '../public/js/core/ui.mjs';
const origin='https://projektpass.example',id='11111111-1111-4111-8111-111111111111';
const env={APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_TEST_ONLY',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_TEST_ONLY'};
const request=(op,body={},extra={})=>new Request(origin+'/api/'+op,{method:'POST',headers:{origin,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
test('CSRF, method and configuration gates reject before upstream access',async()=>{
 let calls=0;const handle=createHandler(()=>{calls++;throw Error();});
 assert.equal((await handle(request('bootstrap',{}, {origin:'https://evil.example'}),env)).status,403);
 assert.equal((await handle(new Request(origin+'/api/scan'),env)).status,405);
 assert.equal((await handle(request('scan'),{})).status,403);assert.equal(calls,0);
});
test('login checks membership; HttpOnly cookie; no browser keys; preserves password',async()=>{
 const calls=[];const handle=createHandler(async(url,options)=>{calls.push([url,options]);if(url.includes('/token'))return json({access_token:'test-jwt',expires_in:3600,user:{id}});return json({company:{name:'Betrieb'},passes:[],projects:[]});});
 const r=await handle(request('login',{email:'a@b.test',password:' password with spaces '}),env);
 assert.equal(r.status,200);assert.match(r.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Strict; Path=\//);assert.ok(!JSON.stringify(await r.json()).includes('test-jwt'));
 assert.equal(JSON.parse(calls[0][1].body).password,' password with spaces ');assert.equal(JSON.parse(calls[1][1].body).actor,id);
});
test('scan is anonymous; authenticated actor cannot be forged',async()=>{
 const calls=[];const handle=createHandler(async(url,options)=>{calls.push([url,options]);return url.endsWith('/user')?json({id}):json({title:'Bad'});});
 const scan=await handle(request('scan',{token:'a'.repeat(64),actor:'attacker'}),env);
 assert.equal(scan.status,200);assert.equal(JSON.parse(calls[0][1].body).actor,null);assert.equal(scan.headers.get('Cache-Control'),'no-store, private');
 const r=await handle(request('bootstrap',{actor:'attacker'},{cookie:'__Host-pp_session=valid'}),env);
 assert.equal(r.status,200);assert.equal(JSON.parse(calls[2][1].body).actor,id);
});
test('expired sessions and nonmembers are denied',async()=>{
 let handle=createHandler(async()=>json({error:'expired'},401));assert.equal((await handle(request('bootstrap',{}, {cookie:'__Host-pp_session=expired'}),env)).status,401);
 handle=createHandler(async url=>url.includes('/token')?json({access_token:'jwt',user:{id}}):json({message:'PP_FORBIDDEN'},400));
 const r=await handle(request('login',{email:'a@b.test',password:'pw'}),env);assert.equal(r.status,403);assert.equal(r.headers.get('Set-Cookie'),null);
});
test('removed customer-edit, AI and journal operations never reach Supabase',async()=>{
 const calls=[];const handle=createHandler(async(url,options)=>{calls.push(options);return json({});});
 for(const op of ['owner_key','owner_save','ai_status','ai_process','flow_get','flow_post','flow_participant','flow_dispatch']){
  assert.equal((await handle(request(op,{id,version:1}),env)).status,404);
 }
 assert.equal(calls.length,0);
});
test('new businesses and pass batches receive server-generated unique pass keys',async()=>{
 const calls=[];const handle=createHandler(async(url,options)=>{
  if(url.endsWith('/user'))return json({id});
  calls.push({url,body:JSON.parse(options.body)});return json({});
 });
 for(const [op,body,count] of [['operator_create',{id,profile:{name:'Testbetrieb'},tokens:['forged']},20],['passes_add',{id,quantity:3,tokens:['forged']},3]]){
  assert.equal((await handle(request(op,body,{cookie:'__Host-pp_session=valid'}),env)).status,200);
  const call=calls.at(-1);assert.ok(call.url.endsWith('/pp_control'));assert.equal(call.body.actor,id);
  assert.equal(call.body.args.tokens.length,count);assert.equal(new Set(call.body.args.tokens).size,count);
  assert.ok(call.body.args.tokens.every(token=>/^[a-f0-9]{64}$/.test(token)));
 }
});
test('legacy owner data never leaves the MVP server in project, preview or scan responses',async()=>{
 const handle=createHandler(async url=>url.endsWith('/user')?json({id}):json({title:'Bad',owner_additions:[{note:'LEGACY-PRIVATE'}],owner_version:3,owner_key_hash:'SECRET'}));
 for(const op of ['project','preview','scan']){
  const r=await handle(request(op,op==='scan'?{token:'a'.repeat(64)}:{id},{cookie:'__Host-pp_session=valid'}),env);
  assert.equal(r.status,200);assert.deepEqual(await r.json(),{title:'Bad'});
 }
});
test('validation drops forged fields and rejects unsafe links/photos',()=>{
 assert.deepEqual(company({name:'Test',preferred_manufacturers:[' EPI ','Murface','EPI']}).preferred_manufacturers,['EPI','Murface']);
 assert.throws(()=>company({name:'Test',preferred_manufacturers:['x'.repeat(101)]}));
 const v=content({tile:{name:'Stein',internal_price:99},internal_address:'Geheim',photos:[],care_notes:{}});
 assert.equal(v.internal_address,undefined);assert.equal(v.tile.internal_price,undefined);
 assert.throws(()=>content({photos:['https://tracking.example/a.jpg']}));assert.throws(()=>content({documents:[{url:'javascript:alert(1)'}]}));
 assert.throws(()=>company({name:'Test',logo:'data:image/svg+xml,evil'}));
 assert.equal(company({name:'Test',logo:'data:image/png;base64,iVBORw0KGgo='}).logo.startsWith('data:image/png'),true);
 assert.equal(labelPhoto('data:image/png;base64,iVBORw0KGgo=').startsWith('data:image/png'),true);
 assert.throws(()=>validate('save',{id,version:1,title:' ',content:{},internal:{}}));assert.throws(()=>validate('save',{id,version:0,title:'Bad'}));
});
test('upstream errors hide database details',async()=>{
 const handle=createHandler(async()=>json({message:'SQL sensitive secret'},500));const r=await handle(request('scan',{token:'a'.repeat(64)}),env);
 assert.equal(r.status,502);assert.ok(!(await r.text()).includes('SQL sensitive'));
});
