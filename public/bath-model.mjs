// Shared by the editor, customer view and server. No inferred technical advice.
export const bathKinds={seamless:['surface','finish','waterproofing','silicone'],tile:['tile','adhesive','grout','silicone','waterproofing']};
export const bathNames={surface:'Oberflächensystem',finish:'Versiegelung',waterproofing:'Abdichtung',silicone:'Silikon',tile:'Fliese',adhesive:'Fliesenkleber',grout:'Fugenmasse'};
export const primaryFor=trade=>trade==='tile'?'tile':'surface';
export const productFields=['manufacturer','name','color','format','article_number','batch','system_type','sheen'];
export const productLabel=p=>[p?.manufacturer,p?.name].filter(Boolean).join(' ');
export const productIdentity=p=>JSON.stringify(productFields.map(k=>p?.[k]||''));
export const materialBasis=a=>JSON.stringify((bathKinds[a.trade]||[]).map(k=>[k,productIdentity(a.products?.[k])]));
export const careValid=a=>Boolean(a.care?.confirmed&&a.care.text&&a.care.source&&a.care.basis===materialBasis(a));
// Change detector, not an access token or digital signature. Stable across validation.
function revision(value){let x=2166136261,y=5381;for(const c of value){x=Math.imul(x^c.charCodeAt(0),16777619);y=Math.imul(y,33)^c.charCodeAt(0);}return (x>>>0).toString(16)+(y>>>0).toString(16);}
export function areaBasis(a){return revision(JSON.stringify([a.name||'',a.position,a.trade,materialBasis(a),a.preparation||[],a.note||'',a.spares||'',a.photos||[],bathKinds[a.trade].map(k=>[k,(a.products?.[k]?.documents||[]).map(d=>['name','type','url','source','document_date','data'].map(f=>d[f]||''))]),['text','source','url','document_date','basis'].map(k=>a.care?.[k]||''),a.care?.confirmed===true]));}
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
 if(a.care?.text)a.care={...a.care,confirmed:false};
 return true;
}
export function areaIssues(a){
 const missing=[];if(!a.name?.trim())missing.push('Fläche benennen');
 if(!a.products?.[primaryFor(a.trade)]?.name)missing.push('Oberfläche auswählen');
 if(!areaConfirmed(a))missing.push('Tatsächliche Verwendung bestätigen');
 return missing;
}
export function answerRows(a){
 const p=a.products?.[primaryFor(a.trade)],materials=bathKinds[a.trade].filter(k=>a.products?.[k]?.name).map(k=>`${bathNames[k]}: ${productLabel(a.products[k])}${a.products[k].color?' · '+a.products[k].color:''}`);
 const confirmed=areaConfirmed(a),source=confirmed?'Vom Fachbetrieb zur Übergabe bestätigt':'Vorschlag – tatsächliche Verwendung noch nicht bestätigt';
 return [
  {question:'Was wurde hier verbaut?',answer:materials.join('\n')||'Noch nicht dokumentiert',source},
  {question:'Wie reinige ich diese Oberfläche?',answer:careValid(a)&&confirmed?a.care.text:'Noch nicht dokumentiert',source:careValid(a)&&confirmed?a.care.source:'Keine bestätigte, zum aktuellen Aufbau passende Pflegeanweisung',date:careValid(a)&&confirmed?a.care.document_date:'',url:careValid(a)&&confirmed?a.care.url:''},
  {question:'Welcher Farbton und welche Fugen?',answer:[p?.color?'Oberfläche: '+p.color:'Farbton: Noch nicht dokumentiert',...['grout','silicone'].map(k=>a.products?.[k]?.name?`${bathNames[k]}: ${productLabel(a.products[k])} · ${a.products[k].color||'Farbton noch nicht dokumentiert'}`:`${bathNames[k]}: Noch nicht dokumentiert`)].join('\n'),source},
  {question:'Gibt es Ersatzmaterial?',answer:a.spares||'Noch nicht dokumentiert',source},
  {question:'Was ist für spätere Arbeiten hinterlegt?',answer:[a.note||'Besonderheiten: Noch nicht dokumentiert',...bathKinds[a.trade].filter(k=>a.products?.[k]?.batch).map(k=>`${bathNames[k]} · Charge: ${a.products[k].batch}`)].join('\n'),source}
 ];
}
