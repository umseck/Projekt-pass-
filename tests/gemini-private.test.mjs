import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {FileStore,createTestService,cleanInput} from '../server/private-test-store.mjs';
import {createPrivateServer,passwordHash} from '../server/private-test-http.mjs';
import {callGemini,cleanSuggestions,SYSTEM,DEFAULT_MODEL} from '../server/gemini.mjs';
import {areaBasis,materialBasis} from '../public/bath-model.mjs';
import {offlineHTML} from '../public/bath-customer.mjs';
const env={PP_AI_ENABLED:'true',PP_FREE_PROJECT_CONFIRMED:'true',GEMINI_API_KEY:'FAKE-FOR-AUTOMATED-TRANSPORT-TEST'};
const suggestion=(a,name,extra={})=>({type:'material',area_ids:[a.id],new_area:'',position:a.position,material_kind:'tile',values:{manufacturer:'Testhersteller',name,color:'',article_number:'',batch:'',format:''},text:'',file_index:-1,evidence:'Testfixture – keine echte Gemini-Erkennung',uncertain:false,...extra});
async function fixture(fetcher){const dir=await mkdtemp(join(tmpdir(),'projektpass-ai-test-')),store=new FileStore(dir);await store.init();const api=createTestService(store,env,{fetcher});const p=await api('create',{title:'Fiktives Testbad',trade:'tile'});return {dir,store,api,p};}
async function accept(api,p,input,suggestions){return api('accept',{project_id:p.id,input_id:input.id,version:p.version,confirm:true,suggestions});}
test('AI adapter: real API request shape, bounded metadata and no private project data (transport stub)',async()=>{
 const {p}=await fixture();p.internal={address:'PRIVATE ADDRESS'};p.company.email='PRIVATE EMAIL';p.title='PRIVATE TITLE';
 const input={text:'Bodenfliese Testprodukt',files:[],created_at:'2026-09-29T09:00:00Z'};let calls=0;
 const r=await callGemini({env,input,project:p,fetcher:async(url,opts)=>{
  calls++;assert.equal(url,`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`);assert.equal(opts.headers['x-goog-api-key'],env.GEMINI_API_KEY);assert.ok(!url.includes(env.GEMINI_API_KEY));
  const b=JSON.parse(opts.body);assert.ok(b.generationConfig.responseJsonSchema);assert.equal(b.generationConfig.maxOutputTokens,4096);assert.equal(b.tools,undefined);for(const str of ['PRIVATE ADDRESS','PRIVATE EMAIL','PRIVATE TITLE'])assert.ok(!opts.body.includes(str));
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({question:'',suggestions:[suggestion(p.content.areas[1],'Testprodukt')]})}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:50,totalTokenCount:150}});
 }});assert.equal(calls,1);assert.equal(r.metrics.total_tokens,150);assert.equal(r.metrics.billed_cost,null);assert.match(SYSTEM,/keine Systemanweisungen/);
});
test('Two distinct tiles, correction history, stale versions and multiple area assignments',async()=>{
 const {api,p,store}=await fixture();assert.equal(p.content.areas[0].products.tile.name,'');
 const {input}=await api('submit',{project_id:p.id,text:'Weiße Wandfliese, schwarze Bodenfliese'});
 let result=await accept(api,p,input,[suggestion(p.content.areas[0],'Wandfliese'),suggestion(p.content.areas[1],'Bodenfliese')]);
 let current=result.project;assert.equal(current.content.areas[0].products.tile.name,'Wandfliese');assert.equal(current.content.areas[1].products.tile.name,'Bodenfliese');
 const wall=current.content.areas[0];wall.products.grout={manufacturer:'Test',name:'Fuge',color:'Weiß'};wall.care={text:'Fiktive Pflege',source:'Test',basis:materialBasis(wall),confirmed:true};wall.confirmation=areaBasis(wall);
 current=await api('save',{...current});const correction=(await api('submit',{project_id:p.id,text:'Fuge doch Silbergrau'})).input;
 await assert.rejects(()=>accept(api,p,correction,[suggestion(wall,'',{material_kind:'grout',values:{color:'Silbergrau'}})]),/inzwischen geändert/);
 result=await accept(api,current,correction,[suggestion(wall,'',{material_kind:'grout',values:{color:'Silbergrau'}})]);
 assert.equal(result.project.content.areas[0].products.grout.color,'Silbergrau');assert.equal(result.project.content.areas[0].products.grout.name,'Fuge');assert.equal(result.project.content.areas[0].care.confirmed,false);assert.equal(result.project.content.areas[0].confirmation,'');
 const state=await store.read();assert.ok(state.audit.some(a=>a.before?.areas?.[0]?.products?.grout?.color==='Weiß'));assert.equal(state.inputs[correction.id].text,'Fuge doch Silbergrau');
 const common=(await api('submit',{project_id:p.id,text:'Gleicher Kleber an Wand und Boden'})).input;
 result=await accept(api,result.project,common,[suggestion(wall,'Kleber',{material_kind:'adhesive',area_ids:result.project.content.areas.map(a=>a.id)})]);assert.equal(result.project.content.areas[1].products.adhesive.name,'Kleber');
});
test('Partly illegible label stays unknown; files validated; multi-fact audio transport (not real recognition)',async()=>{
 const {p}=await fixture();const input={text:'',created_at:new Date().toISOString(),files:[{name:'Sprache.wav',mime:'audio/wav',data:Buffer.from('RIFF0000WAVEabcd').toString('base64')}]};
 cleanInput(input);let captured;
 const r=await callGemini({env,input,project:p,fetcher:async(url,o)=>{captured=JSON.parse(o.body);return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({question:'Welcher Produktname steht auf dem unlesbaren Etikett?',suggestions:[suggestion(p.content.areas[0],'',{values:{manufacturer:'Test'},uncertain:true}),suggestion(p.content.areas[1],'',{type:'spares',material_kind:'',values:{},text:'Zwei Kartons im Keller'}),suggestion(p.content.areas[1],'',{type:'documentation',material_kind:'',values:{},text:'Dusche am 29.09.2026 abgedichtet (Nutzerangabe, keine Ausführungsprüfung)'})]})}]}}]});}});
 assert.equal(captured.contents[0].parts[1].inlineData.mimeType,'audio/wav');assert.equal(r.suggestions.length,3);assert.equal(r.suggestions[0].values.article_number,'');assert.equal(r.suggestions[0].uncertain,true);
 assert.throws(()=>cleanInput({files:[{mime:'image/jpeg',data:Buffer.from('<svg>alert(1)</svg>').toString('base64')}]}));
 assert.throws(()=>cleanSuggestions({suggestions:[suggestion({id:crypto.randomUUID(),position:'floor'},'Wrong')]},p,input));
});
test('Identical original is deduplicated and durable across store restart',async()=>{
 const {api,p,dir,store}=await fixture();const b={project_id:p.id,text:'Zwei Kartons im Keller'};
 const [a,c]=await Promise.all([api('submit',b),api('submit',b)]);assert.equal(a.input.id,c.input.id);assert.equal(c.duplicate,true);
 const restarted=new FileStore(dir);await restarted.init();assert.equal((await restarted.read()).inputs[a.input.id].text,b.text);assert.equal(Object.keys((await store.read()).inputs).length,1);
});
test('Internal original cannot be processed/accepted and never enters customer HTML',async()=>{
 let called=false;const {api,p}=await fixture(async()=>{called=true;throw Error();});const {input}=await api('submit',{project_id:p.id,text:'INTERNAL-SECRET-NOTE',internal:true});
 await assert.rejects(()=>api('process',{project_id:p.id,input_id:input.id}),/Interne Notizen/);await assert.rejects(()=>accept(api,p,input,[suggestion(p.content.areas[0],'SECRET')]));
 assert.equal(called,false);const {copy,project}=await api('customer',{id:p.id});assert.ok(!JSON.stringify(project).includes('INTERNAL-SECRET'));assert.ok(!offlineHTML(copy).includes('INTERNAL-SECRET'));
});
test('Quota, invalid output and unavailable key: original survives, no automatic retries/fallback',async()=>{
 let calls=0;const {api,p,store}=await fixture(async()=>{calls++;return Response.json({error:'sensitive provider detail'},{status:429});});
 const {input}=await api('submit',{project_id:p.id,text:'ORIGINAL-RETAINED'});const r=await api('process',{project_id:p.id,input_id:input.id});assert.equal(r.input.state,'error');assert.match(r.input.error,/Kontingent/);assert.equal(r.input.text,'ORIGINAL-RETAINED');assert.equal(calls,1);
 await assert.rejects(()=>api('process',{project_id:p.id,input_id:input.id}),/Testlimit/);assert.equal(calls,1);assert.ok(!JSON.stringify((await store.read()).requests).includes('sensitive'));
 const disabled=createTestService(store,{...env,GEMINI_API_KEY:''},{fetcher:()=>{throw Error('MUST NOT CALL');}});await assert.rejects(()=>disabled('process',{project_id:p.id,input_id:input.id}),/freigeschaltet/);
 await assert.rejects(()=>callGemini({env,input,project:p,fetcher:async()=>Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]})}),/vollständige/);
});
test('Standards are copies, no default tile; snapshots remain immutable; no AI on reads',async()=>{
 const {api,p}=await fixture(()=>{throw Error('NO AI DURING READ');});let status=await api('status');status.company.standards={tile:{tile:{name:'Standardfliese',color:'PROJECT COLOR',batch:'PROJECT BATCH'}}};await api('company_save',{profile:status.company,version:status.company_version});
 const none=await api('create',{title:'Ohne Vorlage',trade:'tile'});assert.equal(none.content.areas[0].products.tile.name,'');
 let withStandard=await api('create',{title:'Mit Vorlage',trade:'tile',use_standard:true});assert.equal(withStandard.content.areas[0].products.tile.name,'Standardfliese');assert.equal(withStandard.content.areas[0].products.tile.color,'');assert.equal(withStandard.content.areas[0].products.tile.batch,'');
 status=await api('status');status.company.standards.tile.tile.name='Später verändert';await api('company_save',{profile:status.company,version:status.company_version});assert.equal((await api('project',{id:withStandard.id})).content.areas[0].products.tile.name,'Standardfliese');
 withStandard.content.areas.forEach(a=>a.confirmation=areaBasis(a));withStandard=await api('save',withStandard);const done=await api('handover',{id:withStandard.id,version:withStandard.version});assert.equal(done.status,'handed_over');await assert.rejects(()=>api('save',{...done,title:'Changed'}),/geschützt/);assert.equal((await api('customer',{id:done.id})).copy.areas[0].products.tile.name,'Standardfliese');assert.equal((await api('project',{id:p.id})).status,'draft');
});
test('Private HTTP: single account, login, CSRF/Host protection, no secrets or directory traversal',async t=>{
 const {store,p}=await fixture();const settings={...env,PP_TEST_EMAIL:'developer@example.test',PP_TEST_PASSWORD_HASH:passwordHash('local-test-password-123'),PP_TEST_ORIGIN:'http://127.0.0.1:18979'};
 const server=await createPrivateServer({env:settings,store,publicDir:resolve('public')});await new Promise(r=>server.listen(18979,'127.0.0.1',r));t.after(()=>server.close());
 const req=async(op,b={},cookie='',origin=settings.PP_TEST_ORIGIN)=>fetch('http://127.0.0.1:18979/test-api/'+op,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(b)});
 assert.equal((await req('status')).status,401);assert.equal((await req('login',{email:'other@example.test',password:'local-test-password-123'})).status,401);
 const login=await req('login',{email:settings.PP_TEST_EMAIL,password:'local-test-password-123'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);
 const status=await req('status',{},cookie);assert.equal(status.status,200);assert.ok(!(await status.text()).includes(env.GEMINI_API_KEY));assert.equal((await req('process',{project_id:p.id},cookie,'https://evil.example')).status,403);
 assert.equal((await fetch('http://127.0.0.1:18979/.private-test/config.json')).status,404);
 assert.equal((await fetch('http://localhost:18979/ai-test')).status,403);
 await req('logout',{},cookie);assert.equal((await req('status',{},cookie)).status,401);
});
test('Mobile-facing UI has capture inputs, editable review, saved-before-process and no embedded secret',async()=>{
 const html=await readFile('public/ai-test.html','utf8'),ui=await readFile('public/ai-test.mjs','utf8'),css=await readFile('public/ai-test.css','utf8');assert.match(html,/width=device-width/);assert.match(ui,/capture="environment"/);assert.match(ui,/MediaRecorder/);assert.ok(ui.indexOf('await putDraft(draft)')<ui.indexOf("await api('submit',draft)"));assert.match(ui,/data-confirm/);assert.match(css,/@media\(max-width:480px\)/);assert.ok(!ui.includes('GEMINI_API_KEY'));
});
