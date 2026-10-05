import {customerCopy,offlineHTML,answersHTML} from './bath-customer.mjs';
import {bathKinds,bathNames,areaConfirmed,areaBasis,careValid,productLabel} from './bath-model.mjs';
import {esc,safeLink} from './ui.mjs';
import {preparationAreas,substrateTypes,preparationTypes} from './preparation-data.mjs';
import {preparationHTML} from './preparation.mjs';
import {PDFDocument,StandardFonts,rgb,PDFName,PDFString} from './vendor/pdf-lib/pdf-lib-1.17.1.mjs';

const encoder=new TextEncoder();
const str=value=>typeof value==='string'?value:'';
const fields=(value,names)=>Object.fromEntries(names.map(name=>[name,str(value?.[name])]));
const jpeg=value=>typeof value==='string'&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=\r\n]*$/.test(value)?value:'';
const pdfData=value=>typeof value==='string'&&/^data:application\/pdf;base64,JVBER[A-Za-z0-9+/=\r\n]*$/.test(value)?value:'';
const photos=value=>(Array.isArray(value)?value:[]).map(jpeg).filter(Boolean);
const allowedDocs=value=>(Array.isArray(value)?value:[]).map(d=>({...fields(d,['name','type','source','document_date']),url:safeLink(d?.url)||'',data:pdfData(d?.data)}));
const knownRoles=['surface','finish','waterproofing','silicone','tile','adhesive','grout','primer'];
const dateLabel=value=>value?String(value).replace('T',' ').replace(/\.\d+Z$/,' UTC'):'Nicht dokumentiert';
const scopeLabel=value=>({own:'Vom übergebenden Betrieb ausgeführt',existing:'Vorhandener Bestand',other:'Von anderem Betrieb ausgeführt'}[value]||'Leistungszuordnung nicht dokumentiert');
const statusLabel=value=>({unknown:'Unbekannt / fehlt',not_applicable:'Nicht zutreffend',n_a:'Nicht zutreffend',optional:'Optional',necessary:'Notwendig'}[value]||value);
const kindLabel=value=>({maintenance:'Wartung',repair:'Reparatur',change:'Änderung',photo:'Foto',document:'Unterlage'}[value]||'Ergänzung');
const effectLabel=value=>({evidence:'Nachweis; ursprünglicher Aufbau bleibt dokumentiert',replaced:'Material / Oberfläche geändert',unknown:'Einfluss auf den Aufbau unbekannt'}[value]||'Einfluss nicht dokumentiert');
const additionsNotice=copy=>copy.additions_status==='not_available'?'Diese Kopie enthält ausschließlich die Originalübergabe. Persönliche Kundenergänzungen sind in diesem Zugriff nicht verfügbar.':copy.additions_included?'Keine Kundenergänzungen vorhanden.':'Diese Kopie enthält ausschließlich die Originalübergabe. Kundenergänzungen wurden für diesen Export ausgeschlossen.';
const productCopy=p=>({...fields(p,['manufacturer','name','color','format','article_number','batch','system_type','sheen']),label_photo:jpeg(p?.label_photo),documents:allowedDocs(p?.documents)});
const prepCopy=value=>(Array.isArray(value)?value:[]).map(group=>({area:str(group.area),label:str(group.label),substrate:group.substrate?fields(group.substrate,['kind','by','custom','company','note']):null,steps:(Array.isArray(group.steps)?group.steps:[]).map(step=>fields(step,['kind','by','custom','company','note']))}));

