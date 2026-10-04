import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {clone,canonical,id,addSection,addUse,declareUsage,createStandard,applyStandard,newDraft,addArea,careValid,bindingValid,quality,publicSnapshot,visibleArea,setReminderPreference,confirmBinding} from '../public/bad/model.mjs';
import {makeFixture,attachDemoPhotos,demoCompany,addDemoRepair} from '../public/bad/fixtures.mjs';
import {areaHTML} from '../public/bad/customer.mjs';
import {sanitizeDraft,verifyFiles,assertPublish} from '../server/bad/validation.mjs';
const assets=JSON.parse(await readFile(new URL('../public/bad/test-assets.json',import.meta.url)));

test('QA01 document content changed under the same version ID invalidates care immediately',()=>{
 const d=makeFixture(),c=d.care[0];assert.ok(careValid(d,c));
 d.document_versions.find(v=>v.id===c.source_version_id).text='Different source content';
 assert.equal(careValid(d,c),false);assert.ok(careValid(d,d.care[1]));
});
test('QA02 exact unknown variant is still counted as an open material gap',()=>{
 const d=makeFixture('mixed'),wall=d.areas.find(a=>a.type==='shower_wall');
 // This wall has no unknown scope: unknown silicone VARIANT must itself be visible.
 assert.ok(quality(d,wall.id).materials.unknown>0);
});
test('QA03 applying the same standard twice must not duplicate project uses',()=>{
 const source=makeFixture(),s=createStandard(source,source.areas[0].id,'QA Standard');
 const d=newDraft({title:'QA'}),a=addArea(d,'floor','seamless');applyStandard(d,s,[a.id]);
 const n=d.uses.length;applyStandard(d,s,[a.id]);assert.equal(d.uses.length,n);
});
test('QA04 known partial repair without new care displays the scope warning in customer HTML',()=>{
 const d=makeFixture('mixed');addDemoRepair(d);const s=publicSnapshot(d,demoCompany),a=s.areas.find(a=>a.type==='floor');
 const warning=visibleArea(s,a.id).currentCare;assert.ok(warning);assert.ok(areaHTML(s,a.id).includes(warning));
});
test('QA05 maintenance provider is part of the confirmed instruction',()=>{
 const d=makeFixture('tile'),m=d.maintenance[0];assert.ok(bindingValid(d,m));m.provider='Different recipient';assert.equal(bindingValid(d,m),false);
});
test('QA06 impossible snooze dates and reversed maintenance windows are rejected',()=>{
 assert.throws(()=>setReminderPreference({},id(),{status:'snoozed',snooze_until:'2026-02-31'}));
 const d=makeFixture('tile');d.maintenance[0].due_to='2026-01-01';assert.throws(()=>sanitizeDraft(d));
});
test('QA07 JPEG prefix without an actual image is not accepted as an archived photo',async()=>{
 const d=await attachDemoPhotos(makeFixture(),assets);d.photos[0].file.data='data:image/jpeg;base64,/9j/AA==';
 await assert.rejects(()=>verifyFiles(sanitizeDraft(d)));
});
test('QA08 a PDF header and EOF without PDF objects are rejected',async()=>{
 const d=makeFixture();d.document_versions[0].file={name:'broken.pdf',data:'data:application/pdf;base64,'+Buffer.from('%PDF-1.4\n%%EOF').toString('base64')};
 await assert.rejects(()=>verifyFiles(sanitizeDraft(d)));
});
test('QA09 newer repairs cannot substitute the missing original finished photo',async()=>{
 const d=await attachDemoPhotos(makeFixture('mixed'),assets),a=d.areas[0];d.photos=d.photos.filter(p=>p.area_id!==a.id);
 const s=addDemoRepair(d);d.photos.push({id:id(),area_id:a.id,section_id:s.id,step:'finished',caption:'Repair only',visibility:'public',file:clone((await attachDemoPhotos(makeFixture(),assets)).photos[0].file)});
 assert.ok(quality(d,a.id).photos.missing.includes('finished'));
});
test('QA10 non-archived material without any document link remains a document gap',()=>{
 const d=makeFixture('tile');d.care=[];d.maintenance=[];d.document_links=[];
 assert.ok(quality(d,d.areas[0].id).documents.missing>0);
});
test('QA11 customer snapshot does not disclose the authentication subject UUID',()=>{
 const d=makeFixture(),actor='11111111-1111-4111-8111-111111111111';
 for(const u of d.uses)declareUsage(u,actor);for(const c of d.care)confirmBinding(d,c,actor);
 const s=publicSnapshot(d,demoCompany,{by:actor});assert.ok(!JSON.stringify(s).includes(actor));
});
