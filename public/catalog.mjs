import {esc,safeLink} from './ui.mjs';
export const categories={surface:'Oberflächensystem',primer:'Grundierung',waterproofing:'Abdichtung',finish:'Versiegelung',silicone:'Anschlussfugen',preparation:'Untergrundvorbereitung',care:'Reinigung & Pflege',accessory:'Zubehör & Gestaltung'};
let cached;
export async function loadCatalog(){
 if(!cached)cached=fetch('/catalog.json',{credentials:'omit'}).then(async r=>{if(!r.ok)throw Error('Der Produktkatalog ist gerade nicht erreichbar. Bitte erneut versuchen.');const c=await r.json();if(c.version!==1||!Array.isArray(c.products))throw Error('Der Produktkatalog konnte nicht geladen werden.');return c;}).catch(e=>{cached=null;throw e;});
 return cached;
}
export function matchingProducts(c,{manufacturer='',query='',kind=''}={}){
 const q=query.trim().toLocaleLowerCase('de');
 return c.products.filter(p=>(!manufacturer||p.manufacturer_id===manufacturer)&&(!kind||p.kinds.includes(kind))&&(!q||[p.name,c.manufacturers.find(m=>m.id===p.manufacturer_id)?.name,p.note].join(' ').toLocaleLowerCase('de').includes(q)));
}
export function mergeDocuments(existing,added){
 const merged=existing.map(d=>({...d})),urls=new Set(merged.map(d=>d.url));
 for(const d of added){if(!safeLink(d.url)||urls.has(d.url))continue;merged.push({name:d.name,type:d.type,url:d.url});urls.add(d.url);}
 if(merged.length>20)throw Error('Ein Projektpass kann bis zu 20 Unterlagen enthalten. Bitte vorhandene Links prüfen oder nur das Produkt übernehmen.');
 return merged;
}
const link=(url,label)=>safeLink(url)?`<a href="${esc(safeLink(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'';
function controls(c,kind,picking){return `<p class="hint">Herstellerangaben, Stand ${esc(c.checked_at)}. Produktvariante und Eignung für Ihr Projekt bitte anhand der Unterlagen prüfen.</p><div class="form-grid"><div class="field"><label for="catalog-manufacturer">Hersteller / Anbieter</label><select id="catalog-manufacturer"><option value="">Alle Hersteller</option>${c.manufacturers.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select></div><div class="field"><label for="catalog-query">Produkt suchen</label><input type="search" id="catalog-query" placeholder="z. B. HardRock, Quartz oder Primer"></div>${kind?'':`<div class="field"><label for="catalog-kind">Bereich</label><select id="catalog-kind"><option value="">Alle Bereiche</option>${Object.entries(categories).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>`}</div>${picking?'<p><label><input type="checkbox" id="catalog-include-docs" checked> Abrufbare Herstellerunterlagen in den Projektpass übernehmen</label></p><p class="hint">Vorhandene Unterlagen bleiben erhalten. Nach einem Produktwechsel bitte nicht mehr zugehörige Links aus der Liste entfernen.</p>':''}<div id="catalog-message" role="status"></div><div id="catalog-manufacturer-info"></div><p class="small muted" id="catalog-count" aria-live="polite"></p><div id="catalog-results"></div>`;}
function bindCatalog(root,c,{kind='',onPick}={}){
 const $=s=>root.querySelector(s);
 function render(){
  const manufacturer=$('#catalog-manufacturer').value;
  const found=matchingProducts(c,{manufacturer,query:$('#catalog-query').value,kind:kind||$('#catalog-kind')?.value});
  const ms=c.manufacturers.filter(m=>!manufacturer||m.id===manufacturer);
  $('#catalog-manufacturer-info').innerHTML=ms.map(m=>`<details class="catalog-source"><summary>${esc(m.name)} · Quellen & weitere Unterlagen</summary><p class="hint">${esc(m.note||'')}</p><p>${link(m.url,'Offizielle Website')}</p>${(m.documents||[]).map(d=>`<p>${link(d.url,d.name)}</p>`).join('')}</details>`).join('');
  $('#catalog-count').textContent=found.length+' Produkte / Systeme'+(kind?' · '+categories[kind]:'');
  $('#catalog-results').innerHTML=found.map(p=>{
   const m=c.manufacturers.find(m=>m.id===p.manufacturer_id);
   return `<article class="catalog-card"><span class="eyebrow">${esc(m.name)}</span><h3>${esc(p.name)}</h3><p class="small muted">${p.kinds.map(k=>esc(categories[k])).join(' · ')}</p>${p.note?`<p class="hint">${esc(p.note)}</p>`:''}<p>${link(p.source_url,'Herstellerquelle')}</p><ul class="catalog-docs">${p.documents.map(d=>`<li>${link(d.url,d.name)} <span class="small muted">${esc(d.language?.toUpperCase()||'')} · ${esc(d.type)}${d.verification==='source_link'?' · Abruf nicht bestätigt; keine automatische Übernahme':''}</span></li>`).join('')}</ul>${p.documents.length?'':'<p class="hint">Kein eindeutig zugeordnetes öffentliches Datenblatt hinterlegt.</p>'}${onPick?`<button class="btn olive" type="button" data-catalog-pick="${esc(p.id)}">Produkt übernehmen</button>`:''}</article>`;
  }).join('')||'<p class="empty">Kein passendes Produkt gefunden. Sie können Ihre Produktangaben weiterhin frei eintragen.</p>';
  root.querySelectorAll('[data-catalog-pick]').forEach(button=>button.onclick=()=>{
   try{const p=c.products.find(p=>p.id===button.dataset.catalogPick),m=c.manufacturers.find(m=>m.id===p.manufacturer_id);onPick(p,m,$('#catalog-include-docs').checked);}
   catch(e){$('#catalog-message').textContent=e.message;}
  });
 }
 $('#catalog-manufacturer').onchange=render;$('#catalog-query').oninput=render;if($('#catalog-kind'))$('#catalog-kind').onchange=render;render();
}
export async function openCatalogPicker(kind,{modal,onPick,isCurrent=()=>true}){
 const c=await loadCatalog();if(!isCurrent())return;
 modal(categories[kind]+' auswählen',`<div id="catalog-picker">${controls(c,kind,true)}</div>`);
 bindCatalog(document.querySelector('#catalog-picker'),c,{kind,onPick});
}
export async function catalogPage({shell,isCurrent=()=>true}){
 const c=await loadCatalog();if(!isCurrent())return;
 shell(`<section class="admin-title"><span class="eyebrow">Fugenlose Oberflächen</span><h1>Produkte & Unterlagen.</h1><p class="intro">Im Projekt können Sie Produkte auswählen und die zugeordneten Herstellerunterlagen übernehmen.</p><div id="catalog-browser">${controls(c,'',false)}</div></section>`);
 bindCatalog(document.querySelector('#catalog-browser'),c);
}