/** All export data is explicit customer-visible data. No project/session object is spread. */
export function exportCopy(p,{includeAdditions=true,exportedAt=new Date().toISOString()}={}){
 const originalContent=p.handover_snapshot?.content||p.content||{};
 // Keep the existing customer export's care-confirmation rules, then use a stricter attachment allowlist.
 const base=customerCopy({...p,content:originalContent});
 const c=originalContent;
 const originalAreas=Array.isArray(c.areas)?c.areas:[];
 const areas=base.areas.map((a,index)=>{
  const original=originalAreas.find(v=>v.id===a.id)||originalAreas[index]||{};
  const kinds=bathKinds[a.trade]||[];
  const validCare=careValid(original)&&areaConfirmed(original);
  const result={...fields(a,['id','name','position','trade','note','spares','confirmation']),scope:str(original.scope),...(original.scope_company!==undefined?{scope_company:str(original.scope_company)}:{}),roles_status:Object.fromEntries(kinds.map(k=>[k,str(original.roles_status?.[k])])),status_notes:Object.fromEntries(kinds.map(k=>[k,str(original.status_notes?.[k])])),products:Object.fromEntries(kinds.map(k=>[k,productCopy(original.products?.[k])])),
   preparation:prepCopy(original.preparation),photos:photos(original.photos),
   confirmed_by_company:areaConfirmed(original),care:validCare?{...fields(original.care,['text','source','url','document_date','basis']),url:safeLink(original.care?.url)||'',confirmed:true}: {},care_status:validCare?'confirmed':'not_documented'};
  result.confirmation=result.confirmed_by_company?areaBasis(result):'';
  return result;
 });
 const accessibleEvents=p.additions||p.customer_events,additionsAvailable=Array.isArray(accessibleEvents);
 const rawEvents=includeAdditions&&additionsAvailable?accessibleEvents:[];
 const additions=(Array.isArray(rawEvents)?rawEvents:[]).map(record=>{
  const e=record.event||record.data||record;
  return {...fields(record,['id','author_label','recorded_at']),...fields(e,['kind','area_id','occurred_on','description','company','materials','material_role','effect']),photos:photos(e.photos),documents:allowedDocs(e.documents)};
 });
 const company=p.handover_snapshot?.company||p.company||p.company_snapshot||{};
 const project={...fields(c.project,['object_label','completed_on','scope']),gaps_acknowledged:c.project?.gaps_acknowledged===true};
 const general={photos:photos(c.photos),documents:allowedDocs(c.documents),care_notes:Object.fromEntries(knownRoles.filter(k=>typeof c.care_notes?.[k]==='string').map(k=>[k,c.care_notes[k]])),usage_available_at:str(c.usage_available_at),spare_materials:(Array.isArray(c.spare_materials)?c.spare_materials:[]).map(v=>({...fields(v,['material','quantity','location']),photo:jpeg(v.photo)})),legacy_materials:Object.fromEntries(knownRoles.filter(k=>c[k]?.name).map(k=>[k,productCopy(c[k])])),substrate:str(c.substrate),preparation:prepCopy(c.preparation),waterproofing_details:{...fields(c.waterproofing_details,['water_class','type']),photos:photos(c.waterproofing_details?.photos)}};
 return {format:'projektpass-offline-v2',title:str(p.handover_snapshot?.title||p.title),pass_number:p.pass_number==null?'':String(p.pass_number),handed_over_at:str(p.handover_snapshot?.handed_over_at||p.handed_over_at),exported_at:exportedAt,company:fields(company,['name','contact','phone','email','website']),project,areas,general,additions,additions_included:includeAdditions&&additionsAvailable,additions_status:!additionsAvailable?'not_available':includeAdditions?'included':'excluded'};
}

