import {bathKinds,materialUsed,areaConfirmed,areaBasis,careValid,productIdentity} from '../public/bath-model.mjs';
import {fileInfo} from '../public/file-integrity.mjs';
import {fail} from './validation.mjs';
export async function prepareBathSave(next,previous,actor,now=new Date().toISOString()){
 let count=(next.photos||[]).length+(next.waterproofing_details?.photos||[]).length;
 for(const a of next.areas||[]){
  count+=(a.photos||[]).length;
  const reviewed=areaConfirmed(a),old=(previous?.areas||[]).find(v=>v.id===a.id);
  if(a.records)for(const k of bathKinds[a.trade]){
   const r=a.records[k],before=old?.records?.[k];
   if(r.status==='used'&&!materialUsed(a,k))fail('Bestätigung für '+a.name+' / '+k+' passt nicht zum Produkt oder Fremdnachweis.');
   if(r.status==='used'){
    const unchanged=before&&materialUsed(old,k)&&before.basis===r.basis&&before.ownership===r.ownership&&before.source===r.source;
    r.confirmed_by=unchanged?before.confirmed_by:'Betrieb';r.confirmed_at=unchanged?before.confirmed_at:now;
    r.confirmed_actor=unchanged?before.confirmed_actor:actor;
   }else{r.confirmed_by='';r.confirmed_at='';}
  }
  if(a.records&&a.care?.confirmed){
   const same=old?.care?.confirmed&&['text','source','url','document_date','basis','source_kind','document_id'].every(k=>(old.care[k]||'')===(a.care[k]||''));
   if(!same&&!careValid(a))fail('Bitte erst Produkte und genaue Pflegequelle bestätigen.');
   a.care.confirmed_by=same?old.care.confirmed_by:'Betrieb';a.care.confirmed_at=same?old.care.confirmed_at:now;
  }
  for(const k of bathKinds[a.trade])for(const d of a.products[k]?.documents||[])if(d.data)d.integrity=await fileInfo(d.data,d.name,'application/pdf');
  if(reviewed)a.confirmation=areaBasis(a);
 }
 if(count>8)fail('Höchstens 8 Fotos insgesamt: allgemeine, Abdichtungs- und Flächenfotos werden gemeinsam gezählt.');
 return next;
}
