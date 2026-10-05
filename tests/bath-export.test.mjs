import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {PDFDocument,PDFName} from '../public/vendor/pdf-lib/pdf-lib-1.17.1.mjs';
import {newArea,areaBasis,materialBasis,areaConfirmed,careValid} from '../public/bath-model.mjs';
import {buildCustomerExport,exportCopy,zipFiles,crc32} from '../public/bath-export.mjs';

const at='2026-10-05T12:00:00.000Z';
const photo='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCtRRRWZxn/2Q==';
async function fixture(){
 const attachment=await PDFDocument.create();attachment.addPage();const data='data:application/pdf;base64,'+Buffer.from(await attachment.save()).toString('base64');
 const a=newArea('tile',{tile:{manufacturer:'Testhersteller',name:'Testfliese',color:'Graphit'},grout:{manufacturer:'Testhersteller',name:'Testfuge',color:'Silbergrau'}},'Duschboden','floor');
 a.products.tile.color='Graphit';a.products.grout.color='Silbergrau';
 a.scope='own';a.roles_status={adhesive:'unknown',silicone:'not_applicable',waterproofing:'unknown'};a.status_notes={waterproofing:'Altaufbau nicht bekannt'};a.spares='2 Fliesen im Keller';a.photos=[photo];a.products.tile.label_photo=photo;
 a.products.tile.documents=[{name:'Produktblatt',type:'PDF',data,source:'Quelle Testblatt',document_date:'2026-09-01',internal:'PRIVATE-DOC'},{name:'Nur online',url:'https://example.test/pflege.pdf',source:'Herstellerwebsite',access_token:'DOC-TOKEN'}];
 a.preparation=[{area:'floor',label:'',substrate:{kind:'screed',by:'other',custom:'',company:'Testestrichbetrieb',note:'Bestand übernommen'},steps:[{kind:'primed',by:'own',custom:'',company:'',note:'Im Test dokumentiert'}]}];
 a.care={text:'TESTHINWEIS ohne technische Freigabe',source:'Quelle Testblatt',document_date:'2026-09-01',url:'https://example.test/pflege.pdf',basis:materialBasis(a),confirmed:true};a.confirmation=areaBasis(a);
 const company={name:'Übergabebetrieb',phone:'0123 456',email:'test@example.test',favorites:{internal:'PRIVATE-FAV'}};
 const content={project:{object_label:'Bad im Obergeschoss',completed_on:'2026-10-01',scope:'Fliesenfläche Duschboden',gaps_acknowledged:true},areas:[a],photos:[],documents:[],private_data:'PRIVATE-CONTENT'};
 return {title:'Testbad ÄÖÜ äöü ß',pass_number:1,handed_over_at:'2026-10-01T09:00:00.000Z',company:{name:'Später geänderter Betrieb'},content:{...content,areas:[{...a,name:'FALSCHE MUTIERTE ANSICHT'}]},handover_snapshot:{company,content,handed_over_at:'2026-10-01T09:00:00.000Z'},internal:{customer_name:'PRIVATE-INTERNAL'},token:'SECRET-SCAN-TOKEN',owner_key:'SECRET-OWNER-KEY',session:'SECRET-SESSION',owner_additions:[{description:'LEGACY-SECRET'}],additions:[{id:'event-1',author_id:'SECRET-AUTHOR-ID',author_label:'kunde@example.test',recorded_at:'2026-10-05T11:00:00.000Z',kind:'change',area_id:a.id,occurred_on:'2026-10-04',description:'Test: Teilfläche verändert',company:'Nachfolgebetrieb',materials:'Andere Testfliese',material_role:'tile',effect:'replaced',photos:[photo],documents:[{name:'Wartungsnachweis',data,source:'Kundendatei',internal:'PRIVATE-EVENT-DOC'}],internal:'PRIVATE-EVENT'}]};
}
function unzipStore(value){
 const entries=new Map(),view=new DataView(value.buffer,value.byteOffset,value.byteLength);let offset=0;
 while(view.getUint32(offset,true)===0x04034b50){assert.equal(view.getUint16(offset+8,true),0);assert.equal(view.getUint16(offset+6,true),0x800);const crc=view.getUint32(offset+14,true),size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true),start=offset+30+nameLength+extraLength;const name=new TextDecoder().decode(value.subarray(offset+30,offset+30+nameLength)),body=value.slice(start,start+size);assert.equal(crc32(body),crc);assert.ok(!entries.has(name));entries.set(name,body);offset=start+size;}
 assert.equal(view.getUint32(offset,true),0x02014b50);assert.equal(view.getUint32(value.length-22,true),0x06054b50);assert.equal(view.getUint16(value.length-12,true),entries.size);return entries;
}
function pdfText(pdf){return pdf.getPages().flatMap(page=>{const streams=page.node.Contents();return Array.from({length:streams?.size()||0},(_,i)=>{const stream=pdf.context.lookup(streams.get(i));const raw=inflateSync(stream.getContents()).toString();return [...raw.matchAll(/<([0-9A-F]+)>\s*Tj/gi)].map(v=>Buffer.from(v[1],'hex').toString('latin1')).join('\n');});}).join('\n');}