function careAffected(copy,area){
 return copy.additions.filter(e=>e.area_id===area.id&&['repair','change'].includes(e.kind)&&['replaced','unknown'].includes(e.effect)&&(!e.material_role||[area.trade==='tile'?'tile':'surface','finish'].includes(e.material_role)));
}
function extensionHTML(copy){
 return `<section><h2>Leistungsumfang der Originalübergabe</h2><p>${esc(copy.project.scope||'Nicht dokumentiert')}</p><p>Objekt: ${esc(copy.project.object_label||'Nicht dokumentiert')}<br>Fertigstellung: ${esc(copy.project.completed_on||'Nicht dokumentiert')}</p>${copy.areas.map(a=>`<p><strong>${esc(a.name)}</strong> · ${esc(scopeLabel(a.scope))}${careAffected(copy,a).length?'<br><strong>Spätere Änderung: Die Originalpflege ist keine bestätigte Anleitung für den veränderten Aufbau.</strong>':''}</p>`).join('')}</section><section><h2>Spätere Kundenergänzungen</h2><p>Die Originalübergabe bleibt oben erhalten. Diese Einträge wurden nachträglich erfasst; ein benannter ausführender Betrieb ist nicht automatisch der Autor.</p>${copy.additions.map(e=>`<article><h3>${esc(kindLabel(e.kind))} · ${esc(e.occurred_on||'Ereignisdatum unbekannt')}</h3><p>Bereich: ${esc(copy.areas.find(a=>a.id===e.area_id)?.name||'Allgemein / Bereich nicht mehr zugeordnet')}<br>Erfasst von: ${esc(e.author_label||'Kunde; Name nicht dokumentiert')} · ${esc(dateLabel(e.recorded_at))}<br>Ausgeführt von: ${esc(e.company||'Nicht dokumentiert')}</p><p class="preline">${esc(e.description)}</p><p>Material: ${esc(e.materials||'Nicht dokumentiert')}<br>${esc(effectLabel(e.effect))}${e.material_role?' · '+esc(bathNames[e.material_role]||e.material_role):''}</p>${e.photos.map(src=>`<img src="${src}" alt="Foto zur Kundenergänzung">`).join('')}<ul>${e.documents.map(d=>`<li>${esc(d.name||d.type||'Unterlage')} · ${esc(d.source||'Quelle unbekannt')}${d.data?` · <a download="Unterlage.pdf" href="${d.data}">Archivierte PDF</a>`:d.url?` · <a href="${esc(d.url)}" rel="noopener noreferrer">Nur verlinkt – nicht archiviert</a>`:' · Datei fehlt'}</li>`).join('')}</ul></article>`).join('')||`<p>${esc(additionsNotice(copy))}</p>`}</section>`;
}
export function exportHTML(copy){
 // The HTML is one independent file, including photos and PDF attachments as data URLs.
 let html=offlineHTML(copy);
 if(copy.areas.length){const stock=copy.areas.map(a=>answersHTML(a,copy.company)).join('');const marked=copy.areas.map(a=>{let section=answersHTML(a,copy.company).replace('Wie reinige ich diese Oberfläche?','Welche Pflege war zur Originalübergabe dokumentiert?');if(careAffected(copy,a).length)section=section.replace('</h3>','</h3><p><strong>Spätere Änderung: Die Originalpflege ist keine bestätigte Anleitung für den heutigen Aufbau.</strong></p>');const labels=Object.entries(a.products).filter(([,p])=>p.label_photo).map(([role,p])=>`<p>${esc(bathNames[role])} · Etikettenfoto</p><img src="${p.label_photo}" alt="Etikettenfoto zur Originalübergabe">`).join('');return labels?section.replace('</section>',`<details><summary>Etikettenfotos aus der Originalübergabe</summary>${labels}</details></section>`):section;}).join('');html=html.replace(stock,marked);}
 const general=copy.general,otherOriginal=`<section><h2>Weitere Angaben aus der Originalübergabe</h2>${general.substrate?`<p>Untergrund: ${esc(general.substrate)}</p>`:''}${preparationHTML(general.preparation,copy.company.name)}${general.usage_available_at?`<p>Dokumentierte Nutzbarkeit ab: ${esc(general.usage_available_at)}</p>`:''}${general.spare_materials.map(s=>`<p>Restmaterial: ${esc([s.material,s.quantity,s.location].filter(Boolean).join(' · '))}</p>${s.photo?`<img src="${s.photo}" alt="Restmaterial aus der Originalübergabe">`:''}`).join('')}${Object.entries(general.legacy_materials).map(([role,p])=>`<p>Allgemeines Material ohne bestätigte Flächenzuordnung · ${esc(bathNames[role]||role)}: ${esc(productLabel(p))} · ${esc(p.color||'Farbton unbekannt')}</p>${p.label_photo?`<img src="${p.label_photo}" alt="Etikettenfoto zum allgemeinen Material">`:''}`).join('')}${general.waterproofing_details.water_class||general.waterproofing_details.type?`<p>Allgemeine Abdichtungsangaben: ${esc([general.waterproofing_details.water_class,general.waterproofing_details.type].filter(Boolean).join(' · '))}</p>`:''}${general.waterproofing_details.photos.map(src=>`<img src="${src}" alt="Allgemeines Abdichtungsfoto">`).join('')}</section>`;
 return html.replace('<section><h2>Allgemeine übergebene Inhalte</h2>',`${extensionHTML(copy)}${otherOriginal}<section><h2>Allgemeine übergebene Inhalte</h2>`).replace('PROJEKTPASS · Kundenkopie',copy.additions_included?'PROJEKTPASS · Originalübergabe und Ergänzungen':'PROJEKTPASS · Originalübergabe');
}
function decodeDataURL(data){
 const raw=atob(data.slice(data.indexOf(',')+1).replace(/\s/g,''));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
const bytes=value=>typeof value==='string'?encoder.encode(value):new Uint8Array(value);
const hex=value=>[...value].map(v=>v.toString(16).padStart(2,'0')).join('');
async function sha256(value){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(value))));}
let crcTable;
export function crc32(value){
 if(!crcTable)crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
 let crc=0xffffffff;for(const v of value)crc=crcTable[(crc^v)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;
}
function concat(parts){const result=new Uint8Array(parts.reduce((n,v)=>n+v.length,0));let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;}
/** ZIP store format: no CDN, compression worker, or additional browser dependency. */
export function zipFiles(files,date=new Date()){
 if(files.length>65535)throw new Error('Zu viele Dateien für das Offlinepaket.');
 const local=[],central=[];let offset=0;
 const y=Math.max(1980,Math.min(2107,date.getFullYear())),dosDate=((y-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate(),dosTime=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1);
 for(const {name,data} of files){
  const path=encoder.encode(name),body=bytes(data),crc=crc32(body);
  if(body.length>0xffffffff||offset>0xffffffff)throw new Error('Das Offlinepaket ist zu groß.');
  const l=new Uint8Array(30),lv=new DataView(l.buffer);lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);lv.setUint16(10,dosTime,true);lv.setUint16(12,dosDate,true);lv.setUint32(14,crc,true);lv.setUint32(18,body.length,true);lv.setUint32(22,body.length,true);lv.setUint16(26,path.length,true);
  local.push(l,path,body);
  const c=new Uint8Array(46),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(12,dosTime,true);cv.setUint16(14,dosDate,true);cv.setUint32(16,crc,true);cv.setUint32(20,body.length,true);cv.setUint32(24,body.length,true);cv.setUint16(28,path.length,true);cv.setUint32(42,offset,true);central.push(c,path);offset+=l.length+path.length+body.length;
 }
 const directory=concat(central),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,directory.length,true);ev.setUint32(16,offset,true);
 return concat([...local,directory,end]);
}

