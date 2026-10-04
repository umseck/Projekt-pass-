import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fixture,confirmFixture,actor,company,testPDF} from '../scripts/qa/fixtures.mjs';
import {newArea,enableRecords,materialUsed,confirmMaterial,areaBasis,areaConfirmed,materialBasis,careValid,replaceProduct,setOwnership,photoGaps,qualityStatements} from '../public/bath-model.mjs';
import {publicCustomerProject} from '../public/customer-projection.mjs';
import {customerCopy,offlineHTML} from '../public/bath-customer.mjs';
import {content,standard,bathDocument} from '../server/validation.mjs';
import {prepareBathSave} from '../server/bath-quality.mjs';
import {pdfBytes,sha256} from '../public/file-integrity.mjs';
import {buildArchive,zipStore} from '../public/bath-archive.mjs';
import {inquiryDraft,inquiryURI} from '../public/bath-inquiry.mjs';
const photo='data:image/jpeg;base64,'+(await readFile(new URL('./fixtures/test-photo.jpg',import.meta.url))).toString('base64');
const project=c=>({id:crypto.randomUUID(),title:'TEST Bad · ÄÖÜ äöü ß',pass_number:1,handed_over_at:'2026-10-04T10:00:00.000Z',company,content:c});
test('Q01 planned products and colours never become public by reviewing a complete area',()=>{
 const c=fixture();for(const a of c.areas)a.confirmation=areaBasis(a);const p=project(c),copy=customerCopy(p);
 assert.ok(!JSON.stringify(copy).includes('TEST-surface'));assert.ok(!JSON.stringify(copy).includes('TEST-Sand'));assert.ok(!offlineHTML(copy).includes('TEST-finish'));assert.ok(offlineHTML(copy).includes('Keine tatsächlich verwendeten Produkte'));
});
test('Q02 foreign work, existing surfaces, unknown and not-performed do not invent own products',()=>{
 for(const state of ['external','existing','unknown','not_performed']){const c=confirmFixture(fixture()),a=c.areas[0];setOwnership(a,'waterproofing',state);a.confirmation=areaBasis(a);const out=customerCopy(project(c));assert.deepEqual(out.areas[0].products.waterproofing,{});assert.ok(!JSON.stringify(out.areas[0]).includes('TEST-waterproofing'));if(state==='not_performed')assert.match(qualityStatements(a)[0],/0 nicht dokumentiert/);}
});
test('Q03 foreign evidence requires a concrete source and remains attributed',()=>{
 const c=fixture(),a=c.areas[0];setOwnership(a,'waterproofing','external');assert.throws(()=>confirmMaterial(a,'waterproofing'));a.records.waterproofing.source='TEST Fremdbetrieb, Lieferschein Nr. 42';confirmMaterial(a,'waterproofing');a.confirmation=areaBasis(a);assert.match(offlineHTML(customerCopy(project(c))),/Fremdbetrieb/);assert.equal(materialUsed(a,'waterproofing'),true);
});
test('Q04 surface finish changes invalidate dependent care, not an independent area',()=>{
 const c=confirmFixture(fixture()),a=c.areas[0],other=structuredClone(c.areas[1]);assert.equal(careValid(a),true);replaceProduct(a,'finish',{...a.products.finish,name:'ANDERE genaue Variante'});assert.equal(careValid(a),false);assert.equal(materialUsed(a,'surface'),true);assert.deepEqual(c.areas[1],other);assert.equal(careValid(other),true);
});
test('Q05 colour change requires re-confirmation without discarding product-bound care; silicone independent',()=>{
 const a=confirmFixture(fixture()).areas[0];replaceProduct(a,'silicone',{...a.products.silicone,name:'ANDERES Silikon'});assert.equal(careValid(a),true);replaceProduct(a,'surface',{...a.products.surface,color:'ANDERE Farbe'});assert.equal(careValid(a),false);assert.equal(a.care.confirmed,true);confirmMaterial(a,'surface');assert.equal(careValid(a),true);a.care.depends_on=['silicone'];a.care.basis=materialBasis(a);a.care.confirmed=true;assert.equal(careValid(a),false);
});
test('Q06 care source and document revision belong to the confirmed scope, bytes are fingerprinted compactly',()=>{
 const a=confirmFixture(fixture()).areas[0];a.care.source_kind='manufacturer';a.care.document_id=a.products.finish.documents[0].id;a.care.basis=materialBasis(a);assert.equal(careValid(a),true);assert.ok(a.care.basis.length<1000);a.products.finish.documents[0].visibility='internal';assert.equal(careValid(a),false);a.products.finish.documents[0].visibility='public';a.products.finish.documents[0].document_date='2026-10-05';assert.equal(careValid(a),false);
});
test('Q07 internal fields, staff notes, private PDFs and photos are absent in API projection and HTML',()=>{
 const c=confirmFixture(fixture());c.areas[0].products.finish.documents.push({name:'PRIVATE_PDF_SENTINEL',data:testPDF(),visibility:'internal'});c.areas[0].photos=[photo];c.areas[0].photo_notes=[{stage:'finished',caption:'PRIVATE_PHOTO_SENTINEL',visibility:'internal'}];for(const a of c.areas)a.confirmation=areaBasis(a);
 const p={...project(c),internal:{address:'PRIVATE_ADDRESS_SENTINEL'},journal:[{note:'PRIVATE_JOURNAL_SENTINEL'}],owner_key:'PRIVATE_KEY_SENTINEL',company:{...company,favorites:{name:'PRIVATE_FAV_SENTINEL'}}};p.handover_snapshot={content:c,company:p.company,title:p.title};
 const out=publicCustomerProject(p),raw=JSON.stringify(out)+offlineHTML(customerCopy(p));for(const x of ['PRIVATE_PDF_SENTINEL','PRIVATE_PHOTO_SENTINEL','PRIVATE_ADDRESS_SENTINEL','PRIVATE_JOURNAL_SENTINEL','PRIVATE_KEY_SENTINEL','PRIVATE_FAV_SENTINEL','NESTED_PRIVATE_SENTINEL'])assert.ok(!raw.includes(x),x);assert.equal(out.content.areas[0].photos.length,0);
});
test('Q08 server stamps new confirmations and overwrites forged actor/date',async()=>{
 const c=content(confirmFixture(fixture()));c.areas[0].records.surface.confirmed_by='Forged';c.areas[0].records.surface.confirmed_at='1900';await prepareBathSave(c,{},actor,'2026-10-04T10:00:00Z');assert.equal(c.areas[0].records.surface.confirmed_by,'Betrieb');assert.equal(c.areas[0].records.surface.confirmed_actor,actor);assert.equal(c.areas[0].records.surface.confirmed_at,'2026-10-04T10:00:00Z');assert.ok(!JSON.stringify(publicCustomerProject(project(c))).includes('confirmed_actor'));
});
test('Q09 malformed and active PDF bytes are rejected, genuine PDF accepted with SHA-256',async()=>{
 assert.throws(()=>bathDocument({data:'data:application/pdf;base64,JVBERi0xLjQK'}),/PDF/);assert.throws(()=>pdfBytes('data:application/pdf;base64,'+Buffer.from('%PDF-1.4\n1 0 obj /JavaScript\nendobj\nstartxref\n0\n%%EOF').toString('base64')),/aktive/);assert.throws(()=>bathDocument({data:'data:image/svg+xml;base64,PHN2Zz4='}));const c=content(confirmFixture(fixture()));await prepareBathSave(c,{},actor);const d=c.areas[0].products.finish.documents[0];assert.equal(d.integrity.sha256,await sha256(pdfBytes(d.data)));assert.equal(d.integrity.size,pdfBytes(d.data).length);
});
test('Q10 all photo locations share the same server limit; large pass is rejected rather than truncated',async()=>{
 const c=content(confirmFixture(fixture()));c.photos=[photo];c.areas[0].photos=Array(8).fill(photo);await assert.rejects(prepareBathSave(c,{},actor),/8 Fotos/);assert.throws(()=>content({...c,areas:Array.from({length:10},()=>({...c.areas[0],id:crypto.randomUUID()}))}));
});
test('Q11 missing before photo remains missing even when a finished photo exists',()=>{
 const c=confirmFixture(fixture('mixed',[photo,photo,photo]));assert.match(photoGaps(c.areas[0]).join(),/Vorher: Foto fehlt/);assert.match(offlineHTML(customerCopy(project(c))),/Vorher: Foto fehlt/);
});
test('Q12 standard strips project colours, batches, photos, customer data, records and dates',()=>{
 for(const kind of ['seamless','tile','mixed']){const c=confirmFixture(fixture(kind,[photo]));c.areas[0].products[c.areas[0].trade==='tile'?'tile':'surface'].batch='PRIVATE_BATCH';const s=standard({...c.areas[0].products,area_templates:c.areas,customer:'PRIVATE_CUSTOMER'},c.trade);const raw=JSON.stringify(s);for(const value of ['TEST-Sand','PRIVATE_BATCH','PRIVATE_CUSTOMER',photo,'confirmed_by','records','handed_over_at'])assert.ok(!raw.includes(value),value);}
});
test('Q13 selected-area maintenance draft requires explicit consent and excludes all other areas',()=>{
 const p=project(confirmFixture(fixture('mixed'))),a=p.content.areas[1],draft=inquiryDraft(p,a.id,'maintenance','TEST-Anfrage');assert.equal(draft.email,company.email);assert.match(draft.subject,/Duschwand/);assert.ok(!draft.body.includes('Nische abweichend'));assert.match(draft.body,/2026-10-04/);assert.throws(()=>inquiryURI(draft,false),/bestätigen/);assert.match(inquiryURI(draft,true),/^mailto:/);assert.throws(()=>inquiryDraft(p,'not-an-area'));
});
test('Q14 historic confirmation algorithm stays byte-compatible; catalog changes do not mutate copy',async()=>{
 // Exact fixture generated using main da381977, not the current implementation.
 const a={id:'11111111-1111-4111-8111-111111111111',name:'Historische Fläche',position:'walls',trade:'seamless',products:{surface:{manufacturer:'TEST',name:'Historisch',color:'',batch:'',label_photo:''},finish:{color:'',batch:'',label_photo:''},waterproofing:{color:'',batch:'',label_photo:''},silicone:{color:'',batch:'',label_photo:''}},preparation:[],note:'',spares:'',photos:[],care:{},confirmation:'a3fc2f4bd045971d'};assert.equal(areaConfirmed(a),true);const p=project({areas:[a]}),before=customerCopy(p);p.content.areas[0].products.surface.name='KATALOG-UPDATE';assert.equal(before.areas[0].products.surface.name,'Historisch');
});
test('Q15 three real PDF/ZIP packages generated; external links never treated as archived files',async()=>{
 await mkdir('qa/generated',{recursive:true});for(const kind of ['seamless','tile','mixed']){const c=content(confirmFixture(fixture(kind,Array(6).fill(photo))));await prepareBathSave(c,{},actor);const p=project(c),copy=customerCopy(p),pkg=await buildArchive(copy);assert.equal(pkg.manifest.files.filter(f=>f.mime==='image/jpeg').length,6);assert.equal(pkg.manifest.files.filter(f=>f.path.startsWith('Unterlagen/')).length,c.areas.length);await writeFile('qa/generated/'+kind+'.zip',pkg.bytes);await writeFile('qa/generated/'+kind+'.json',JSON.stringify(p));await writeFile('qa/generated/'+kind+'-manifest.json',JSON.stringify(pkg.manifest));}
});
test('Q16 file-integrity mismatch and unsafe ZIP paths abort export',async()=>{
 const c=content(confirmFixture(fixture()));await prepareBathSave(c,{},actor);c.areas[0].products.finish.documents[0].integrity.sha256='0'.repeat(64);await assert.rejects(buildArchive(customerCopy(project(c))),/Integritätsprüfung/);assert.throws(()=>zipStore([{path:'../PRIVATE',bytes:new Uint8Array([1])}]),/Archivpfad/);
});
