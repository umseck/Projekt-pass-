import {bathKinds,productFields,materialUsed,careValid,areaConfirmed,areaBasis,productIdentity} from './bath-model.mjs';
import {safeLink,labelPhoto} from './ui.mjs';
import {pdfBytes} from './file-integrity.mjs';
const strings=(v,keys)=>Object.fromEntries(keys.map(k=>[k,typeof v?.[k]==='string'?v[k]:'']));
const array=v=>Array.isArray(v)?v:[];
const companyFields=['name','contact','phone','email','website'];
export function publicDocument(d){
 if(!d||d.visibility==='internal')return null;
 const o=strings(d,['id','name','type','source','document_date','language','market','checked_at']);o.url=safeLink(d.url);o.data='';
 if(d.data){try{pdfBytes(d.data);o.data=d.data;}catch{o.file_error='Datei ist unvollständig oder nicht als statische PDF lesbar; nicht im Export enthalten.';}}
 o.status=o.data?'Vom Betrieb archiviert':o.url?'Nur extern verlinkt':'Datei fehlt';o.visibility='public';
 // Integrity metadata is reconstructed by the server/exporter, never trusted from arbitrary input.
 if(o.data&&d.integrity&&Number.isInteger(d.integrity.size)&&/^[a-f0-9]{64}$/.test(d.integrity.sha256||''))o.integrity={filename:o.name,mime:'application/pdf',size:d.integrity.size,sha256:d.integrity.sha256};
 return o;
}
function publicProduct(p){return {...strings(p,productFields),label_photo:labelPhoto(p?.label_photo),documents:array(p?.documents).map(publicDocument).filter(Boolean)};}
function publicPreparation(items){return array(items).map(a=>({area:a.area,label:a.label||'',substrate:a.substrate?strings(a.substrate,['kind','by','custom','company','note']):null,steps:array(a.steps).map(s=>strings(s,['kind','by','custom','company','note']))}));}
export function publicArea(a){
 const used=bathKinds[a.trade]?.filter(k=>materialUsed(a,k))||[],confirmed=areaConfirmed(a),valid=careValid(a)&&(a.records||areaConfirmed(a));
 const o={...strings(a,['id','name','position','trade','note','spares']),products:Object.fromEntries((bathKinds[a.trade]||[]).map(k=>[k,used.includes(k)?publicProduct(a.products[k]):{}])),preparation:publicPreparation(a.preparation),photos:[],care:{},confirmation:''};
 array(a.photos).forEach((p,i)=>{if(a.photo_notes?.[i]?.visibility!=='internal'&&labelPhoto(p))o.photos.push(p);});
 if(a.records){
  o.records=Object.fromEntries(bathKinds[a.trade].map(k=>{const r=a.records[k]||{},v=strings(r,['ownership','status','source','confirmed_by','confirmed_at']);v.basis=used.includes(k)?productIdentity(o.products[k]):'';if(!used.includes(k))v.status='planned';return [k,v];}));
  o.expected_photos=array(a.expected_photos).filter(v=>typeof v==='string');
  o.photo_notes=array(a.photos).flatMap((p,i)=>a.photo_notes?.[i]?.visibility==='internal'||!labelPhoto(p)?[]:[{...strings(a.photo_notes?.[i],['stage','caption']),visibility:'public'}]);
 }
 if(valid){o.care={...strings(a.care,['text','source','url','document_date','basis','source_kind','document_id','confirmed_by','confirmed_at']),confirmed:true};if(a.care.depends_on)o.care.depends_on=[...a.care.depends_on];}
 if(a.records&&o.care.confirmed&&!careValid(o))o.care={};
 // Explicit redaction can change the review fingerprint without changing the original statement.
 if(confirmed)o.confirmation=areaBasis(o);
 return o;
}
export function publicContent(c={}){
 const out={...strings(c,['trade','application_area','substrate','usage_available_at']),photos:array(c.photos).filter(labelPhoto),documents:array(c.documents).map(publicDocument).filter(Boolean),preparation:publicPreparation(c.preparation)};
 if(Array.isArray(c.areas)){
  out.areas=c.areas.map(publicArea);
  // Project-wide standard products/care are not evidence when areas are the source of truth.
  out.care_notes={};out.spare_materials=[];
 }else{
  for(const k of ['tile','surface','finish','waterproofing','grout','silicone','primer'])out[k]=publicProduct(c[k]);
  out.care_notes=strings(c.care_notes,['tile','surface','finish','waterproofing','grout','silicone','primer']);
  out.spare_materials=array(c.spare_materials).map(v=>({...strings(v,['material','quantity','location']),photo:labelPhoto(v.photo)}));
  if(c.waterproofing_details)out.waterproofing_details={...strings(c.waterproofing_details,['type','water_class']),photos:array(c.waterproofing_details.photos).filter(labelPhoto)};
 }
 return out;
}
export function publicCustomerProject(p={}){
 const snapshot=p.handover_snapshot,content=publicContent(snapshot?.content||p.content||{}),companySource=snapshot?.company||p.company||p.company_snapshot||{};
 const out={};for(const k of ['id','title','pass_number','activated_at','handed_over_at','version'])if(p[k]!==undefined)out[k]=p[k];
 if(snapshot?.title)out.title=snapshot.title;
 if(p.content||snapshot?.content)out.content=content;
 if(p.company||snapshot?.company||p.company_snapshot)out.company={...strings(companySource,companyFields),website:safeLink(companySource.website),logo:labelPhoto(companySource.logo)};
 if(snapshot)out.handover_snapshot={title:out.title,handed_over_at:snapshot.handed_over_at||p.handed_over_at||'',activated_at:snapshot.activated_at||p.activated_at||'',company:out.company,content,legacy:snapshot.legacy===true};
 return out;
}
