import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {newArea,materialBasis,areaBasis,areaConfirmed,careValid} from '../public/bath-model.mjs';
import {customerCopy,answersHTML} from '../public/bath-customer.mjs';
import {originalHandover,continuationState,mountCustomerWorkspace,mountCustomerInvitation} from '../public/customer-continuation.mjs';

function original(){
 const area=newArea('tile',{tile:{manufacturer:'TEST',name:'Testfliese',color:'Testgrau'},grout:{name:'Testfuge',color:'Sand'}});
 area.scope='own';area.roles_status={tile:'known',grout:'known',adhesive:'unknown',waterproofing:'unknown',silicone:'not_applicable'};area.status_notes={waterproofing:'Bestand nicht geöffnet'};
 area.care={text:'TEST: Pflegehinweis aus der Übergabe.',source:'TEST-Unterlage',basis:materialBasis(area),confirmed:true};area.confirmation=areaBasis(area);
 return {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',title:'Testbad',content:{areas:[area],project:{object_label:'Testbad EG',completed_on:'2026-10-05',scope:'TEST-Fliesenflächen',gaps_acknowledged:true}},company:{name:'Später geänderte Firma'},handed_over_at:'2026-10-05T12:00:00Z',handover_snapshot:{company:{name:'Firma bei Übergabe'},handed_over_at:'2026-10-05T12:00:00Z'},permissions:{can_add:true,can_transfer:true},additions:[]};
}
test('copy preserves confirmed scope, explicit unknowns and detached project metadata',()=>{
 const p=original(),copy=customerCopy(p),a=copy.areas[0];
 assert.equal(areaConfirmed(a),true);assert.equal(careValid(a),true);assert.equal(a.roles_status.silicone,'not_applicable');assert.equal(copy.project.scope,'TEST-Fliesenflächen');assert.equal(copy.company.name,'Firma bei Übergabe');
 p.content.areas[0].status_notes.waterproofing='changed';p.content.project.scope='changed';assert.equal(a.status_notes.waterproofing,'Bestand nicht geöffnet');assert.equal(copy.project.scope,'TEST-Fliesenflächen');
 assert.match(answersHTML(a,copy.company),/Nicht zutreffend/);assert.match(answersHTML(a,copy.company),/Bestand nicht geöffnet/);
});
test('a changed surface invalidates current care while a silicone-only repair preserves surface history',()=>{
 const p=original(),a=p.content.areas[0],before=structuredClone(a);
 p.additions=[{id:'e1',kind:'repair',area_id:a.id,effect:'replaced',material_role:'silicone',materials:'TEST-Silikon'}];assert.equal(continuationState(p,a).careChanged,false);
 p.additions[0].effect='unknown';assert.equal(continuationState(p,a).careChanged,false);
 p.additions.push({id:'e2',kind:'change',area_id:a.id,effect:'replaced',material_role:'tile',materials:'TEST-Neuer Belag'});assert.equal(continuationState(p,a).careChanged,true);
 assert.deepEqual(a,before);assert.equal(originalHandover(p).company.name,'Firma bei Übergabe');
 p.additions=[{kind:'change',area_id:a.id,effect:'unknown',material_role:''}];assert.equal(continuationState(p,a).careChanged,true);
});
test('customer quick answers mark changed care historical and attribute author separately from executor',async()=>{
 const win=new Window({url:'https://example.test'}),previous={document:globalThis.document,window:globalThis.window,location:globalThis.location};
 globalThis.document=win.document;globalThis.window=win;globalThis.location=win.location;win.document.body.innerHTML='<div id="app"></div><dialog id="modal"></dialog>';
 try{
  const p=original(),a=p.content.areas[0];p.additions=[{id:'e1',kind:'change',area_id:a.id,occurred_on:'2026-10-05',recorded_at:'2026-10-05T12:15:00Z',description:'TEST: Neuer Belag',company:'TEST Reparaturbetrieb',author_label:'TEST Kundenkonto',materials:'TEST Material',material_role:'tile',effect:'replaced',photos:[],documents:[]}];
  await mountCustomerWorkspace(p,{api:async()=>p,shell:html=>win.document.querySelector('#app').innerHTML=html,modal:()=>{},go:()=>{},notify:()=>{}});
  win.document.querySelector('[data-topic="care"]').click();const answer=win.document.querySelector('#customer-quick-result');assert.match(answer.textContent,/heutigen Aufbau fehlt/);assert.match(answer.textContent,/Originalübergabe ansehen/);
  const timeline=win.document.querySelector('#customer-events').textContent;assert.match(timeline,/Erfasst von TEST Kundenkonto/);assert.match(timeline,/Ausgeführt durch: TEST Reparaturbetrieb/);
  assert.match(win.document.querySelector('.customer-original-stamp').textContent,/Firma bei Übergabe/);
  delete p.permissions;
  await mountCustomerWorkspace(p,{api:async()=>p,shell:html=>win.document.querySelector('#app').innerHTML=html,modal:()=>{},go:()=>{}});assert.equal(win.document.querySelector('#customer-add'),null);assert.equal(win.document.querySelector('#customer-transfer'),null);
  p.permissions={can_add:true,can_transfer:true};
  await mountCustomerWorkspace(p,{mode:'public',api:async()=>p,shell:html=>win.document.querySelector('#app').innerHTML=html,modal:()=>{},go:()=>{}});assert.equal(win.document.querySelector('#customer-add'),null);
  delete p.additions;
  await mountCustomerWorkspace(p,{mode:'public',api:async()=>p,shell:html=>win.document.querySelector('#app').innerHTML=html,modal:()=>{},go:()=>{}});assert.match(win.document.querySelector('#customer-events').textContent,/nicht sichtbar/);assert.ok(!win.document.querySelector('#customer-events').textContent.includes('Noch keine Ergänzungen'));
  mountCustomerInvitation({...p,current_owner_email:'owner@example.test'},{api:async()=>{throw Error('Existing owner must not receive another invitation.');}},win.document.querySelector('#app'));
  assert.equal(win.document.querySelector('#customer-invite-form'),null);assert.match(win.document.querySelector('#app').textContent,/owner@example.test/);
 }finally{win.happyDOM.abort();Object.assign(globalThis,previous);}
});
