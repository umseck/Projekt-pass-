import {esc,field,safeLink} from '../core/ui.mjs';
import {names,tradeFor} from '../shared/trades.mjs';
const identity=p=>[p.manufacturer,p.name,p.article_number].map(v=>(v||'').trim().toLocaleLowerCase('de')).join('|');
export function createFavoritesEditor(root,initial,{modal,openCatalogPicker,onChange=()=>{}}){
 const favorites=structuredClone(initial||{});let trade='',editing=null,removed=null;
 const $=s=>root.querySelector(s);
 const notify=text=>{$('[data-favorites-status]').textContent=text;};
 function pending(){if(!editing)return false;root.closest('details').open=true;$('[data-favorite-error]').textContent='Bitte zuerst übernehmen oder abbrechen.';$('#favorite-maker').focus();return true;}
 function commit(kind,item,index=null){
  const items=favorites[kind]||[];
  if(!item.manufacturer?.trim()||!item.name?.trim())throw Error('Bitte Hersteller und Produktname ergänzen.');
  const duplicate=items.findIndex((p,i)=>i!==index&&identity(p)===identity(item));
  if(duplicate>=0)throw Error('Dieses Produkt ist bereits in Ihrer Liste. Sie können es dort bearbeiten.');
  if(index===null&&items.length>=40)throw Error('In diesem Bereich sind bereits 40 Produkte gespeichert.');
  if(index===null)items.push(item);else items[index]=item;
  favorites[kind]=items;editing=null;removed=null;onChange();render();notify('Änderung übernommen. Bitte unten „Betriebsprofil speichern“.');
 }
 function editorHTML(kind,index){
  const p=index===null?{}:favorites[kind][index];
  return `<div class="favorite-edit"><div class="form-grid">${field('Hersteller','favorite-maker',p.manufacturer,'text','maxlength="1000"')}${field('Produktname','favorite-name',p.name,'text','maxlength="1000"')}</div><details><summary>Weitere Angaben & Unterlagen</summary>${field('Artikelnummer (optional)','favorite-article',p.article_number)}${kind==='tile'?field('Format (optional)','favorite-format',p.format):''}${kind==='surface'?field('Systemart (optional)','favorite-system',p.system_type):''}${kind==='finish'?field('Glanzgrad (optional)','favorite-sheen',p.sheen):''}${kind!=='waterproofing'?field('Bevorzugter Farbton (optional)','favorite-color',p.color):''}${(p.documents||[]).map(d=>`<p class="hint">${safeLink(d.url)?`<a href="${esc(safeLink(d.url))}" target="_blank" rel="noopener noreferrer">${esc(d.name||d.type)} ↗</a>`:esc(d.name||d.type)}</p>`).join('')}<p class="hint">Vorhandene Produktunterlagen bleiben erhalten. Neue Produkte samt Unterlagen können Sie aus dem Katalog auswählen.</p></details><p class="error" data-favorite-error role="alert"></p><div class="row"><button type="button" class="btn olive" data-favorite-apply>Übernehmen</button><button type="button" class="btn text" data-favorite-cancel>Abbrechen</button></div></div>`;
 }
 function render(){
  const kinds=trade?tradeFor(trade).products:[];
  root.innerHTML=`<p class="hint">Ihre häufig verwendeten Produkte zuerst. Änderungen gelten nach dem Speichern für Ihre Produktauswahl; bestehende Projekte und Ihr Standardaufbau bleiben erhalten.</p>${kinds.length?'':'<p>Bitte zuerst Ihr Gewerk auswählen.</p>'}${kinds.map(kind=>`<section class="favorite-group" data-product-kind="${kind}"><h3>${esc(names[kind])}</h3>${(favorites[kind]||[]).map((p,i)=>`<div class="favorite-row"><div><strong>${esc([p.manufacturer,p.name].filter(Boolean).join(' '))}</strong><small>${esc([p.article_number,p.color,p.format].filter(Boolean).join(' · '))}</small></div><div class="row"><button type="button" class="btn text" data-favorite-edit="${kind}:${i}" aria-label="${esc(p.name+' bearbeiten')}">Bearbeiten</button><button type="button" class="btn text" data-favorite-delete="${kind}:${i}" aria-label="${esc(p.name+' entfernen')}">Entfernen</button></div></div>${editing?.kind===kind&&editing.index===i?editorHTML(kind,i):''}`).join('')||'<p class="hint">Noch keine Produkte hinterlegt.</p>'}${editing?.kind===kind&&editing.index===null?editorHTML(kind,null):''}<div class="row"><button type="button" class="btn light" data-favorite-catalog="${kind}">+ Aus Katalog auswählen</button><button type="button" class="btn text" data-favorite-new="${kind}">Eigenes Produkt</button></div></section>`).join('')}<p data-favorites-status role="status"></p>${removed?'<button type="button" class="btn text" data-favorite-undo>Entfernen rückgängig machen</button>':''}`;
  root.querySelectorAll('[data-favorite-edit]').forEach(b=>b.onclick=()=>{if(pending())return;const [kind,i]=b.dataset.favoriteEdit.split(':');editing={kind,index:Number(i)};render();$('#favorite-maker').focus();});
  root.querySelectorAll('[data-favorite-new]').forEach(b=>b.onclick=()=>{if(pending())return;editing={kind:b.dataset.favoriteNew,index:null};render();$('#favorite-maker').focus();});
  root.querySelectorAll('[data-favorite-delete]').forEach(b=>b.onclick=()=>{if(pending())return;const [kind,i]=b.dataset.favoriteDelete.split(':');removed={kind,index:Number(i),item:favorites[kind].splice(Number(i),1)[0]};editing=null;onChange();render();notify('Aus Ihrer Auswahl entfernt. Bestehende Projekte bleiben erhalten.');});
  if($('[data-favorite-undo]'))$('[data-favorite-undo]').onclick=()=>{if(pending())return;favorites[removed.kind].splice(removed.index,0,removed.item);removed=null;onChange();render();};
  if($('[data-favorite-cancel]'))$('[data-favorite-cancel]').onclick=()=>{editing=null;render();};
  if($('[data-favorite-apply]'))$('[data-favorite-apply]').onclick=()=>{
   const {kind,index}=editing,p=index===null?{}:favorites[kind][index];
   const item={...p,manufacturer:$('#favorite-maker').value.trim(),name:$('#favorite-name').value.trim(),article_number:$('#favorite-article').value.trim()};
   for(const [key,id] of [['format','format'],['system_type','system'],['sheen','sheen'],['color','color']])if($('#favorite-'+id))item[key]=$('#favorite-'+id).value.trim();
   try{commit(kind,item,index);}catch(e){$('[data-favorite-error]').textContent=e.message;}
  };
  root.querySelectorAll('[data-favorite-catalog]').forEach(b=>b.onclick=async()=>{
   if(pending())return;b.disabled=true;const kind=b.dataset.favoriteCatalog;
   try{await openCatalogPicker(kind,{modal,isCurrent:()=>root.isConnected,onPick:(p,m,includeDocs)=>{
    const item={manufacturer:m.name,name:p.name,article_number:p.article_number||'',format:p.format||'',system_type:p.system_type||'',sheen:p.sheen||'',color:'',batch:'',label_photo:'',documents:includeDocs?(p.documents||[]).filter(d=>d.verification!=='source_link').map(({name,type,url})=>({name,type,url})):[]};
    commit(kind,item);document.querySelector('#modal').close();
   }});}catch(e){if(root.isConnected)notify(e.message);}finally{if(b.isConnected)b.disabled=false;}
  });
 }
 return {setTrade(value){if(pending())return false;trade=value;render();return true;},read(){if(pending())throw Error('Bitte das bearbeitete Produkt erst übernehmen oder abbrechen.');return structuredClone(favorites);}};
}
