import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProductionHandler} from '../server/entry.mjs';
import {createAutosave} from '../public/autosave.mjs';
import {fixture,confirmFixture,actor} from '../scripts/qa/fixtures.mjs';
const origin='https://projectpass.test',id='33333333-3333-4333-8333-333333333333';
const env={APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'TEST',SUPABASE_PUBLISHABLE_KEY:'TEST'};
const req=(body={id,version:1},headers={})=>new Request(origin+'/api/handover',{method:'POST',headers:{origin,'Content-Type':'application/json',cookie:'__Host-pp_session=TEST',...headers},body:JSON.stringify(body)});
test('Production entry denies legacy blanket handover, tenant/anonymous access and stale writes',async()=>{
 let current={id,version:1,content:{tile:{name:'PLANNED'}}},calls=[],forbidden=false;
 const handle=createProductionHandler(async(url,opts)=>{if(url.endsWith('/user'))return Response.json({id:actor});const b=JSON.parse(opts.body);calls.push(b.op);if(forbidden)return Response.json({message:'PP_NOT_FOUND'},{status:400});return Response.json(b.op==='project'?current:{id});});
 assert.equal((await handle(req(),env)).status,409);assert.ok(!calls.includes('handover'));
 assert.equal((await handle(req(undefined,{cookie:''}),env)).status,401);
 forbidden=true;assert.equal((await handle(req(),env)).status,404);forbidden=false;
 assert.equal((await handle(req(undefined,{origin:'https://evil.test'}),env)).status,403);
 current={id,version:2,content:confirmFixture(fixture())};assert.equal((await handle(req(),env)).status,409);
 assert.equal((await handle(req({id,version:2}),env)).status,200);assert.equal(calls.at(-1),'handover');
 const entry=await readFile(new URL('../functions/api/[[path]].js',import.meta.url),'utf8');assert.match(entry,/server\/entry\.mjs/);
});
test('New production releases reject legacy area confirmations but keep existing scan readable',async()=>{
 const c=fixture();delete c.areas[0].records;
 const handle=createProductionHandler(async(url,opts)=>url.endsWith('/user')?Response.json({id:actor}):Response.json({id,version:1,content:c}));
 assert.equal((await handle(req(),env)).status,409);
 const scan=new Request(origin+'/api/scan',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({token:'a'.repeat(64)})});
 assert.equal((await handle(scan,env)).status,200);
});
test('Production catch-all aliases cannot bypass the handover gate; draft preview redacts global plans',async()=>{
 let releases=0;const p={id,version:1,content:{tile:{manufacturer:'TEST',name:'PLANNED_SENTINEL'},care_notes:{tile:'UNCONFIRMED_CARE'}}};
 const handle=createProductionHandler(async(url,opts)=>{if(url.endsWith('/user'))return Response.json({id:actor});const b=JSON.parse(opts.body);if(b.op==='handover')releases++;return Response.json(p);});
 for(const route of ['/api/handover','/api/other/handover','/api//handover']){const source=req();assert.equal((await handle(new Request(origin+route,source),env)).status,409);}
 assert.equal(releases,0);
 const response=await handle(new Request(origin+'/api/preview',{method:'POST',headers:{origin,'Content-Type':'application/json',cookie:'__Host-pp_session=TEST'},body:JSON.stringify({id})}),env);
 assert.equal(response.status,200);const result=await response.json();assert.ok(!JSON.stringify(result).includes('PLANNED_SENTINEL'));assert.ok(!JSON.stringify(result).includes('UNCONFIRMED_CARE'));
});
test('initial derived areas are written before saved is announced, without duplicate writes',async()=>{
 const derived={areas:[{name:'Migrated area',records:{status:'planned'}}]},events=[];let writes=0;
 const saver=createAutosave({delay:10000,read:()=>derived,write:async()=>{writes++;events.push('write');},onState:s=>events.push(s)});
 try{saver.changed();await saver.flush();assert.equal(writes,1);assert.ok(events.indexOf('write')<events.indexOf('saved'));await saver.flush();assert.equal(writes,1);}finally{saver.dispose();}
});
