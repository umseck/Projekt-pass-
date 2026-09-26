import {esc,field,fields,safeLink} from './ui.mjs';
import {mergeDocuments,setCompanyCatalog} from './catalog.mjs';
const key=p=>[p.manufacturer,p.name,p.article_number].map(x=>(x||'').trim().toLocaleLowerCase('de')).join('|');
export function upsertProduct(favorites,kind,item){
 const result=structuredClone(favorites||{}),items=result[kind]||[],index=items.findIndex(p=>key(p)===key(item));
 const clean={...item,color:'',batch:'',label_photo:''};
 if(!clean.manufacturer?.trim()||!clean.name?.trim())throw Error('Bitte zuerst Hersteller und Produkt eintragen.');
 if(index>=0)items[index]=clean;else{if(items.length>=40)throw Error('Für diesen Bereich sind bereits 40 Produkte hinterlegt. Bitte vorhandene Produkte im Betriebsprofil prüfen.');items.push(clean);}
 result[kind]=items;return result;
}
export function saveProductDialog(kind,item,documents,ctx){
 if(!item.manufacturer.trim()||!item.name.trim())throw Error('Bitte zuerst Hersteller und Produkt eintragen.');
 const previous=(ctx.dashboard.company.favorites?.[kind]||[]).find(p=>key(p)===key(item));
 const available=[...new Map([...(previous?.documents||[]),...documents].map(d=>[d.url,d])).values()];
 ctx.modal('Im Betriebskatalog speichern',`<form id="library-product"><p><strong>${esc(item.manufacturer)} ${esc(item.name)}</strong></p><p>Nur für Ihren Betrieb. Farbton, Charge und Fotos bleiben bei dieser Baustelle.</p>${available.length?`<fieldset><legend>Passende Produktunterlagen auswählen</legend>${available.map((d,i)=>`<label class="recipient"><input type="checkbox" name="library-document" value="${i}" ${(previous?.documents||[]).some(x=>x.url===d.url)?'checked':''}> ${esc(d.name||d.type)} <span class="small">${esc(d.url)}</span></label>`).join('')}</fieldset>`:''}${field('Datenblatt-Link (optional)','library-url','','url','placeholder="https://…"')}${field('Bezeichnung der Unterlage','library-document-name','','text','placeholder="Technisches Merkblatt"')}<p class="hint">Nur allgemein gültige Produktunterlagen wählen. Keine Kundenpläne oder Projektfotos.</p><div class="form-message" role="status"></div><button class="btn olive" type="submit">${previous?'Produkt aktualisieren':'Produkt speichern'}</button></form>`);
 ctx.bindForm('#library-product',async form=>{
  const v=fields(form),docs=[...form.querySelectorAll('[name="library-document"]:checked')].map(x=>available[+x.value]);
  if(v['library-url']&&!safeLink(v['library-url']))throw Error('Bitte einen vollständigen http- oder https-Link eingeben.');
  if(v['library-url'])docs.push({name:v['library-document-name']||item.name+' – Unterlage',type:'Produktunterlage',url:v['library-url']});
  const chosen=mergeDocuments([],docs);const favorites=upsertProduct(ctx.dashboard.company.favorites,kind,{...item,documents:chosen});
  ctx.includeDocuments(chosen);
  await ctx.saveProject();
  const result=await ctx.api('company_save',{profile:{...ctx.dashboard.company,favorites},version:ctx.dashboard.company_version});
  Object.assign(ctx.dashboard,result);setCompanyCatalog(ctx.dashboard.company);document.querySelector('#modal').close();ctx.notify('Produkt im Betriebskatalog gespeichert. Das Projekt ist ebenfalls gespeichert.');
 });
}
