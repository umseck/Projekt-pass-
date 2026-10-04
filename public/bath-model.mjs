// Shared domain rules; confirmations document statements, never technical suitability.
export const bathKinds={seamless:['surface','finish','waterproofing','silicone'],tile:['tile','adhesive','grout','silicone','waterproofing']};
export const bathNames={surface:'Oberflächensystem',finish:'Schlussversiegelung',waterproofing:'Abdichtung',silicone:'Silikon',tile:'Fliese',adhesive:'Fliesenkleber',grout:'Fugenmörtel'};
export const ownershipNames={own:'Von uns ausgeführt',external:'Von anderem Betrieb ausgeführt',existing:'Vorhandener Altbestand',not_performed:'Nicht ausgeführt',unknown:'Produkt / Aufbau unbekannt'};
export const photoStages={before:'Vorher',substrate:'Untergrund',preparation:'Vorbereitung',waterproofing:'Abdichtung',layer:'Zwischenschicht',finished:'Fertige Oberfläche',detail:'Detail',repair:'Schaden / Reparatur',unassigned:'Arbeitsschritt nicht zugeordnet'};
export const primaryFor=trade=>trade==='tile'?'tile':'surface';
export const productFields=['manufacturer','name','color','format','article_number','batch','system_type','sheen'];
export const productLabel=p=>[p?.manufacturer,p?.name].filter(Boolean).join(' ');
const clean=v=>String(v||'').trim();
const canonicalURL=v=>{try{return v?new URL(clean(v)).href:'';}catch{return clean(v);}};
export const productIdentity=p=>JSON.stringify(productFields.map(k=>clean(p?.[k])));
// A stable change detector, not a signature or access credential.
function revision(value){let x=2166136261,y=5381;for(const c of value){x=Math.imul(x^c.charCodeAt(0),16777619);y=Math.imul(y,33)^c.charCodeAt(0);}return (x>>>0).toString(16)+(y>>>0).toString(16);}
export function enableRecords(a){
 if(a.records)return a;
 a.records=Object.fromEntries(bathKinds[a.trade].map(k=>[k,{ownership:'own',status:'planned',basis:'',source:'',confirmed_by:'',confirmed_at:''}]));
 a.confirmation='';if(a.care)a.care.confirmed=false;
 a.expected_photos=['before','finished'];a.photo_notes=(a.photos||[]).map(()=>({stage:'unassigned',caption:'',visibility:'public'}));
 return a;
}
export function materialUsed(a,k){
 const p=a.products?.[k],r=a.records?.[k];
 if(!p?.name)return false;
 if(!a.records)return areaConfirmed(a);
 return Boolean(r&&['own','external','existing'].includes(r.ownership)&&r.status==='used'&&r.basis===productIdentity(p)&&p.manufacturer&&(['external','existing'].includes(r.ownership)?r.source?.trim():true));
}
export function confirmMaterial(a,k,by='',at=''){
 enableRecords(a);const p=a.products?.[k],r=a.records[k];
 if(!p?.manufacturer?.trim()||!p?.name?.trim())throw Error('Hersteller und genaue Produktvariante ergänzen.');
 if(!['own','external','existing'].includes(r.ownership))throw Error('Für unbekannte oder nicht ausgeführte Leistungen ist keine Materialbestätigung möglich.');
 if(r.ownership!=='own'&&!r.source?.trim())throw Error('Fremdnachweis beziehungsweise Quelle des Altbestands ergänzen.');
 Object.assign(r,{status:'used',basis:productIdentity(p),confirmed_by:by,confirmed_at:at});a.confirmation='';
}
export function setOwnership(a,k,ownership){
 if(!Object.hasOwn(ownershipNames,ownership))throw Error('Unbekannter Leistungsumfang.');enableRecords(a);
 Object.assign(a.records[k],{ownership,status:'planned',basis:'',confirmed_by:'',confirmed_at:''});a.confirmation='';
 if(a.care&&!careValid(a))a.care.confirmed=false;
}
export function careRoles(a){return a.care?.depends_on?.length?a.care.depends_on:(a.trade==='seamless'?['surface','finish']:['tile','grout']);}
export function materialBasis(a){
 if(!a.records)return JSON.stringify((bathKinds[a.trade]||[]).map(k=>[k,productIdentity(a.products?.[k])]));
 // Colour and batch are traceability fields, not automatically care dependencies.
 return JSON.stringify(careRoles(a).map(k=>[k,['manufacturer','name','article_number','system_type','sheen'].map(f=>clean(a.products?.[k]?.[f])),a.records[k]?.ownership||'unknown',
  (a.products?.[k]?.documents||[]).filter(d=>d.id&&d.id===a.care?.document_id).map(d=>[d.id,d.document_date||'',revision(d.data||''),canonicalURL(d.url)])]));
}
export function careValid(a){
 if(!(a.care?.confirmed&&a.care.text&&a.care.source&&a.care.basis===materialBasis(a)))return false;
 if(!a.records)return true;
 if(!careRoles(a).every(k=>materialUsed(a,k)))return false;
 if(a.care.source_kind==='manufacturer'&&(!a.care.document_id||!careRoles(a).some(k=>(a.products?.[k]?.documents||[]).some(d=>d.id===a.care.document_id&&d.visibility!=='internal'))))return false;
 return true;
}
export function areaBasis(a){return revision(JSON.stringify([clean(a.name),a.position,a.trade,JSON.stringify(bathKinds[a.trade].map(k=>[k,productIdentity(a.products?.[k])])),a.preparation||[],clean(a.note),clean(a.spares),a.photos||[],bathKinds[a.trade].map(k=>[k,(a.products?.[k]?.documents||[]).map(d=>['name','type','url','source','document_date','data',...(a.records?['id','visibility']:[])].map(f=>f==='url'?canonicalURL(d[f]):clean(d[f])))]),['text','source','url','document_date','basis'].map(k=>k==='url'?canonicalURL(a.care?.[k]):clean(a.care?.[k])),a.care?.confirmed===true,
 ...(a.records?[[a.care?.source_kind||'business',a.care?.document_id||'',a.care?.depends_on||[]],bathKinds[a.trade].map(k=>[k,...['ownership','status','basis','source'].map(f=>clean(a.records[k]?.[f]))]),a.expected_photos||[],(a.photo_notes||[]).map(n=>[n.stage,n.caption,n.visibility])]:[])]));}
