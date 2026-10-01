import {productKeys} from '../public/trades.mjs';
import {preparationAreas,substrateTypes,preparationTypes,preparationActors} from '../public/preparation-data.mjs';
import {waterClasses,waterproofingTypes,projectPhotoLimit} from '../public/waterproofing-data.mjs';
import {bathKinds,areaConfirmed,careValid} from '../public/bath-model.mjs';
export class HttpError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
export const fail=(message='Bitte prüfen Sie Ihre Angaben.')=>{throw new HttpError(400,message);};
export function text(value,max=1000){
  if(value==null)return '';
  if(typeof value!=='string'||value.length>max)fail();
  return value.trim();
}
export function uuid(value){if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value||''))fail();return value;}
export function token(value){if(!/^[a-f0-9]{64}$/.test(value||''))fail('Dieser Schlüssel ist nicht gültig.');return value;}
export function email(value){value=text(value,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))fail('Bitte eine gültige E-Mail-Adresse eingeben.');return value;}
export function newPassword(value){if(typeof value!=='string'||value.length<12||new TextEncoder().encode(value).length>72)fail('Bitte ein Passwort mit mindestens 12 Zeichen wählen. Sehr lange Passwörter bitte kürzen.');return value;}
export function version(value){if(!Number.isInteger(value)||value<1)fail();return value;}
export function url(value){value=text(value,1500);if(!value)return '';try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)fail();return u.href;}catch{fail('Bitte einen vollständigen http- oder https-Link eingeben.');}}
function obj(value){if(!value||typeof value!=='object'||Array.isArray(value))fail();return value;}
function list(value,max,fn){if(value==null)return [];if(!Array.isArray(value)||value.length>max)fail();return value.map(fn);}
function fields(value,names){value=obj(value||{});return Object.fromEntries(names.map(n=>[n,text(value[n])]));}
export function photo(value){
  value=text(value,550000);if(!value)return '';
  // Only canvas-produced JPEGs. No SVG, URLs, scripts or third-party tracking pixels.
  if(!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value))fail('Bitte ein komprimiertes Foto wählen.');
  return value;
}
export function logo(value){
  value=text(value,550000);if(!value)return '';
  // Brand logos may be JPEG or PNG. SVG stays blocked because it can contain
  // active content and external references.
  if(!/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))
    fail('Bitte ein PNG- oder JPEG-Logo wählen.');
  return value;
}
export function trade(value){if(value==null)return 'tile';if(!['tile','seamless'].includes(value))fail('Bitte Ihr Gewerk auswählen.');return value;}
export function care(value){return fields(value,productKeys);}
export function product(value){return {...fields(value,['manufacturer','name','color','format','article_number','batch','system_type','sheen']),label_photo:photo(value?.label_photo)};}
export function company(value){
  const v=obj(value);const out=fields(v,['name','contact','phone','email']);
  if(!out.name)fail('Bitte den Firmennamen ergänzen.');
  return {...out,trade:trade(v.trade),onboarding_complete:v.onboarding_complete!==false,website:url(v.website),logo:logo(v.logo),care_notes:care(v.care_notes),
    preferred_manufacturers:[...new Set(list(v.preferred_manufacturers,30,name=>text(name,100)).filter(Boolean))],
    standards:Object.fromEntries(['tile','seamless'].filter(k=>v.standards?.[k]).map(k=>[k,standard(v.standards[k],k)])),
    favorites:Object.fromEntries(productKeys.map(k=>[k,list(v.favorites?.[k],40,p=>({...product(p),documents:list(p?.documents,20,d=>({...fields(d,['name','type']),url:url(d.url)}))}))]))};
}
export function standard(value,kind){
 const v=obj(value);
 const keys=bathKinds[kind];
 return {...Object.fromEntries(keys.map(k=>{const p=product(v[k]);return [k,{...p,color:'',batch:'',label_photo:''}];})),
  area_templates:list(v.area_templates,8,t=>({name:text(t.name,100),position:['walls','floor','both','other'].includes(t.position)?t.position:'walls',trade:trade(t.trade),products:Object.fromEntries(bathKinds[trade(t.trade)].map(k=>{const p=product(t.products?.[k]);return [k,{...p,color:'',batch:'',label_photo:''}];})),care_template:{text:text(t.care_template?.text,2000),source:text(t.care_template?.source,300),url:url(t.care_template?.url),document_date:text(t.care_template?.document_date,80)}})),
  documents:list(v.documents,20,d=>({...fields(d,['name','type']),url:url(d.url)}))};
}
export function content(value){
  const v=obj(value);const usage=text(v.usage_available_at,40);
  if(usage&&!Number.isFinite(Date.parse(usage)))fail('Bitte ein gültiges Nutzungsdatum wählen.');
  const photos=list(v.photos,projectPhotoLimit,photo),details=v.waterproofing_details===undefined?undefined:waterproofingDetails(v.waterproofing_details);
  if(photos.length+(details?.photos.length||0)>projectPhotoLimit)fail('Bitte höchstens 8 Fotos insgesamt für Abdichtung und Übergabe wählen.');
  return {trade:trade(v.trade),...fields(v,['application_area','substrate']),...(v.preparation===undefined?{}:{preparation:preparation(v.preparation)}),...Object.fromEntries(productKeys.map(k=>[k,{...product(v[k]),...(k==='waterproofing'?{color:''}:{})}])),
    ...(details===undefined?{}:{waterproofing_details:details}),
    ...(v.finish_selection===undefined?{}:{finish_selection:['manual','system',''].includes(v.finish_selection)?v.finish_selection:fail('Bitte die Versiegelung erneut auswählen.')}),
    ...(v.areas===undefined?{}:{areas:bathAreas(v.areas)}),
    usage_available_at:usage,care_notes:care(v.care_notes),
    photos,
    spare_materials:list(v.spare_materials,5,s=>({...fields(s,['material','quantity','location']),photo:photo(s.photo)})),
    documents:list(v.documents,20,d=>({...fields(d,['name','type']),url:url(d.url)}))};
}
export function bathDocument(v){
 obj(v);const data=text(v.data,1400000);
 if(data&&!/^data:application\/pdf;base64,JVBER[A-Za-z0-9+/]*={0,2}$/.test(data))fail('Bitte eine PDF-Datei wählen (höchstens 1 MB).');
 return {name:text(v.name,200),type:text(v.type,100),url:url(v.url),source:text(v.source,300),document_date:text(v.document_date,80),data};
}
export function bathAreas(value){
 const seen=new Set();let totalPhotos=0;
 return list(value,8,v=>{
  obj(v);const id=uuid(v.id);if(seen.has(id))fail('Flächen müssen unterschiedliche Kennungen haben.');seen.add(id);
  const kind=trade(v.trade);if(!['walls','floor','both','other'].includes(v.position))fail('Bitte die Lage der Fläche wählen.');
  const a={id,name:text(v.name,100),position:v.position,trade:kind,products:Object.fromEntries(bathKinds[kind].map(k=>[k,{...product(v.products?.[k]),documents:list(v.products?.[k]?.documents,6,bathDocument)}])),
   preparation:preparation(v.preparation),note:text(v.note,2000),spares:text(v.spares,1000),photos:list(v.photos,8,photo),
   care:{text:text(v.care?.text,2000),source:text(v.care?.source,300),url:url(v.care?.url),document_date:text(v.care?.document_date,80),basis:text(v.care?.basis,20000),confirmed:v.care?.confirmed===true},confirmation:text(v.confirmation,2000000)};
  totalPhotos+=a.photos.length;if(totalPhotos>8)fail('Bitte höchstens 8 flächenbezogene Fotos wählen.');
  if(!careValid(a))a.care.confirmed=false;
  if(!areaConfirmed(a))a.confirmation='';
  return a;
 });
}
export function waterproofingDetails(value){
 const v=obj(value),waterClass=text(v.water_class,10),type=text(v.type,20);
 if(waterClass&&!waterClasses.includes(waterClass))fail('Bitte eine gültige Wassereinwirkungsklasse wählen.');
 if(type&&!Object.hasOwn(waterproofingTypes,type))fail('Bitte Dichtbahn oder Dichtmasse wählen.');
 return {water_class:waterClass,type,photos:list(v.photos,projectPhotoLimit,photo)};
}
export function preparation(value){
 const selected=(value,options,message)=>{if(typeof value!=='string'||!Object.hasOwn(options,value))fail(message);return value;};
 const item=(value,base)=>{
  const v=obj(value),kind=selected(v.kind,base?substrateTypes:preparationTypes,'Bitte den Untergrund oder die Vorbereitungsarbeit auswählen.');
  const by=selected(v.by,preparationActors,'Bitte auswählen, wer die Arbeit ausgeführt hat.');
  const custom=kind==='other'?text(v.custom,200):'';if(kind==='other'&&!custom)fail('Bitte den Untergrund oder die Arbeit kurz benennen.');
  return {kind,by,custom,company:by==='other'?text(v.company,200):'',note:text(v.note,500)};
 };
 const seen=new Set();
 return list(value,3,value=>{
  const v=obj(value),area=selected(v.area,preparationAreas,'Bitte einen gültigen Bereich wählen.');
  if(seen.has(area))fail('Bitte jeden Bereich nur einmal dokumentieren.');seen.add(area);
  return {area,label:area==='other'?text(v.label,1000):'',substrate:v.substrate==null?null:item(v.substrate,true),steps:list(v.steps,20,v=>item(v,false))};
 });
}
export function validate(op,b={}){
  b=obj(b);
  if(op==='access_info')return {token:token(b.token)};
  if(op==='access_activate')return {token:token(b.token),email:b.email?email(b.email):'',password:newPassword(b.password)};
  if(op==='operator_list')return {};
  if(op==='operator_create')return {id:uuid(b.id),profile:company(b.profile),use_for_me:b.use_for_me===true};
  if(op==='operator_company')return {id:uuid(b.id)};
  if(op==='operator_save')return {id:uuid(b.id),version:version(b.version),profile:company(b.profile)};
  if(op==='operator_invite')return {id:uuid(b.id),email:email(b.email)};
  if(op==='passes_add'){
    if(!Number.isInteger(b.quantity)||b.quantity<1||b.quantity>100)fail('Bitte eine Anzahl zwischen 1 und 100 wählen.');
    return {id:uuid(b.id),quantity:b.quantity};
  }
  if(op==='scan')return {token:token(b.token)};
  if(op==='bootstrap')return {};
  if(op==='company_save')return {profile:company(b.profile),version:version(b.version)};
  if(op==='activate'){const title=text(b.title,150);if(!title)fail('Wie heißt das Projekt?');return {pass_id:uuid(b.pass_id),title};}
  const args={id:uuid(b.id)};
  if(['project','preview'].includes(op))return args;
  args.version=version(b.version);
  if(op==='save'){
    args.title=text(b.title,150);if(!args.title)fail('Wie heißt das Projekt?');
    args.content=content(b.content);args.internal=fields(b.internal,['customer_name','address']);
  }else if(op==='visibility'){
    if(typeof b.disabled!=='boolean')fail();args.disabled=b.disabled;
  }else if(!['handover','delete'].includes(op))fail();
  return args;
}