async function customerPDF(copy){
 const pdf=await PDFDocument.create();pdf.setTitle(`Projektpass · ${copy.title}`);pdf.setSubject(copy.additions_included?'Datierte Originalübergabe und getrennte Kundenergänzungen':'Datierte Originalübergabe; persönliche Kundenergänzungen nicht enthalten');pdf.setAuthor(copy.company.name||'Projektpass');pdf.setCreator('Projektpass · pdf-lib 1.17.1');pdf.setCreationDate(new Date(copy.exported_at));
 const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),green=rgb(.13,.23,.17),muted=rgb(.34,.39,.35);let page,y;
 const safeText=value=>Array.from(String(value??'').replace(/\r/g,'')).map(c=>{if(c==='\n'||c==='\t')return c==='\t'?' ':c;try{font.encodeText(c);return c;}catch{return '?';}}).join('');
 function newPage(){page=pdf.addPage([595.28,841.89]);y=790;page.drawText('PROJEKTPASS · Kundenkopie',{x:42,y:812,size:9,font:bold,color:green});}
 newPage();
 function lines(value,size,width=510,face=font){
  const result=[];for(const raw of safeText(value).split('\n')){let line='';for(const word of raw.split(/\s+/)){if(!word)continue;if(face.widthOfTextAtSize(word,size)>width){if(line){result.push(line);line='';}let part='';for(const char of word){if(face.widthOfTextAtSize(part+char,size)>width){result.push(part);part='';}part+=char;}line=part;continue;}if(line&&face.widthOfTextAtSize(line+' '+word,size)>width){result.push(line);line=word;}else line+=(line?' ':'')+word;}result.push(line);}
  return result;
 }
 function text(value,{size=10,heading=false,color=green,gap=7}={}){const face=heading?bold:font;for(const line of lines(value,size,510,face)){if(y<size+50)newPage();page.drawText(line||' ',{x:42,y,size,font:face,color});y-=size*1.4;}y-=gap;}
 function heading(value,level=2){if(y<120)newPage();text(value,{size:level===1?22:level===2?15:12,heading:true,gap:9});}
 function link(url){if(!url)return;const beforePage=page,beforeY=y;text(url,{size:8,color:muted});if(beforePage===page){const rect=pdf.context.obj([42,y,553,beforeY+10]);const annotation=pdf.context.obj({Type:PDFName.of('Annot'),Subtype:PDFName.of('Link'),Rect:rect,Border:[0,0,0],A:{S:PDFName.of('URI'),URI:PDFString.of(url)}});const annotations=page.node.Annots()||pdf.context.obj([]);annotations.push(pdf.context.register(annotation));page.node.set(PDFName.of('Annots'),annotations);}}
 function documentList(docs){for(const d of docs){text(`${d.name||d.type||'Unterlage'} · ${d.source||'Quelle nicht dokumentiert'} · Stand: ${d.document_date||'unbekannt'}\n${d.data?'PDF-Datei im ZIP archiviert':d.url?'Nur verlinkt; keine Datei im ZIP':'Datei fehlt'}`,{size:9});if(d.url)link(d.url);}}
 function preparationList(groups){for(const group of groups){const label=group.area==='other'?(group.label||'Andere Fläche'):preparationAreas[group.area]||'Bereich unbekannt';for(const [item,base] of [[group.substrate,true],...group.steps.map(v=>[v,false])]){if(!item)continue;const type=item.kind==='other'?item.custom:(base?substrateTypes:preparationTypes)[item.kind]||item.kind;const actor=item.by==='own'?copy.company.name||'Übergebender Betrieb':item.by==='other'?item.company||'Anderer Betrieb':'Unbekannt';text(`${label} · ${base?'Untergrund: ':''}${type}\n${base?'Erstellt durch':'Ausgeführt durch'}: ${actor}${item.note?'\n'+item.note:''}`,{size:9});}}}
 async function image(data,caption){try{const img=await pdf.embedJpg(data),scale=Math.min(510/img.width,210/img.height,1),height=img.height*scale;if(y<height+85)newPage();page.drawImage(img,{x:42,y:y-height,width:img.width*scale,height});y-=height+12;text(caption,{size:8,color:muted});}catch{text(`${caption}: Fotodatei konnte nicht im PDF dargestellt werden. Originaldatei ist im ZIP enthalten.`,{size:8,color:muted});}}
 heading(copy.title||'Badezimmer',1);text(`Datierte Originalübergabe: ${dateLabel(copy.handed_over_at)}\nExportiert: ${dateLabel(copy.exported_at)}\nPassnummer: ${copy.pass_number||'Nicht dokumentiert'}`);
 text([copy.company.name,copy.company.contact,copy.company.phone,copy.company.email,copy.company.website].filter(Boolean).join('\n'));
 heading('Originalübergabe');text(`Objekt: ${copy.project.object_label||'Nicht dokumentiert'}\nFertigstellung: ${copy.project.completed_on||'Nicht dokumentiert'}\nDokumentierter Leistungsumfang: ${copy.project.scope||'Nicht dokumentiert'}`);
 text('Die digitale Übergabe dokumentiert Angaben. Sie ist keine rechtsgeschäftliche Bauabnahme oder Bestätigung der Ausführungsqualität. Fotos belegen keine fachgerechte Ausführung.',{size:9,color:muted});
 for(const a of copy.areas){
  heading(a.name||'Bereich');text(scopeLabel(a.scope)+(a.scope==='other'?' · '+(a.scope_company||'Betrieb unbekannt'):''),{size:9});text(a.confirmed_by_company?'Angaben zur tatsächlichen Verwendung vom Betrieb zur Übergabe bestätigt.':'Tatsächliche Verwendung nicht bestätigt.',{size:9,color:muted});
  if(a.preparation.length){heading('Untergrund und Vorbereitung',3);preparationList(a.preparation);}
  for(const k of bathKinds[a.trade]||[]){const p=a.products[k];if(p?.name){heading(`${bathNames[k]} · ${productLabel(p)}`,3);text([p.color&&`Farbton / Variante: ${p.color}`,p.format&&`Format: ${p.format}`,p.article_number&&`Artikelnummer: ${p.article_number}`,p.batch&&`Charge: ${p.batch}`,p.system_type&&`System: ${p.system_type}`,p.sheen&&`Glanzgrad: ${p.sheen}`].filter(Boolean).join('\n')||'Weitere Produktangaben nicht dokumentiert',{size:9});documentList(p.documents);if(p.label_photo)await image(p.label_photo,`${a.name} · ${bathNames[k]} · Etikettenfoto`);}else{text(`${bathNames[k]}: ${statusLabel(a.roles_status[k])||'Nicht dokumentiert'}${a.status_notes[k]?' · '+a.status_notes[k]:''}`,{size:9});}}
  heading('Pflege aus der Originalübergabe',3);
  if(careAffected(copy,a).length)text('Spätere Änderung dokumentiert: Diese Originalpflege ist keine bestätigte Anleitung für den veränderten Aufbau.',{size:10,heading:true});
  text(a.care.text||'Keine bestätigte Pflegeanweisung zum dokumentierten Aufbau hinterlegt.',{size:9});if(a.care.text){text(`Quelle: ${a.care.source} · Stand: ${a.care.document_date||'Unbekannt'}`,{size:9,color:muted});link(a.care.url);}
  text(`Restmaterial und Lagerort: ${a.spares||'Nicht dokumentiert'}\nBesonderheiten / spätere Arbeiten: ${a.note||'Nicht dokumentiert'}`,{size:9});for(let i=0;i<a.photos.length;i++)await image(a.photos[i],`${a.name} · Projektfoto ${i+1}`);
 }
 if(copy.general.documents.length||copy.general.photos.length||Object.keys(copy.general.legacy_materials).length||copy.general.preparation.length||Object.keys(copy.general.care_notes).length||copy.general.spare_materials.length||copy.general.substrate||copy.general.usage_available_at||copy.general.waterproofing_details.photos.length||copy.general.waterproofing_details.water_class||copy.general.waterproofing_details.type){heading('Allgemeine Originalunterlagen');text('Altunterlagen und allgemeine Angaben ohne bestätigte Flächenzuordnung.',{size:9,color:muted});documentList(copy.general.documents);for(let i=0;i<copy.general.photos.length;i++)await image(copy.general.photos[i],`Allgemeines Projektfoto ${i+1}`);for(const [kind,p] of Object.entries(copy.general.legacy_materials)){text(`${bathNames[kind]||kind}: ${productLabel(p)} · ${p.color||'Farbton unbekannt'}`,{size:9});documentList(p.documents);if(p.label_photo)await image(p.label_photo,`Altbestand · ${bathNames[kind]||kind} · Etikettenfoto`);}preparationList(copy.general.preparation);if(copy.general.substrate)text(`Untergrund: ${copy.general.substrate}`,{size:9});for(const [label,note] of Object.entries(copy.general.care_notes))text(`Allgemeiner Betriebshinweis · ${label}\n${note}`,{size:9});if(copy.general.usage_available_at)text(`Dokumentierte Nutzbarkeit ab: ${copy.general.usage_available_at}`,{size:9});for(const spare of copy.general.spare_materials){text(`Restmaterial: ${[spare.material,spare.quantity,spare.location].filter(Boolean).join(' · ')}`,{size:9});if(spare.photo)await image(spare.photo,'Restmaterial aus der Originalübergabe');}const wd=copy.general.waterproofing_details;if(wd.water_class||wd.type)text(`Allgemeine Abdichtungsangaben: ${[wd.water_class,wd.type].filter(Boolean).join(' · ')}`,{size:9});for(let i=0;i<wd.photos.length;i++)await image(wd.photos[i],`Allgemeines Abdichtungsfoto ${i+1}`);}
 heading('Spätere Kundenergänzungen');text('Original und Ergänzungen bleiben getrennt. Angaben des Kunden sind keine nachträgliche Bestätigung des ursprünglichen Fachbetriebs. Der Autor kann vom benannten ausführenden Betrieb abweichen.',{size:9,color:muted});
 if(!copy.additions.length)text(additionsNotice(copy));
 for(const e of copy.additions){heading(`${kindLabel(e.kind)} · ${e.occurred_on||'Ereignisdatum unbekannt'}`,3);text(`Bereich: ${copy.areas.find(a=>a.id===e.area_id)?.name||'Allgemein / Zuordnung unbekannt'}\nErfasst von: ${e.author_label||'Kunde; Name unbekannt'} · ${dateLabel(e.recorded_at)}\nAusgeführt von: ${e.company||'Nicht dokumentiert'}\n${e.description}\nMaterial: ${e.materials||'Nicht dokumentiert'}\n${effectLabel(e.effect)}${e.material_role?' · '+(bathNames[e.material_role]||e.material_role):''}`,{size:9});documentList(e.documents);for(let i=0;i<e.photos.length;i++)await image(e.photos[i],`Kundenergänzung · Foto ${i+1}`);}
 heading('Unabhängige Sicherung');text('Das ZIP enthält diese PDF, eine lesbare HTML-Kopie, strukturierte JSON-Daten und die archivierten Originaldateien. Nur verlinkte Unterlagen wurden nicht heruntergeladen. Eine Prüfsumme erkennt spätere Dateiänderungen; sie beweist weder Urheberschaft noch fachliche Richtigkeit. Bereits gespeicherte Kopien können nicht zurückgerufen werden.',{size:9});
 const pages=pdf.getPages();for(let i=0;i<pages.length;i++)pages[i].drawText(`${copy.additions_included?'Originalübergabe + getrennte Ergänzungen':'Originalübergabe'} · Seite ${i+1} / ${pages.length}`,{x:42,y:25,size:8,font,color:muted});
 return pdf.save();
}