export const areaConfirmed=a=>Boolean(a.confirmation&&a.confirmation===areaBasis(a));
export function newArea(trade='seamless',template={},name='Badezimmer',position='walls'){
 const products=Object.fromEntries(bathKinds[trade].map(k=>[k,{...structuredClone(template[k]||{}),color:'',batch:'',label_photo:''}]));
 return {id:crypto.randomUUID(),name,position,trade,products,preparation:[],note:'',spares:'',photos:[],care:{},confirmation:''};
}
export function legacyArea(c){
 const trade=c.trade||'tile';const a=newArea(trade,{},c.application_area||'Badezimmer',c.application_area==='Boden'?'floor':c.application_area==='Wände & Boden'?'both':'walls');
 a.products=Object.fromEntries(bathKinds[trade].map(k=>[k,structuredClone(c[k]||{})]));a.preparation=structuredClone(c.preparation||[]);a.note=c.substrate||'';
 a.spares=(c.spare_materials||[]).map(s=>[s.material,s.quantity,s.location].filter(Boolean).join(' · ')).join('\n');return a;
}
export function replaceProduct(a,kind,next){
 const old=a.products[kind]||{};if(productIdentity(old)===productIdentity(next)&&JSON.stringify(old.documents||[])===JSON.stringify(next.documents||[]))return false;
 a.products[kind]=structuredClone(next);a.confirmation='';
 if(a.records&&productIdentity(old)!==productIdentity(next)){Object.assign(a.records[kind],{status:'planned',basis:'',confirmed_by:'',confirmed_at:''});}
 if(a.care?.text&&a.care.basis!==materialBasis(a))a.care.confirmed=false;return true;
}
export function changeProductField(a,k,f,value){replaceProduct(a,k,{...a.products[k],[f]:clean(value)});}
export function areaIssues(a){
 const missing=[];if(!a.name?.trim())missing.push('Fläche benennen');
 if(!a.records&&!a.products?.[primaryFor(a.trade)]?.name)missing.push('Oberfläche auswählen');
 if(!areaConfirmed(a))missing.push(a.records?'Bestätigte Angaben und sichtbare Lücken prüfen':'Tatsächliche Verwendung bestätigen');return missing;
}
export function scopeMessage(a,k){
 const r=a.records?.[k],label=bathNames[k];
 if(!r)return materialUsed(a,k)?'Vom Betrieb bestätigt':'Tatsächliche Verwendung nicht bestätigt';
 if(r.ownership==='not_performed')return label+': Nicht ausgeführt.';
 if(r.ownership==='external')return `${label} durch einen anderen Betrieb ausgeführt. ${materialUsed(a,k)?'Angaben aus Fremdnachweis: '+r.source:'Produkt und Aufbau sind in diesem Projektpass nicht dokumentiert.'}`;
 if(r.ownership==='existing')return label+': Vorhandener Altbestand, nicht von uns bearbeitet. '+(materialUsed(a,k)?'Quelle: '+r.source:'Produkt und Aufbau nicht dokumentiert.');
 if(r.ownership==='unknown')return label+': Produkt / Aufbau unbekannt.';
 return label+': '+(materialUsed(a,k)?'Vom Betrieb als tatsächlich verwendet bestätigt.':'Tatsächliche Verwendung nicht bestätigt.');
}
export function photoGaps(a){
 return (a.expected_photos||[]).filter(stage=>!(a.photo_notes||[]).some((n,i)=>n.stage===stage&&n.visibility!=='internal'&&a.photos?.[i])).map(stage=>`${photoStages[stage]||stage}: Foto fehlt.`);
}
export function qualityStatements(a){
 const ks=bathKinds[a.trade],used=ks.filter(k=>materialUsed(a,k)),expected=ks.filter(k=>a.records?.[k]?.ownership!=='not_performed');
 const docs=used.flatMap(k=>a.products[k].documents||[]).filter(d=>d.visibility!=='internal');
 return [`Materialangaben: ${used.length} bestätigt / belegt; ${expected.length-used.length} nicht dokumentiert oder unbestätigt.`,
  `Fotodokumentation: ${(a.photos||[]).filter((_,i)=>a.photo_notes?.[i]?.visibility!=='internal').length} Fotos. ${photoGaps(a).join(' ')}`,
  `Unterlagen und Pflege: ${docs.filter(d=>d.data).length} Dateien, ${docs.filter(d=>!d.data&&d.url).length} nur verlinkt. Pflege ${careValid(a)?'bestätigt':'ungeklärt'}.`];
}
export function answerRows(a){
 const ks=bathKinds[a.trade],published=ks.filter(k=>materialUsed(a,k)),p=materialUsed(a,primaryFor(a.trade))?a.products[primaryFor(a.trade)]:null;
 const materials=published.map(k=>`${bathNames[k]}: ${productLabel(a.products[k])}${a.products[k].color?' · '+a.products[k].color:''}${a.records?.[k]?.ownership!=='own'&&a.records?' · '+ownershipNames[a.records[k].ownership]:''}`);
 const valid=careValid(a)&&(a.records||areaConfirmed(a)),source=a.records?'Angaben und Herkunft je Material ausgewiesen':areaConfirmed(a)?'Vom Fachbetrieb zur Übergabe bestätigt':'Tatsächliche Verwendung noch nicht bestätigt';
 return [
  {question:'Was wurde hier verbaut?',answer:materials.join('\n')||'Keine tatsächlich verwendeten Produkte bestätigt.',source},
  {question:'Wie reinige ich diese Oberfläche?',answer:valid?a.care.text:a.records?'Für diese Oberfläche ist im Projektpass noch keine bestätigte Pflegeanweisung hinterlegt. Bitte wenden Sie sich an den ausführenden Betrieb.':'Noch nicht dokumentiert',source:valid?`${a.care.source_kind==='manufacturer'?'Herstellerquelle':a.care.source_kind==='external'?'Fremdnachweis':'Individueller Betriebshinweis'}: ${a.care.source}`:'Keine bestätigte, zum aktuellen Aufbau passende Pflegeanweisung',date:valid?a.care.document_date:'',url:valid?a.care.url:''},
  {question:'Welcher Farbton und welche Fugen?',answer:[p?.color?'Oberfläche: '+p.color:'Farbton: Noch nicht dokumentiert',...['grout','silicone'].filter(k=>ks.includes(k)).map(k=>materialUsed(a,k)?`${bathNames[k]}: ${productLabel(a.products[k])} · ${a.products[k].color||'Farbton noch nicht dokumentiert'}`:scopeMessage(a,k))].join('\n'),source},
  {question:'Gibt es Ersatzmaterial?',answer:a.spares||'Noch nicht dokumentiert',source},
  {question:'Was ist für spätere Arbeiten hinterlegt?',answer:[a.note||'Besonderheiten: Noch nicht dokumentiert',...published.filter(k=>a.products[k].batch).map(k=>`${bathNames[k]} · Charge: ${a.products[k].batch}`)].join('\n'),source},
  {question:'Welche Informationen fehlen oder stammen von anderen?',answer:ks.map(k=>scopeMessage(a,k)).concat(photoGaps(a)).join('\n'),source:'Offener Dokumentationsumfang – keine Vollständigkeits- oder Normprüfung'}
 ];
}
