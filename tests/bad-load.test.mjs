import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {newDraft,id,addArea,addUse,declareUsage,addSection,confirmBinding,fileInfo,publicSnapshot,canonical,clone} from '../public/bad/model.mjs';
import {demoCompany} from '../public/bad/fixtures.mjs';
import {sanitizeDraft,verifyFiles,assertPublish} from '../server/bad/validation.mjs';
import {makePDF,makeZip} from '../public/bad/export.mjs';
test('QA12 large pass: 10 areas, 50 uses, 50 photos, 20 documents, 3 maintenance sections and 4 immutable copies',async()=>{
 const start=performance.now(),d=newDraft({title:'QA Großes Bad – 50 Fotos / 50 Verwendungen'}),assets=JSON.parse(await readFile(new URL('../public/bad/test-assets.json',import.meta.url)));
 const empty=publicSnapshot(d,demoCompany),pdf='data:application/pdf;base64,'+Buffer.from(makePDF(empty)).toString('base64');
 d.sections[0].performed_from='2026-10-03';d.sections[0].performed_to='2026-10-03';
 for(let n=0;n<10;n++){
  const a=addArea(d,n%2?'wall':'floor','tile','QA Fläche '+n);
  for(const role of ['tile','adhesive','grout','waterproofing','silicone']){const u=addUse(d,a.id,role,{manufacturer:'QA Testanbieter',name:'QA '+role+' '+n,variant:'Variante A',variant_status:'known'});declareUsage(u,'QA Betrieb','2026-10-04T10:00:00Z');}
  const refs=d.uses.filter(u=>u.area_id===a.id).map(u=>({usage_id:u.id,aspect:'product'}));
  for(let j=0;j<2;j++){
   const v={id:id(),document_id:id(),name:'QA Unterlage '+n+'/'+j,type:j?'technical':'business',source_kind:'business',source_label:'QA Betrieb',url:'',document_date:'TEST 1',language:'de',market:'DE',checked_at:'2026-10-04',source_status:'uploaded',visibility:'public',file:await fileInfo(pdf,'QA.pdf'),text:j?'':'Nur fiktive Software-Testanweisung.'};d.document_versions.push(v);
   const link={id:id(),area_id:a.id,section_id:d.sections[0].id,dependencies:refs,version_id:v.id};confirmBinding(d,link,'QA Betrieb');d.document_links.push(link);
   if(!j){const c={id:id(),area_id:a.id,section_id:d.sections[0].id,dependencies:refs,source_version_id:v.id,source_kind:'business',source_label:v.source_label,text:v.text};confirmBinding(d,c,'QA Betrieb');d.care.push(c);}
  }
  for(let j=0;j<5;j++)d.photos.push({id:id(),area_id:a.id,section_id:d.sections[0].id,step:j?'build':'finished',caption:'FIKTIVES TESTFOTO '+n+'/'+j,visibility:'public',file:await fileInfo(assets.photos[j%6],'QA-'+n+'-'+j+'.jpg')});
 }
 let clean=await verifyFiles(sanitizeDraft(d)),previous=publicSnapshot(clean,demoCompany,{number:1}),history=[clone(previous)];const initialBytes=canonical(history[0]);
 for(let n=0;n<3;n++){addSection(clean,{area_id:clean.areas[n].id,kind:'maintenance',performed_on:(2027+n)+'-10-03',region:'Dokumentierte Kontrollstelle '+n,description:'QA Sichtkontrolle ohne Materialänderung'});assertPublish(clean,previous);previous=publicSnapshot(clean,demoCompany,{number:n+2});history.push(clone(previous));}
 assert.equal(canonical(history[0]),initialBytes);assert.equal(clean.uses.length,50);assert.equal(clean.photos.length,50);assert.equal(clean.document_versions.length,20);
 const pdfStart=performance.now(),bytes=makePDF(previous),pdfMs=performance.now()-pdfStart,zipStart=performance.now(),zip=await makeZip(previous),zipMs=performance.now()-zipStart;
 await mkdir('qa/quality',{recursive:true});await writeFile('qa/quality/large.pdf',bytes);await writeFile('qa/quality/large.zip',zip);await writeFile('qa/quality/large-report.json',JSON.stringify({areas:10,uses:50,photos:50,documents:20,maintenance_sections:3,releases:4,pdf_ms:Math.round(pdfMs),zip_ms:Math.round(zipMs),total_ms:Math.round(performance.now()-start),pdf_bytes:bytes.length,zip_bytes:zip.length,json_request_bytes:Buffer.byteLength(JSON.stringify(clean)),heap_used_bytes:process.memoryUsage().heapUsed,environment:'Local Node; not mobile device benchmark'},null,2));
});
