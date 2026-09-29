import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FileStore,createTestService} from '../server/private-test-store.mjs';

test('390px DOM simulation: login, capture text/PDF, real persistence, edited proposal, customer and manual editor',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pp-ai-ui-')),store=new FileStore(dir);await store.init();
 let account=false;
 const api=createTestService(store,{PP_AI_ENABLED:'true',PP_FREE_PROJECT_CONFIRMED:'true',GEMINI_API_KEY:'TEST-NOT-A-REAL-KEY'}, {fetcher:async()=>{
  const state=await store.read(),p=Object.values(state.projects)[0];
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({question:'',suggestions:[{type:'spares',area_ids:[p.content.areas[1].id],new_area:'',position:'floor',material_kind:'',values:{},text:'Zwei Kartons im Keller',file_index:-1,evidence:'SIMULIERTE Antwort für UI-Test',uncertain:false}]})}]}}]});
 }});
 const win=new Window({url:'http://localhost:8789',width:390,height:844});win.document.write(await readFile('public/ai-test.html','utf8'));
 const savedGlobals={};for(const key of ['window','document','navigator','FileReader','File','Image','HTMLDialogElement']){savedGlobals[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:key==='window'?win:key==='document'?win.document:win[key]});}
 const originalFetch=globalThis.fetch;globalThis.fetch=async(url,options)=>{
  if(String(url).startsWith('/test-api/')){const op=url.split('/').pop(),body=JSON.parse(options.body);if(op==='login'){account=true;return Response.json({ok:true});}if(!account)return Response.json({error:'Anmelden'},{status:401});try{return Response.json(await api(op,body));}catch(e){return Response.json({error:e.message},{status:e.status||503});}}
  if(url==='/catalog.json')return Response.json(JSON.parse(await readFile('public/catalog.json','utf8')));throw Error('Unexpected '+url);
 };
 // Explicit in-memory IndexedDB stand-in for DOM-only test. Not a browser durability proof.
 const memory=new Map(),originalIDB=globalThis.indexedDB;globalThis.indexedDB={open(){const request={};queueMicrotask(()=>{request.result={transaction(){const tx={objectStore(){const call=fn=>{const req={};setTimeout(()=>{req.result=fn();req.onsuccess?.();setTimeout(()=>tx.oncomplete?.(),0);},0);return req;};return {put:v=>call(()=>memory.set(v.id,v)),delete:id=>call(()=>memory.delete(id)),getAll:()=>call(()=>[...memory.values()])};}};return tx;}};request.onsuccess?.();});return request;}};
 const wait=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI condition not reached: '+win.document.body.textContent.slice(-900));};
 const $=s=>win.document.querySelector(s),click=s=>$(s).click();
 try{
  await import('../public/ai-test.mjs?dom-test');assert.ok($('#test-login'));
  $('#login-email').value='developer@example.test';$('#login-password').value='testpassword';$('#test-login').dispatchEvent(new win.Event('submit',{cancelable:true}));await wait(()=>$('#test-create'));
  $('#test-trade').value='tile';$('#test-create').dispatchEvent(new win.Event('submit',{cancelable:true}));await wait(()=>$('#capture'));
  await new Promise(r=>setTimeout(r,30));$('#capture-text').value='Zwei Kartons im Keller';$('#capture').dispatchEvent(new win.Event('submit',{cancelable:true}));await wait(()=>$('[data-review]'));
  assert.equal(memory.size,0);assert.equal(Object.values((await store.read()).inputs)[0].state,'review');
  await new Promise(r=>setTimeout(r,30));$('[data-text]').value='Drei Kartons im Keller';$('[data-confirm]').checked=true;$('[data-review]').dispatchEvent(new win.Event('submit',{cancelable:true}));await wait(()=>win.document.body.textContent.includes('Ausdrücklich übernommen'));
  await new Promise(r=>setTimeout(r,20));click('#test-customer');await wait(()=>$('.customer-dossier'));
  $('#customer-area').value=Object.values((await store.read()).projects)[0].content.areas[1].id;$('#customer-area').dispatchEvent(new win.Event('change'));assert.match($('#area-answer').textContent,/Drei Kartons/);assert.ok(!win.document.body.textContent.includes('SIMULIERTE Antwort'));
  await new Promise(r=>setTimeout(r,20));click('#test-intake');await wait(()=>$('#capture-file'));
  await new Promise(r=>setTimeout(r,30));const pdf=new win.File(['%PDF-1.4\n%%EOF'],'Etikett.pdf',{type:'application/pdf'});Object.defineProperty($('#capture-file'),'files',{value:[pdf]});$('#capture-file').dispatchEvent(new win.Event('change'));await wait(()=>$('#capture-files').textContent.includes('Etikett.pdf'));
  $('#capture-internal').checked=true;$('#capture-text').value='INTERNAL-PDF';await new Promise(r=>setTimeout(r,20));$('#capture').dispatchEvent(new win.Event('submit',{cancelable:true}));await wait(()=>win.document.body.textContent.includes('Intern – keine KI'));
  await new Promise(r=>setTimeout(r,20));click('#test-manual');await wait(()=>$('#bath-next'));click('#bath-next');await wait(()=>$('#bath-area'));
  assert.equal($('#bath-area').options.length,2);assert.ok($('[data-bath-product="tile"]'));
  console.log('SIMULATION: 390×844 DOM, text capture → stubbed Gemini → human edit → persisted customer view; PDF internal upload; no visual layout or microphone proof.');
 }finally{globalThis.fetch=originalFetch;globalThis.indexedDB=originalIDB;for(const [key,descriptor] of Object.entries(savedGlobals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}await win.happyDOM.close();}
});
