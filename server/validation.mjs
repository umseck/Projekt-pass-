import {productKeys} from '../public/trades.mjs';
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
    favorites:Object.fromEntries(productKeys.map(k=>[k,list(v.favorites?.[k],40,product)]))};
}
export function content(value){
  const v=obj(value);const usage=text(v.usage_available_at,40);
  if(usage&&!Number.isFinite(Date.parse(usage)))fail('Bitte ein gültiges Nutzungsdatum wählen.');
  return {trade:trade(v.trade),...fields(v,['application_area','substrate']),...Object.fromEntries(productKeys.map(k=>[k,product(v[k])])),
    usage_available_at:usage,care_notes:care(v.care_notes),
    photos:list(v.photos,8,photo),
    spare_materials:list(v.spare_materials,5,s=>({...fields(s,['material','quantity','location']),photo:photo(s.photo)})),
    documents:list(v.documents,20,d=>({...fields(d,['name','type']),url:url(d.url)}))};
}
export function additions(value){return list(value,30,v=>{
  obj(v);const name=text(v.type,80);if(!name)fail();
  return {id:uuid(v.id),type:name,source_type:'owner',company:fields(v.company,['name','phone']),
    products:list(v.products,20,p=>({...fields(p,['name','manufacturer','model','note']),photo:photo(p.photo),url:url(p.url)}))};
});}
export function validate(op,b){
  obj(b);
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
  if(op==='owner_save')return {token:token(b.token),key:token(b.key),version:version(b.version),additions:additions(b.additions)};
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
  }else if(!['handover','owner_key','delete'].includes(op))fail();
  return args;
}
