import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTrial,TRIAL_STORAGE_KEY} from '../public/bath-preview.mjs';
import {areaBasis} from '../public/bath-model.mjs';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),values};};
const options={now:()=> '2026-10-05T14:00:00.000Z'};
async function handover(trial){let p=trial.active();for(const a of p.content.areas)a.confirmation=areaBasis(a);p=await trial.api('save',{id:p.id,version:p.version,title:p.title,content:p.content,internal:p.internal});return trial.api('handover',{id:p.id,version:p.version});}
test('fiktive trial saves across reload, separates roles and preserves original while appending a repair',async()=>{
 const storage=memory(),trial=createTrial(storage,options);trial.create('seamless',true);
 let p=trial.active();assert.equal(p.content.areas.length,2);assert.equal(p.content.areas[1].trade,'tile');
 const restored=createTrial(storage,options);assert.equal(restored.active().id,p.id);assert.equal(restored.active().content.project.object_label,'Fiktive Musterwohnung · Bad');
 const handed=await handover(restored),original=JSON.stringify(handed.handover_snapshot);
 await assert.rejects(restored.api('save',{id:handed.id,version:handed.version,title:'Overwritten',content:{},internal:{}}),/Originalübergabe/);
 restored.setMode('customer');const e={id:crypto.randomUUID(),kind:'repair',area_id:handed.content.areas[0].id,occurred_on:'2028-10-05',description:'Fiktiver Silikonwechsel',materials:'Neues fiktives Silikon',material_role:'silicone',effect:'replaced',company:'Fiktiver Reparaturbetrieb',photos:[],documents:[]};
 const customer=await restored.api('customer_add',{id:handed.id,event:e});assert.equal(customer.additions.length,1);assert.equal(customer.additions[0].author_label,'Fiktiver Testkunde');assert.equal(customer.additions[0].recorded_at,options.now());assert.equal(JSON.stringify(customer.handover_snapshot),original);
 assert.equal((await restored.api('customer_add',{id:handed.id,event:e})).additions.length,1,'retry is idempotent');
 await assert.rejects(restored.api('customer_add',{id:handed.id,event:{...e,id:crypto.randomUUID(),area_id:crypto.randomUUID()}}),/gehört nicht/);
 restored.setMode('public');await assert.rejects(restored.api('customer_add',{id:handed.id,event:e}),/Berechtigung/);await assert.rejects(restored.api('customer_project',{id:handed.id}),/Berechtigung/);
 const scanned=await restored.api('scan',{token:handed.token});assert.equal(scanned.additions,undefined);assert.equal(scanned.internal,undefined);assert.equal(scanned.company.standards,undefined);assert.equal(JSON.stringify(scanned.handover_snapshot),original);
 const reloaded=createTrial(storage,options);assert.equal(reloaded.snapshot().mode,'public');reloaded.setMode('customer');assert.equal((await reloaded.api('customer_project',{id:handed.id})).additions.length,1);assert.equal(storage.values.size,1);assert.equal([...storage.values.keys()][0],TRIAL_STORAGE_KEY);
});
test('fiktive transfer rotates public token, consumes invitation and does not store passwords',async()=>{
 const trial=createTrial(memory(),options);trial.create('seamless',true);const p=await handover(trial);trial.setMode('customer');
 const invite=await trial.api('customer_transfer',{id:p.id,email:'neuer-fiktiver-kunde@example.test'}),t=invite.link.split('/').at(-1);
 const info=await trial.api('customer_access_info',{token:t});assert.equal(info.transfer,true);assert.equal(info.project_id,p.id);
 const result=await trial.api('customer_access_activate',{token:t,password:'Fiktives-Testpasswort'});assert.equal(result.project_id,p.id);assert.equal(trial.snapshot().ownerEmail,info.email);assert.ok(!JSON.stringify(trial.snapshot()).includes('Fiktives-Testpasswort'));
 await assert.rejects(trial.api('customer_access_info',{token:t}),/bereits verwendet/);await assert.rejects(trial.api('scan',{token:p.token}),/noch nicht übergeben/);
 const current=await trial.api('customer_project',{id:p.id});assert.notEqual(current.token,p.token);assert.deepEqual(current.handover_snapshot,p.handover_snapshot);
 trial.reset();assert.equal(trial.snapshot().projects.length,0);
});

import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
import {bootTrial} from '../public/bath-preview.mjs';
test('actual editor → datierte Freigabe → customer event → independent export modal in the trial',async()=>{
 const win=new Window({url:'https://projektpass.example/bath-preview.html'}),storage=memory();
 win.document.write(await readFile(new URL('../public/bath-preview.html',import.meta.url),'utf8'));
 globalThis.window=win;globalThis.document=win.document;globalThis.location=win.location;globalThis.FileReader=win.FileReader;globalThis.FormData=win.FormData;
 const select=s=>win.document.querySelector(s),wait=async predicate=>{for(let i=0;i<150;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Trial UI timeout: '+win.document.body.textContent);};
 let session;
 try{
  const trial=createTrial(storage,options);trial.create('seamless',true);session=await bootTrial({storage});
  await wait(()=>select('[data-bath-step="3"]'));select('[data-bath-step="3"]').click();await wait(()=>select('#bath-release-confirm'));
  for(const c of win.document.querySelectorAll('[data-confirm-area]')){c.checked=true;c.dispatchEvent(new win.Event('change'));}
  const gap=select('#bath-gaps-confirm');if(gap){gap.checked=true;gap.dispatchEvent(new win.Event('change'));}
  const release=select('#bath-release-confirm');release.checked=true;release.dispatchEvent(new win.Event('change'));assert.match(select('#bath-preview-content').textContent,/Canvas/);
  select('#bath-next').click();await wait(()=>select('#customer-add'));const original=JSON.stringify(session.trial.active().handover_snapshot);
  select('#customer-add').click();await wait(()=>select('#customer-event-form'));select('#event-description').value='Fiktive Wartung: Oberfläche kontrolliert';select('#event-date').value='2026-10-05';select('#customer-event-form').dispatchEvent(new win.Event('submit',{cancelable:true,bubbles:true}));
  await wait(()=>select('#customer-events')?.textContent.includes('Oberfläche kontrolliert'));assert.equal(JSON.stringify(session.trial.active().handover_snapshot),original);assert.equal(session.trial.active().additions.length,1);
  select('#customer-current-qr').click();await wait(()=>select('#customer-current-link'));assert.match(select('#customer-current-link').value,/bath-preview\.html#p\//);assert.match(select('#modal').textContent,/nur mit den Testdaten dieses Tabs/);select('#modal').close();
  select('#export').click();await wait(()=>select('#export-zip'));assert.ok(select('#export-pdf'));assert.ok(select('#export-html'));
  select('#modal').close();select('#trial-mode').value='public';select('#trial-mode').dispatchEvent(new win.Event('change'));await wait(()=>select('#customer-add')===null&&select('.customer-workspace'));assert.ok(!select('#customer-events').textContent.includes('Oberfläche kontrolliert'));
  session.dispose();session=await bootTrial({storage});await wait(()=>select('.customer-workspace'));assert.equal(session.trial.active().additions.length,1);assert.equal(JSON.stringify(session.trial.active().handover_snapshot),original);
 }finally{session?.dispose();win.happyDOM.abort();}
});