function attachmentFiles(copy){
 const files=[],references=[],missing=[];let n=0;
 const archive=(data,extension,context)=>{const name=`dateien/${String(++n).padStart(3,'0')}.${extension}`;files.push({name,data:decodeDataURL(data)});references.push({path:name,...context});return name;};
 const document=(d,context)=>{if(d.data)return archive(d.data,'pdf',{...context,label:d.name||d.type||'Unterlage',source:d.source,document_date:d.document_date});missing.push({...context,label:d.name||d.type||'Unterlage',url:d.url,reason:d.url?'Nur verlinkt; nicht archiviert':'Datei fehlt'});return '';};
 const json=structuredClone(copy);
 for(const a of json.areas){a.photos=a.photos.map((data,i)=>({file:archive(data,'jpg',{origin:'original',area_id:a.id,label:`Projektfoto ${i+1}`})}));for(const [role,p] of Object.entries(a.products)){if(p.label_photo)p.label_photo={file:archive(p.label_photo,'jpg',{origin:'original',area_id:a.id,role,label:'Etikettenfoto'})};for(const d of p.documents){const file=document(d,{origin:'original',area_id:a.id,role});delete d.data;if(file)d.file=file;}}}
 json.general.photos=json.general.photos.map((data,i)=>({file:archive(data,'jpg',{origin:'original',label:`Allgemeines Foto ${i+1}`})}));for(const d of json.general.documents){const file=document(d,{origin:'original'});delete d.data;if(file)d.file=file;}
 json.general.waterproofing_details.photos=json.general.waterproofing_details.photos.map((data,i)=>({file:archive(data,'jpg',{origin:'original',label:`Allgemeines Abdichtungsfoto ${i+1}`})}));
 for(const spare of json.general.spare_materials)if(spare.photo)spare.photo={file:archive(spare.photo,'jpg',{origin:'original',label:`Restmaterial: ${spare.material||'nicht benannt'}`})};
 for(const [role,p] of Object.entries(json.general.legacy_materials)){if(p.label_photo)p.label_photo={file:archive(p.label_photo,'jpg',{origin:'original',role,label:'Altbestand Etikettenfoto'})};for(const d of p.documents){const file=document(d,{origin:'original',role});delete d.data;if(file)d.file=file;}}
 for(const e of json.additions){e.photos=e.photos.map((data,i)=>({file:archive(data,'jpg',{origin:'customer_addition',event_id:e.id,area_id:e.area_id,label:`Ergänzungsfoto ${i+1}`})}));for(const d of e.documents){const file=document(d,{origin:'customer_addition',event_id:e.id,area_id:e.area_id});delete d.data;if(file)d.file=file;}}
 return {files,json,references,missing};
}
export async function buildCustomerExport(p,options={}){
 const copy=exportCopy(p,options),attachments=attachmentFiles(copy),pdf=await customerPDF(copy),html=exportHTML(copy);
 const readme=`PROJEKTPASS – unabhängige Kundenkopie\n\n1. ZIP vollständig entpacken.\n2. Projektpass.html oder Projektpass.pdf öffnen. Die HTML-Kopie enthält Fotos und archivierte PDFs direkt.\n3. projektpass.json enthält strukturierte Daten, dateien/ die Originaldateien.\n\nOriginalübergabe: ${dateLabel(copy.handed_over_at)}\nExport: ${dateLabel(copy.exported_at)}\n${copy.additions_included?'Kundenergänzungen dieses Zugriffs sind enthalten.':additionsNotice(copy)}\n\nDie Originalübergabe und spätere Kundenergänzungen sind getrennt. Autor und benannter ausführender Betrieb sind unterschiedliche Angaben. Pflege nach späteren Änderungen ist nicht automatisch weiter gültig.\n\n${attachments.missing.length} Unterlagen sind nicht archiviert. Details stehen in manifest.json. Externe Links benötigen einen erreichbaren Anbieter und Internet. Es wurden keine externen Dateien automatisch nachgeladen.\n\nSHA-256-Prüfsummen in manifest.json erkennen Änderungen, beweisen aber keine Urheberschaft, Ausführungsqualität oder Mängelfreiheit. manifest.json enthält nicht die Prüfsumme seiner eigenen Datei.\n\nDie Kopie benötigt weder Projektpass-Server noch Betriebskonto. Privat sichern; jeder Empfänger kann sämtliche Inhalte lesen. Bereits heruntergeladene Kopien sind nicht widerrufbar.\n`;
 const files=[{name:'Projektpass.pdf',data:pdf},{name:'Projektpass.html',data:encoder.encode(html)},{name:'projektpass.json',data:encoder.encode(JSON.stringify(attachments.json,null,2))},{name:'README.txt',data:encoder.encode(readme)},...attachments.files];
 const manifest={format:'projektpass-offline-manifest-v1',exported_at:copy.exported_at,handed_over_at:copy.handed_over_at,integrity_note:'SHA-256 erkennt Dateiänderungen; kein Urhebernachweis oder Ausführungsnachweis. Die Manifestdatei ist nicht selbst gehasht.',files:await Promise.all(files.map(async f=>({path:f.name,bytes:f.data.length,sha256:await sha256(f.data)}))),archived_attachments:attachments.references,unarchived_documents:attachments.missing};
 files.push({name:'manifest.json',data:encoder.encode(JSON.stringify(manifest,null,2))});
 return {pdf,zip:zipFiles(files,new Date(copy.exported_at)),html,copy,manifest,files};
}
function saveFile(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function mountBathExport(p,{modal},root=document){
 const buttons=root.querySelectorAll('#export,[data-export]');
 for(const button of buttons)button.onclick=async()=>{
  modal('Projektpass unabhängig sichern','<p>PDF und ZIP werden aus den freigegebenen Angaben erstellt. Bitte kurz warten.</p><p role="status" id="export-status">Dateien werden vorbereitet …</p>');
  try{
   const result=await buildCustomerExport(p),missing=result.manifest.unarchived_documents.length;
   modal('Projektpass unabhängig sichern',`<p>Das ZIP enthält die Originalübergabe${result.copy.additions_included?' und getrennte Kundenergänzungen':''}, PDF, HTML, strukturierte Daten und ${result.manifest.archived_attachments.length} archivierte Dateien.${result.copy.additions_included?'':' '+esc(additionsNotice(result.copy))}</p><p>${missing} Unterlagen sind nicht als Datei archiviert. Verlinkte Unterlagen benötigen weiterhin Internet und einen erreichbaren Anbieter.</p><div class="actions"><button class="btn olive wide" id="export-zip">Vollständiges ZIP herunterladen</button><button class="btn wide" id="export-pdf">Lesbare PDF herunterladen</button><button class="btn wide" id="export-html">Einzelne HTML-Kopie herunterladen</button></div><p class="hint">Privat sichern. Bereits heruntergeladene Kopien lassen sich nicht widerrufen. Prüfsummen prüfen Dateien, nicht die Ausführungsqualität.</p><label class="check"><input type="checkbox" id="export-saved"> Ich habe die Kopie auf meinem Gerät gespeichert.</label><p role="status" id="export-status"></p>`);
   document.querySelector('#export-zip').onclick=()=>saveFile('Projektpass-Kundenkopie.zip',result.zip,'application/zip');
   document.querySelector('#export-pdf').onclick=()=>saveFile('Projektpass-Kundenkopie.pdf',result.pdf,'application/pdf');
   document.querySelector('#export-html').onclick=()=>saveFile('Projektpass-Kundenkopie.html',result.html,'text/html;charset=utf-8');
   document.querySelector('#export-saved').onchange=e=>{document.querySelector('#export-status').textContent=e.target.checked?'Speicherung für diese Ansicht bestätigt. Bewahren Sie die Kopie an einem sicheren Ort auf.':'';};
  }catch(error){modal('Kopie konnte nicht erstellt werden',`<p role="alert">${esc(error.message||'Bitte versuchen Sie es erneut. Ihre Originalübergabe bleibt erhalten.')}</p>`);}
 };
}