test('independent ZIP contains original, supplements, real files and verifiable SHA-256 hashes',async()=>{
 const p=await fixture(),before=structuredClone(p),result=await buildCustomerExport(p,{exportedAt:at}),entries=unzipStore(result.zip);
 assert.deepEqual(p,before,'Export must never mutate original or additions');
 const json=JSON.parse(new TextDecoder().decode(entries.get('projektpass.json'))),manifest=JSON.parse(new TextDecoder().decode(entries.get('manifest.json')));
 assert.equal(json.areas[0].name,'Duschboden');assert.equal(json.company.name,'Übergabebetrieb');assert.equal(json.project.scope,'Fliesenfläche Duschboden');assert.equal(json.areas[0].preparation[0].substrate.company,'Testestrichbetrieb');
 assert.equal(json.additions[0].company,'Nachfolgebetrieb');assert.equal(json.additions[0].author_label,'kunde@example.test');assert.equal(json.additions[0].recorded_at,'2026-10-05T11:00:00.000Z');assert.equal(json.additions[0].occurred_on,'2026-10-04');
 assert.equal(manifest.unarchived_documents.length,1);assert.equal(manifest.unarchived_documents[0].url,'https://example.test/pflege.pdf');
 assert.equal(manifest.archived_attachments.length,5);
 for(const entry of manifest.files){assert.ok(entries.has(entry.path));const data=entries.get(entry.path);assert.equal(data.length,entry.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);}
 assert.equal(manifest.files.some(f=>f.path==='manifest.json'),false);
 assert.deepEqual(entries.get(json.areas[0].photos[0].file),new Uint8Array(Buffer.from(photo.split(',')[1],'base64')));
 const archivedDocument=await PDFDocument.load(entries.get(json.areas[0].products.tile.documents[0].file));assert.equal(archivedDocument.getPageCount(),1);
 const serial=new TextDecoder().decode(entries.get('projektpass.json'))+result.html+JSON.stringify(manifest);
 for(const secret of ['PRIVATE-INTERNAL','PRIVATE-CONTENT','PRIVATE-FAV','PRIVATE-DOC','PRIVATE-EVENT-DOC','PRIVATE-EVENT','SECRET-SCAN-TOKEN','SECRET-OWNER-KEY','SECRET-SESSION','SECRET-AUTHOR-ID','DOC-TOKEN','LEGACY-SECRET','FALSCHE MUTIERTE ANSICHT'])assert.ok(!serial.includes(secret),secret);
 assert.match(result.html,/Originalpflege ist keine bestätigte Anleitung/);assert.match(result.html,/Spätere Kundenergänzungen/);assert.match(result.html,/Ausgeführt von/);assert.match(result.html,/data:application\/pdf;base64/);assert.match(result.html,/data:image\/jpeg;base64/);
 assert.ok(!result.html.includes('<script'));assert.match(result.html,/default-src &#39;none&#39;|default-src 'none'/);
 assert.equal(areaConfirmed(result.copy.areas[0]),true);assert.equal(careValid(result.copy.areas[0]),true);
});

test('downloadable PDF reopens with German text, provenance and separate change warning',async()=>{
 const result=await buildCustomerExport(await fixture(),{exportedAt:at}),pdf=await PDFDocument.load(result.pdf);
 assert.ok(pdf.getPageCount()>=2);assert.equal(pdf.getTitle(),'Projektpass · Testbad ÄÖÜ äöü ß');
 const text=pdfText(pdf).replace(/\s+/g,' ');
 for(const word of ['Originalübergabe','Silbergrau','Quelle Testblatt','Erfasst von','Ausgeführt von','Nachfolgebetrieb','Spätere Änderung dokumentiert','veränderten Aufbau'])assert.ok(text.includes(word),word);
 assert.ok(pdf.getPages().some(page=>pdf.context.lookup(page.node.Resources().get(PDFName.of('XObject')))?.entries().length>0),'PDF contains actual embedded photos');
 assert.ok(!text.includes('SECRET'));assert.ok(!text.includes('FALSCHE MUTIERTE ANSICHT'));assert.match(text,/keine rechtsgeschäftliche Bauabnahme/);
});

test('original-only export excludes customer events and does not acquire secrets from attachment objects',async()=>{
 const p=await fixture(),copy=exportCopy(p,{includeAdditions:false,exportedAt:at});assert.equal(copy.additions.length,0);assert.equal(copy.additions_included,false);assert.equal(copy.areas[0].products.tile.documents[0].internal,undefined);
 const result=await buildCustomerExport(p,{includeAdditions:false,exportedAt:at}),entries=unzipStore(result.zip);assert.equal(result.manifest.archived_attachments.length,3);assert.ok(!result.html.includes('Nachfolgebetrieb'));assert.ok(!new TextDecoder().decode(entries.get('projektpass.json')).includes('Nachfolgebetrieb'));
});

test('ZIP format preserves UTF-8 names and detects byte changes',()=>{
 const body=new TextEncoder().encode('Prüfdatei'),zip=zipFiles([{name:'prüfen.txt',data:body}],new Date(at)),entries=unzipStore(zip);assert.deepEqual(entries.get('prüfen.txt'),body);const changed=body.slice();changed[0]^=1;assert.notEqual(crc32(body),crc32(changed));
});

test('care remains explicitly historical; known silicone repair and unknown change scope stay distinct',async()=>{
 const p=await fixture();p.additions[0].material_role='silicone';p.additions[0].effect='replaced';
 let result=await buildCustomerExport(p,{exportedAt:at});assert.ok(!result.html.includes('Die Originalpflege ist keine bestätigte Anleitung'));assert.match(result.html,/Welche Pflege war zur Originalübergabe dokumentiert/);
 p.additions[0].effect='unknown';result=await buildCustomerExport(p,{exportedAt:at});assert.ok(!result.html.includes('Die Originalpflege ist keine bestätigte Anleitung'));
 p.additions[0].material_role='';result=await buildCustomerExport(p,{exportedAt:at});assert.match(result.html,/<h3>Duschboden<\/h3><p><strong>Spätere Änderung/);assert.match(result.html,/heutigen Aufbau/);
 p.handover_snapshot.content.areas[0].care.confirmed=false;result=await buildCustomerExport(p,{exportedAt:at});assert.equal(result.copy.areas[0].care.text,undefined);assert.ok(!result.html.includes('TESTHINWEIS ohne technische Freigabe'));
});

test('general original files survive export; unknown care object keys stay excluded',async()=>{
 const p=await fixture();p.handover_snapshot.content.spare_materials=[{material:'Fliese',quantity:'2',location:'Keller',photo,private_key:'SPARE-SECRET'}];p.handover_snapshot.content.waterproofing_details={water_class:'W2-I',type:'sheet',photos:[photo],internal:'WATER-SECRET'};p.handover_snapshot.content.care_notes={tile:'Allgemeiner Testhinweis',internal:'CARE-SECRET'};
 const result=await buildCustomerExport(p,{exportedAt:at}),entries=unzipStore(result.zip),json=JSON.parse(new TextDecoder().decode(entries.get('projektpass.json')));
 assert.ok(entries.has(json.general.spare_materials[0].photo.file));assert.ok(entries.has(json.general.waterproofing_details.photos[0].file));assert.equal(result.manifest.archived_attachments.length,7);assert.match(result.html,/Restmaterial aus der Originalübergabe/);assert.match(result.html,/W2-I/);
 for(const secret of ['SPARE-SECRET','WATER-SECRET','CARE-SECRET'])assert.ok(!result.html.includes(secret));
});

test('public original-only access cannot imply absence of private customer additions',async()=>{
 const p=await fixture();delete p.additions;
 let result=await buildCustomerExport(p,{exportedAt:at});assert.equal(result.copy.additions_included,false);assert.equal(result.copy.additions_status,'not_available');assert.match(result.html,/Persönliche Kundenergänzungen sind in diesem Zugriff nicht verfügbar/);assert.ok(!result.html.includes('Keine Kundenergänzungen vorhanden'));assert.ok(!result.html.includes('PROJEKTPASS · Originalübergabe und Ergänzungen'));
 let pdf=await PDFDocument.load(result.pdf);assert.match(pdfText(pdf).replace(/\s+/g,' '),/Persönliche Kundenergänzungen sind in diesem Zugriff nicht verfügbar/);assert.ok(!pdfText(pdf).includes('Keine Kundenergänzungen vorhanden'));
 p.additions=[];result=await buildCustomerExport(p,{exportedAt:at});assert.equal(result.copy.additions_included,true);assert.equal(result.copy.additions_status,'included');assert.match(result.html,/Keine Kundenergänzungen vorhanden/);
 pdf=await PDFDocument.load(result.pdf);assert.match(pdfText(pdf),/Keine Kundenergänzungen vorhanden/);
});
