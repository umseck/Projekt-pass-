// Shared by the editor, customer view and server. No inferred technical advice.
export const bathKinds={seamless:['surface','finish','waterproofing','silicone'],tile:['tile','adhesive','grout','silicone','waterproofing']};
export const bathNames={surface:'Oberflächensystem',finish:'Versiegelung',waterproofing:'Abdichtung',silicone:'Silikon',tile:'Fliese',adhesive:'Fliesenkleber',grout:'Fugenmasse'};
export const primaryFor=trade=>trade==='tile'?'tile':'surface';
export const productFields=['manufacturer','name','color','format','article_number','batch','system_type','sheen'];
export const productLabel=p=>[p?.manufacturer,p?.name].filter(Boolean).join(' ');
const clean=v=>String(v||'').trim();
const canonicalURL=v=>{try{return v?new URL(clean(v)).href:'';}catch{return clean(v);}};
export const productIdentity=p=>JSON.stringify(productFields.map(k=>clean(p?.[k])));
export const materialBasis=a=>JSON.stringify((bathKinds[a.trade]||[]).map(k=>[k,productIdentity(a.products?.[k])]));
export const careValid=a=>Boolean(a.care?.confirmed&&a.care.text&&a.care.source&&a.care.basis===materialBasis(a));
// Change detector, not an access token or digital signature. Stable across validation.
function revision(value){let x=2166136261,y=5381;for(const c of value){x=Math.imul(x^c.charCodeAt(0),16777619);y=Math.imul(y,33)^c.charCodeAt(0);}return (x>>>0).toString(16)+(y>>>0).toString(16);}
export function areaBasis(a){const values=[clean(a.name),a.position,a.trade,materialBasis(a),a.preparation||[],clean(a.note),clean(a.spares),a.photos||[],bathKinds[a.trade].map(k=>[k,(a.products?.[k]?.documents||[]).map(d=>['name','type','url','source','document_date','data'].map(f=>f==='url'?canonicalURL(d[f]):clean(d[f])))]),['text','source','url','document_date','basis'].map(k=>k==='url'?canonicalURL(a.care?.[k]):clean(a.care?.[k])),a.care?.confirmed===true];if(a.scope||a.roles_status||a.status_notes)values.push(a.scope||'own',...(a.scope_company!==undefined?[clean(a.scope_company)]:[]),bathKinds[a.trade].map(k=>[k,a.roles_status?.[k]||'',clean(a.status_notes?.[k])]));return revision(JSON.stringify(values));}
export const areaConfirmed=a=>Boolean(a.confirmation&&a.confirmation===areaBasis(a));
export function newArea(trade='seamless',template={},name='Badezimmer',position='walls'){
 const products=Object.fromEntries(bathKinds[trade].map(k=>[k,{...structuredClone(template[k]||{}),color:'',batch:'',label_photo:''}]));
 return {id:crypto.randomUUID(),name,position,trade,products,preparation:[],note:'',spares:'',photos:[],care:{},confirmation:''};
}
export function legacyArea(c){
 const trade=c.trade||'tile';
 const a=newArea(trade,{},c.application_area||'Badezimmer',c.application_area==='Boden'?'floor':c.application_area==='Wände & Boden'?'both':'walls');
 a.products=Object.fromEntries(bathKinds[trade].map(k=>[k,structuredClone(c[k]||{})]));
 a.preparation=structuredClone(c.preparation||[]);a.note=c.substrate||'';
 a.spares=(c.spare_materials||[]).map(s=>[s.material,s.quantity,s.location].filter(Boolean).join(' · ')).join('\n');
 // Existing general care and document links are not silently assigned to a product.
 return a;
}
export function replaceProduct(a,kind,next){
 const old=a.products[kind]||{};
 if(productIdentity(old)===productIdentity(next))return false;
 a.products[kind]=structuredClone(next);a.confirmation='';
 if(a.roles_status)a.roles_status[kind]=next.name?'known':'';
 if(a.care?.text)a.care={...a.care,confirmed:false};
 return true;
}
export function areaIssues(a){
 const missing=[];if(!a.name?.trim())missing.push('Fläche benennen');
 if(!a.products?.[primaryFor(a.trade)]?.name&&a.roles_status?.[primaryFor(a.trade)]!=='unknown'&&a.scope!=='existing'&&a.scope!=='other')missing.push('Oberfläche auswählen oder ausdrücklich als unbekannt kennzeichnen');
 if(!areaConfirmed(a))missing.push('Tatsächliche Verwendung bestätigen');
 return missing;
}
export const scopeLabels={own:'Vom Betrieb ausgeführt',existing:'Bestehender Bereich',other:'Von anderem Betrieb ausgeführt'};
export const roleStatus=(a,k)=>a.products?.[k]?.name?'known':a.roles_status?.[k]||'missing';
export const statusLabel=(a,k)=>({unknown:'Unbekannt / nicht dokumentiert',not_applicable:'Nicht zutreffend',missing:'Fehlt / unbekannt',known:'Dokumentiert'})[roleStatus(a,k)];
export function projectIssues(p){const m=p.content?.project;if(!m)return [];const issues=[];if(!clean(p.title))issues.push({field:'title',label:'Projektname fehlt'});for(const [field,label]of [['object_label','Objekt / Bad fehlt'],['completed_on','Fertigstellungsdatum fehlt'],['scope','Leistungsumfang fehlt']])if(!clean(m[field]))issues.push({field,label});return issues;}
export function documentationGaps(areas){return areas.flatMap(a=>{const gaps=[];for(const k of bathKinds[a.trade]){if(!a.products?.[k]?.name&&roleStatus(a,k)!=='not_applicable')gaps.push({area_id:a.id,field:k,label:`${a.name}: ${bathNames[k]} ${statusLabel(a,k).toLowerCase()}`});if(a.products?.[k]?.name&&['tile','surface','grout','silicone'].includes(k)&&!a.products[k].color)gaps.push({area_id:a.id,field:k,label:`${a.name}: Farbton für ${bathNames[k]} fehlt`});}if(!careValid(a))gaps.push({area_id:a.id,field:'care',label:`${a.name}: belegte Pflegeanweisung fehlt`});return gaps;});}
export function answerRows(a){
 const p=a.products?.[primaryFor(a.trade)],materials=bathKinds[a.trade].map(k=>`${bathNames[k]}: ${a.products?.[k]?.name?productLabel(a.products[k])+(a.products[k].color?' · '+a.products[k].color:''):statusLabel(a,k)}`);
 const confirmed=areaConfirmed(a),source=confirmed?'Vom Betrieb dokumentierter Übergabestand':'Vorschlag – tatsächliche Verwendung noch nicht bestätigt';
 return [
  {question:'Was wurde hier verbaut?',answer:materials.join('\n')||'Noch nicht dokumentiert',source},
  {question:'Wie reinige ich diese Oberfläche?',answer:careValid(a)&&confirmed?a.care.text:'Noch nicht dokumentiert',source:careValid(a)&&confirmed?a.care.source:'Keine bestätigte, zum aktuellen Aufbau passende Pflegeanweisung',date:careValid(a)&&confirmed?a.care.document_date:'',url:careValid(a)&&confirmed?a.care.url:''},
  {question:'Welcher Farbton und welche Fugen?',answer:[p?.color?'Oberfläche: '+p.color:'Farbton: Noch nicht dokumentiert',...(a.trade==='tile'?['grout','silicone']:['silicone']).map(k=>a.products?.[k]?.name?`${bathNames[k]}: ${productLabel(a.products[k])} · ${a.products[k].color||'Farbton noch nicht dokumentiert'}`:`${bathNames[k]}: Noch nicht dokumentiert`)].join('\n'),source},
  {question:'Gibt es Ersatzmaterial?',answer:a.spares||'Noch nicht dokumentiert',source},
  {question:'Was ist für spätere Arbeiten hinterlegt?',answer:[a.note||'Besonderheiten: Noch nicht dokumentiert',...bathKinds[a.trade].filter(k=>a.products?.[k]?.batch).map(k=>`${bathNames[k]} · Charge: ${a.products[k].batch}`)].join('\n'),source}
 ];
}
