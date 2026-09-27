import {esc,safeLink} from './ui.mjs';
import {systemFinishes} from './system-finish.mjs';
export const categories={tile:'Fliese',grout:'Fugenmörtel',surface:'Oberflächensystem',waterproofing:'Abdichtung',finish:'Versiegelung',silicone:'Anschlussfugen',preparation:'Untergrundvorbereitung',care:'Reinigung & Pflege',accessory:'Zubehör & Gestaltung'};
let cached,companyProducts=[],preferredManufacturers=[];
const makerKey=value=>String(value||'').trim().toLocaleLowerCase('de');
export function setCompanyCatalog(company){
 preferredManufacturers=company?.preferred_manufacturers||[];
 companyProducts=Object.entries(company?.favorites||{}).flatMap(([kind,items])=>(items||[]).filter(p=>p.manufacturer&&p.name).map((p,i)=>({...p,id:'own-'+kind+'-'+i,manufacturer_id:'own-'+p.manufacturer,manufacturer:p.manufacturer,kinds:[kind],source_url:'',note:'Von Ihrem Betrieb hinterlegt. Produktvariante und Unterlagen bitte vor Verwendung prüfen.',documents:(p.documents||[]).map(d=>({...d,verification:'business'}))})));
}

export async function loadCatalog(){
 if(!cached)cached=fetch('/catalog.json',{credentials:'omit'}).then(async r=>{if(!r.ok)throw Error('Der Produktkatalog ist gerade nicht erreichbar. Bitte erneut versuchen.');const c=await r.json();if(c.version!==1||!Array.isArray(c.products))throw Error('Der Produktkatalog konnte nicht geladen werden.');return c;}).catch(e=>{cached=null;throw e;});
 const base=await cached,manufacturers=[...base.manufacturers];
 const own=companyProducts.map(p=>{
  let maker=manufacturers.find(m=>makerKey(m.name)===makerKey(p.manufacturer));
  if(!maker){maker={id:p.manufacturer_id,name:p.manufacturer,note:'Eigene Produkte Ihres Betriebs.',documents:[]};manufacturers.push(maker);}
  const match=[...base.products,...systemFinishes].find(x=>x.manufacturer_id===maker.id&&makerKey(x.name)===makerKey(p.name)&&makerKey(x.article_number)===makerKey(p.article_number)&&x.kinds.every(k=>p.kinds.includes(k)));
  const documents=[...(p.documents||[])];
  for(const d of match?.documents||[])if(!documents.some(x=>x.url===d.url))documents.push(d);
  return {...p,manufacturer_id:maker.id,documents};
 });
 const shared=[...base.products,...systemFinishes].filter(p=>!own.some(x=>x.manufacturer_id===p.manufacturer_id&&makerKey(x.name)===makerKey(p.name)&&makerKey(x.article_number)===makerKey(p.article_number)&&p.kinds.every(k=>x.kinds.includes(k))));
 return {...base,manufacturers,preferred_manufacturers:[...preferredManufacturers],products:[...own,...shared]};
}
export async function productDocuments(kind,item){
 const c=await loadCatalog();
 const maker=c.manufacturers.find(m=>makerKey(m.name)===makerKey(item.manufacturer));
 const match=c.products.find(p=>p.manufacturer_id===maker?.id&&p.kinds.includes(kind)&&makerKey(p.name)===makerKey(item.name)&&makerKey(p.article_number)===makerKey(item.article_number));
 return mergeDocuments(item.documents||[],(match?.documents||[]).filter(d=>d.verification!=='source_link'));
}
export function matchingProducts(c,{manufacturer='',query='',kind=''}={}){
 const q=query.trim().toLocaleLowerCase('de');
 const preferred=new Set((c.preferred_manufacturers||[]).map(makerKey));
 return c.products.filter(p=>{
  const maker=c.manufacturers.find(m=>m.id===p.manufacturer_id);
  return p.kinds.some(k=>Object.hasOwn(categories,k))&&(!manufacturer||(manufacturer==='__preferred'?preferred.has(makerKey(maker?.name)):p.manufacturer_id===manufacturer))&&(!kind||p.kinds.includes(kind))&&(!q||[p.name,maker?.name,p.note].join(' ').toLocaleLowerCase('de').includes(q));
 });
}
export function mergeDocuments(existing,added){
 const merged=existing.map(d=>({...d})),urls=new Set(merged.map(d=>d.url));
 for(const d of added){if(!safeLink(d.url)||urls.has(d.url))continue;merged.push({name:d.name,type:d.type,url:d.url});urls.add(d.url);}
 if(merged.length>20)throw Error('Ein Projektpass kann bis zu 20 Unterlagen enthalten. Bitte vorhandene Links prüfen oder nur das Produkt übernehmen.');
 return merged;
}
const link=(url,label)=>safeLink(url)?`<a href="${esc(safeLink(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'';
function controls(c,kind,picking){
 const makers=c.manufacturers.filter(m=>c.products.some(p=>p.manufacturer_id===m.id&&(!kind||p.kinds.includes(kind))));
 const preferred=new Set((c.preferred_manufacturers||[]).map(makerKey)),mine=makers.filter(m=>preferred.has(makerKey(m.name))),others=makers.filter(m=>!preferred.has(makerKey(m.name)));
 const options=ms=>ms.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
 const manufacturerOptions=mine.length?`<option value="__preferred" selected>Meine Hersteller</option><option value="">Alle Hersteller</option><optgroup label="Meine Hersteller">${options(mine)}</optgroup>${others.length?`<optgroup label="Weitere Hersteller">${options(others)}</optgroup>`:''}`:`<option value="">Alle Hersteller</option>${options(makers)}`;
 return `${picking?'':'<p class="hint">Herstellerprodukte und eigene Produkte Ihres Betriebs.</p>'}<div class="form-grid"><div class="field"><label for="catalog-manufacturer">Hersteller / Anbieter</label><select id="catalog-manufacturer">${manufacturerOptions}</select></div><div class="field"><label for="catalog-query">Produkt suchen</label><input type="search" id="catalog-query" placeholder="z. B. HardRock, Quartz oder Silikon"></div>${kind?'':`<div class="field"><label for="catalog-kind">Bereich</label><select id="catalog-kind"><option value="">Alle Bereiche</option>${Object.entries(categories).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>`}</div>${picking?'<details class="catalog-document-options"><summary>Passende Unterlagen werden mit übernommen</summary><label><input type="checkbox" id="catalog-include-docs" checked> Merkblätter und Pflegeanleitungen übernehmen</label><p class="hint">Vorhandene Links bleiben erhalten. Nach einem Wechsel alte Unterlagen bitte prüfen.</p></details>':''}<div id="catalog-message" role="status"></div>${picking?'<details class="catalog-sources"><summary>Herstellerinformationen</summary><div id="catalog-manufacturer-info"></div></details>':'<div id="catalog-manufacturer-info"></div>'}<p class="small muted" id="catalog-count" aria-live="polite"></p><div id="catalog-results"></div>`;}
function bindCatalog(root,c,{kind='',onPick}={}){
 const $=s=>root.querySelector(s);
 function render(){
  const manufacturer=$('#catalog-manufacturer').value;
  const found=matchingProducts(c,{manufacturer,query:$('#catalog-query').value,kind:kind||$('#catalog-kind')?.value});
  const preferred=new Set((c.preferred_manufacturers||[]).map(makerKey));
  const ms=c.manufacturers.filter(m=>!manufacturer||(manufacturer==='__preferred'?preferred.has(makerKey(m.name)):m.id===manufacturer));
  $('#catalog-manufacturer-info').innerHTML=ms.map(m=>`<details class="catalog-source"><summary>${esc(m.name)} · Quellen & weitere Unterlagen</summary><p class="hint">${esc(m.note||'')}</p><p>${link(m.url,'Offizielle Website')}</p>${(m.documents||[]).map(d=>`<p>${link(d.url,d.name)}</p>`).join('')}</details>`).join('');
  $('#catalog-count').textContent=found.length+' Produkte / Systeme'+(kind?' · '+categories[kind]:'');
  $('#catalog-results').innerHTML=found.map(p=>{
   const m=c.manufacturers.find(m=>m.id===p.manufacturer_id);
   if(onPick)return `<article class="catalog-card catalog-quick"><div class="catalog-quick-row"><div><span class="eyebrow">${esc(m.name)}${p.id.startsWith('own-')?' · Mein Betrieb':''}</span><h3>${esc(p.name)}</h3></div><button class="btn olive" type="button" data-catalog-pick="${esc(p.id)}" aria-label="${esc(m.name+' '+p.name+' übernehmen')}">Übernehmen</button></div><details><summary>Produktinformationen & Unterlagen</summary>${p.note?`<p class="hint">${esc(p.note)}</p>`:''}<p>${link(p.source_url,'Herstellerquelle')}</p><ul class="catalog-docs">${p.documents.map(d=>`<li>${link(d.url,d.name)}${d.verification==='source_link'?' · Abruf nicht bestätigt; keine automatische Übernahme':''}</li>`).join('')}</ul></details></article>`;
   return `<article class="catalog-card"><span class="eyebrow">${esc(m.name)}</span><h3>${esc(p.name)}</h3><p class="small muted">${p.kinds.map(k=>esc(categories[k])).join(' · ')}</p>${p.note?`<p class="hint">${esc(p.note)}</p>`:''}<p>${link(p.source_url,'Herstellerquelle')}</p><ul class="catalog-docs">${p.documents.map(d=>`<li>${link(d.url,d.name)} <span class="small muted">${esc(d.language?.toUpperCase()||'')} · ${esc(d.type)}${d.verification==='business'?' · Vom Betrieb hinterlegt':''}${d.verification==='source_link'?' · Abruf nicht bestätigt; keine automatische Übernahme':''}</span></li>`).join('')}</ul>${p.documents.length?'':'<p class="hint">Noch keine Produktunterlagen hinterlegt.</p>'}${onPick?`<button class="btn olive" type="button" data-catalog-pick="${esc(p.id)}">Produkt übernehmen</button>`:''}</article>`;
  }).join('')||'<p class="empty">Der Produktkatalog ist noch leer oder enthält keine passende Auswahl. Bitte tragen Sie Ihre tatsächlich verwendeten Produkte im Projekt ein.</p>';
  root.querySelectorAll('[data-catalog-pick]').forEach(button=>button.onclick=()=>{
   try{const p=c.products.find(p=>p.id===button.dataset.catalogPick),m=c.manufacturers.find(m=>m.id===p.manufacturer_id);onPick(p,m,$('#catalog-include-docs').checked);}
   catch(e){$('#catalog-message').textContent=e.message;}
  });
 }
 $('#catalog-manufacturer').onchange=render;$('#catalog-query').oninput=render;if($('#catalog-kind'))$('#catalog-kind').onchange=render;render();
}
export async function openCatalogPicker(kind,{modal,onPick,onManual,isCurrent=()=>true}){
 const c=await loadCatalog();if(!isCurrent())return;
 modal(categories[kind]+' auswählen',`<div id="catalog-picker">${controls(c,kind,true)}${onManual?'<button type="button" class="btn light wide spaced" id="catalog-manual">Produkt nicht dabei? Selbst eintragen →</button>':''}</div>`);
 bindCatalog(document.querySelector('#catalog-picker'),c,{kind,onPick});
 if(onManual)document.querySelector('#catalog-manual').onclick=onManual;
}
export async function catalogPage({shell,isCurrent=()=>true}){
 const c=await loadCatalog();if(!isCurrent())return;
 shell(`<section class="admin-title"><span class="eyebrow">Materialien für Ihr Bad</span><h1>Produkte & Unterlagen.</h1><p class="intro">Wählen Sie aus den vorbereiteten Produkten. Eigene Produkte ergänzen Sie direkt im Projekt über „Im Betriebskatalog speichern“.</p><div id="catalog-browser">${controls(c,'',false)}</div></section>`);
 bindCatalog(document.querySelector('#catalog-browser'),c);
}
