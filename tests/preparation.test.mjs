import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createPreparationEditor,preparationHTML} from '../public/preparation.mjs';
import {content} from '../server/validation.mjs';

test('preparation keeps walls, floor and each executor distinct through editing and reopening',async()=>{
 const win=new Window();win.document.body.innerHTML='<div id="editor"></div>';
 const root=win.document.querySelector('#editor');let changes=0;
 const editor=createPreparationEditor(root,[],{choice:'Wände & Boden',onChange:()=>changes++});
 const $=s=>root.querySelector(s);
 const set=(id,value)=>{const el=$('#'+id);el.value=value;el.dispatchEvent(new win.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));};
 try{
  assert.equal(root.querySelectorAll('[data-prep-group]').length,2);
  set('prep-walls-base-kind','drywall');assert.throws(()=>editor.read(),/wer den Untergrund erstellt/);
  set('prep-walls-base-by','other');set('prep-walls-base-company','Trockenbau Beispiel');
  $('[data-prep-add="walls"]').click();set('prep-walls-0-kind','filled');set('prep-walls-0-by','own');
  $('[data-prep-add="walls"]').click();set('prep-walls-1-kind','primed');set('prep-walls-1-by','other');set('prep-walls-1-company','Grundierer Beispiel');
  set('prep-floor-base-kind','screed');set('prep-floor-base-by','unknown');
  const saved=content({trade:'seamless',preparation:editor.read()}).preparation;
  assert.equal(saved[0].substrate.company,'Trockenbau Beispiel');
  assert.deepEqual(saved[0].steps.map(s=>s.by),['own','other']);
  assert.equal(saved[1].substrate.kind,'screed');assert.equal(saved[1].substrate.by,'unknown');
  // Changing the project area never silently discards completed documentation.
  editor.setArea('Boden');assert.ok($('[data-prep-remove-area="walls"]'));assert.deepEqual(editor.read(),saved);
  editor.setArea('Wände & Boden');assert.equal($('#prep-walls-base-kind').value,'drywall');
  const reopened=createPreparationEditor(root,saved,{choice:'Wände & Boden'});
  assert.deepEqual(reopened.read(),saved);assert.equal($('#prep-walls-1-company').value,'Grundierer Beispiel');
  // Switching an executor cannot attribute the previous contractor's name to our business.
  set('prep-walls-1-by','own');assert.equal(reopened.read()[0].steps[1].company,'');
  $('[data-prep-remove="0"][data-prep-area="walls"]').click();assert.equal(reopened.read()[0].steps.length,1);
  $('[data-prep-remove="base"][data-prep-area="walls"]').click();assert.equal(reopened.read()[0].substrate,null);assert.equal(reopened.read()[0].steps.length,1);
  reopened.setArea('other','Treppe');set('prep-other-base-kind','other');set('prep-other-base-by','other');
  assert.throws(()=>reopened.read(),/kurz benennen/);set('prep-other-base-custom','Holz');
  reopened.setCustomLabel('Treppe & Podest');assert.equal(reopened.read().at(-1).label,'Treppe & Podest');
  assert.equal(reopened.read().at(-1).substrate.custom,'Holz');
  $('[data-prep-remove-area="walls"]').click();assert.equal(reopened.read().some(g=>g.area==='walls'),false);
  assert.ok(changes>0);
 }finally{await win.happyDOM.abort();win.close();}
});

test('preparation validation bounds data and rejects ambiguous or incomplete attribution',()=>{
 const item={kind:'plaster',by:'other',company:'Firma',note:'Bestand',forged:'ignored'};
 const group={area:'walls',substrate:item,steps:[]};
 const valid=content({preparation:[group]}).preparation[0];assert.equal(valid.substrate.forged,undefined);
 assert.equal(content({substrate:'Bestehende Freitextnotiz'}).substrate,'Bestehende Freitextnotiz');
 assert.equal(content({}).preparation,undefined);
 assert.throws(()=>content({preparation:[group,group]}),/nur einmal/);
 assert.throws(()=>content({preparation:[{...group,area:'ceiling'}]}));
 assert.throws(()=>content({preparation:[{...group,substrate:{...item,by:'maybe'}}]}));
 assert.throws(()=>content({preparation:[{...group,substrate:{...item,kind:'other',custom:''}}]}));
 assert.throws(()=>content({preparation:[{...group,steps:Array(21).fill({kind:'primed',by:'own'})}]}));
 assert.equal(content({preparation:[{...group,substrate:{...item,by:'own'}}]}).preparation[0].substrate.company,'');
});

test('customer preparation names each executing business and escapes free text',()=>{
 const groups=content({preparation:[{area:'walls',substrate:{kind:'drywall',by:'other',company:'Fremdfirma <A>'},steps:[{kind:'filled',by:'own',note:'<script>test</script>'},{kind:'other',custom:'Gewebe eingebettet',by:'unknown'}]}]}).preparation;
 const html=preparationHTML(groups,'Testbetrieb & Sohn');
 assert.match(html,/Untergrund: Trockenbau/);assert.match(html,/Anderes Gewerk: Fremdfirma &lt;A&gt;/);
 assert.match(html,/Ausgeführt durch: Testbetrieb &amp; Sohn/);assert.match(html,/Gewebe eingebettet/);
 assert.match(html,/Ausgeführt durch: Unbekannt/);assert.ok(!html.includes('<script>'));
});
