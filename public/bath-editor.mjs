import {esc,field,area,compress} from './ui.mjs';
import {createAutosave} from './autosave.mjs';
import {createPreparationEditor} from './preparation.mjs';
import {openCatalogPicker} from './catalog.mjs';
import {paletteFor} from './color-palettes.mjs';
import {defaultFinish} from './system-finish.mjs';
import {bathKinds,bathNames,newArea,legacyArea,replaceProduct,productLabel,materialBasis,careValid,areaBasis,areaConfirmed,areaIssues,primaryFor} from './bath-model.mjs';
const areaChoice=a=>({walls:'Wände',floor:'Boden',both:'Wände & Boden',other:'Andere Fläche'})[a.position];
const kindLabel=k=>bathNames[k]||k;
export async function bathEditor(id,ctx){
 const {api,shell,modal,go,dashboard,setDirty=()=>{},isCurrent=()=>true}=ctx;
 let p=await api('project',{id});if(!isCurrent())return;
 if(p.status==='handed_over'){go('p/'+p.token);return;}
 const content=structuredClone(p.content),trade=content.trade||'tile';
 if(!content.areas?.length){
  const templates=dashboard.company.standards?.[trade]?.area_templates;
  content.areas=templates?.length&&p.version===1?templates.map(t=>newArea(t.trade,t.products,t.name,t.position)):[legacyArea(content)];
 }
 const areas=content.areas;let selected=0,step=0,prep,busy=0,disposed=false;
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 shell(`<section id="bath-editor"><a class="btn text" href="#work/${esc(id)}">← Projekt / Bauphase</a><p class="eyebrow">Flächenbezogene Übergabe · Pilot</p><h1>Ihr Bad. Klar übergeben.</h1><p class="hint">Üblichen Aufbau prüfen, Abweichungen ergänzen, tatsächliche Verwendung bestätigen.</p><nav class="bath-progress" aria-label="Arbeitsschritte">${['Projekt','Aufbau prüfen','Übergabe'].map((label,i)=>`<button class="btn text" data-bath-step="${i}">${i+1}. ${label}</button>`).join('')}</nav><div id="bath-body"></div><p id="bath-error" class="error" role="alert"></p><div class="sticky"><span id="bath-save" role="status"></span><button class="btn olive" id="bath-next">Weiter →</button></div></section>`,{compact:true});
 const autosave=createAutosave({read:()=>({title:p.title,content,internal:p.internal||{}}),write:async data=>{const saved=await api('save',{id:p.id,version:p.version,...data});p.version=saved.version;},ready:()=>busy===0,
  onState:(state,error)=>{setDirty(state!=='saved');if(disposed)return;$('#bath-save').textContent={pending:'Noch nicht gespeichert',saving:'Wird gespeichert …',saved:'Gespeichert',error:'Nicht gespeichert'}[state];$('#bath-error').textContent=error?.message||'';}});
 const changed=()=>{setDirty(true);autosave.changed();};
 const collectPrep=()=>{if(prep){try{areas[selected].preparation=prep.read();return true;}catch(e){$('#bath-error').textContent=e.message;return false;}}return true;};
 const act=fn=>async()=>{try{await fn();}catch(e){$('#bath-error').textContent=e.message;}};
 function productRow(a,k){
  const item=a.products[k]||{},palette=paletteFor(k,item.manufacturer,item.name),color=['surface','tile','grout','silicone'].includes(k),custom=item.color&&!palette?.colors.includes(item.color);
  return `<section class="bath-product"><div class="row between"><div><strong>${kindLabel(k)}</strong><p>${esc(productLabel(item)||'Noch nicht dokumentiert')}</p></div><button type="button" class="btn light" data-bath-product="${k}">${item.name?'Ändern':'Auswählen'}</button></div>${item.name&&color?`<div class="field"><label for="bath-color-${k}">Farbton</label>${palette?`<select id="bath-palette-${k}" data-bath-palette="${k}"><option value="">Farbton wählen</option>${palette.colors.map(v=>`<option ${item.color===v?'selected':''}>${esc(v)}</option>`).join('')}<option value="__custom__" ${custom?'selected':''}>Anderer Farbton / Sonderfarbe</option></select>`:''}<input id="bath-color-${k}" data-bath-color="${k}" value="${esc(item.color||'')}" placeholder="Farbton / Sonderfarbe" ${palette&&!custom?'hidden':''}></div>`:''}${item.name?`<details><summary>Charge, Variante & Unterlagen (optional)</summary>${field('Charge','bath-batch-'+k,item.batch)}${field('Variante / Artikel','bath-article-'+k,item.article_number)}${k==='tile'?field('Format','bath-format-'+k,item.format):''}<ul>${(item.documents||[]).map((d,i)=>`<li>${esc(d.name)} · ${d.data?'PDF gespeichert':'nur verlinkt'}${d.document_date?' · '+esc(d.document_date):''}<button class="btn text" data-doc-remove="${k}:${i}" type="button">Entfernen</button></li>`).join('')}</ul><label class="field">PDF archivieren (max. 1 MB)<input type="file" data-bath-pdf="${k}" accept="application/pdf"></label><button type="button" class="btn text" data-doc-link="${k}">+ Unterlage / Quelle verlinken</button><button class="btn text" type="button" data-product-clear="${k}">Produkt entfernen</button></details>`:''}</section>`;
 }
 function render(){
  if(disposed)return;prep=null;const a=areas[selected];
  $$('[data-bath-step]').forEach(b=>{b.setAttribute('aria-current',+b.dataset.bathStep===step?'step':'false');});
  $('#bath-next').textContent=step===2?'Angaben bestätigt – übergeben':'Weiter →';
  if(step===0){
   $('#bath-body').innerHTML=`${field('Wie heißt das Projekt?','bath-title',p.title,'text','maxlength="150"')}<p class="hint">Die Fläche wird im nächsten Schritt benannt. Ein Standard ist nur ein Vorschlag, keine Bestätigung.</p>`;
   $('#bath-title').oninput=e=>{p.title=e.target.value;changed();};return;
  }
  if(step===2){
   $('#bath-body').innerHTML=`<h2>Das bekommt Ihr Kunde</h2><p>Bitte bestätigen Sie die tatsächlich verwendeten Materialien je Fläche. Keine Bestätigung fachgerechter Ausführung oder rechtliche Abnahme.</p>${areas.map((item,i)=>`<section class="bath-review"><h3>${esc(item.name||'Unbenannte Fläche')}</h3>${bathKinds[item.trade].map(k=>`<p>${kindLabel(k)}: ${esc(productLabel(item.products[k])||'Noch nicht dokumentiert')}${item.products[k]?.color?' · '+esc(item.products[k].color):''}</p>`).join('')}<p>${careValid(item)?'Pflegequelle bestätigt':'Pflege: Noch nicht dokumentiert / nicht bestätigt'}</p><p>${item.photos.length} Fotos · ${(Object.values(item.products).flatMap(p=>p.documents||[])).filter(d=>!d.data).length} Unterlagen nur verlinkt</p><button class="btn text" data-review-area="${i}">Angaben ändern</button><label class="bath-confirm"><input type="checkbox" data-confirm-area="${i}" ${areaConfirmed(item)?'checked':''}> Ich bestätige die eingetragenen, tatsächlich verwendeten Materialien für diese Fläche.</label></section>`).join('')}<p class="hint">Fehlende optionale Angaben bleiben für den Kunden sichtbar als „Noch nicht dokumentiert“.</p><details><summary>Aufbau für künftige Projekte merken</summary><p>Übernimmt nur Flächenbezeichnung, Lage und Produkte. Keine Farben, Chargen, Kundendaten, Fotos, Ausführungsnotizen oder Bestätigungen.</p><button class="btn light" id="bath-standard">Als meinen Standard speichern</button><p id="bath-standard-status" role="status"></p></details>`;
   $$('[data-review-area]').forEach(b=>b.onclick=()=>{selected=+b.dataset.reviewArea;step=1;render();});
   $$('[data-confirm-area]').forEach(b=>b.onchange=()=>{const item=areas[+b.dataset.confirmArea];item.confirmation=b.checked?areaBasis(item):'';changed();});
   $('#bath-standard').onclick=act(async()=>{
    const profile=structuredClone(dashboard.company);profile.standards||={};profile.standards[trade]={...areas[0].products,area_templates:areas.map(a=>({name:a.name,position:a.position,trade:a.trade,products:a.products}))};
    const saved=await api('company_save',{profile,version:dashboard.company_version});Object.assign(dashboard,saved);$('#bath-standard-status').textContent='Standard gespeichert. Bestehende Projekte bleiben unverändert.';
   });return;
  }
  $('#bath-body').innerHTML=`<div class="row"><div class="field"><label for="bath-area">Welche Fläche bearbeiten Sie?</label><select id="bath-area">${areas.map((v,i)=>`<option value="${i}" ${i===selected?'selected':''}>${esc(v.name||'Neue Fläche')}</option>`).join('')}</select></div><button class="btn text" id="bath-add">+ Fläche</button></div>${field('Fläche','bath-area-name',a.name,'text','placeholder="z. B. Duschwand" maxlength="100"')}<div class="field"><label for="bath-position">Wo?</label><select id="bath-position">${Object.entries({walls:'Wand',floor:'Boden',both:'Wand & Boden – gleicher Aufbau',other:'Andere Fläche'}).map(([k,v])=>`<option value="${k}" ${k===a.position?'selected':''}>${v}</option>`).join('')}</select></div><p class="hint">${areaConfirmed(a)?'Verwendung bestätigt. Änderungen müssen erneut bestätigt werden.':'Aufbau vorgeschlagen – tatsächliche Verwendung bei der Übergabe bestätigen.'}</p>${bathKinds[a.trade].map(k=>productRow(a,k)).join('')}<details id="bath-preparation"><summary>Untergrund & Vorbereitung ergänzen</summary><div id="bath-prep"></div></details><details><summary>Pflegeantwort hinterlegen (optional)</summary><p class="hint">Nur fachlich geprüfte, für den aktuellen Aufbau geltende Angaben. Keine automatische Ableitung aus Produktnamen.</p>${area('Kurze Reinigungsanweisung','bath-care-text',a.care?.text)}${field('Quelle / fachlich verantwortlicher Betrieb','bath-care-source',a.care?.source)}${field('Quellenlink (optional)','bath-care-url',a.care?.url,'url')}${field('Dokumentstand (falls bekannt)','bath-care-date',a.care?.document_date)}<label class="bath-confirm"><input type="checkbox" id="bath-care-confirm" ${careValid(a)?'checked':''}> Inhalt fachlich geprüft und passend zu diesem Aufbau.</label><p id="bath-care-status" role="status">${a.care?.text&&!careValid(a)?'Noch nicht bestätigt / nach Produktwechsel erneut prüfen.':''}</p></details><details><summary>Fotos & Besonderheiten ergänzen</summary><label class="field">Fotos für den Kunden (empfohlen)<input type="file" id="bath-photos" multiple accept="image/*"></label><div class="gallery">${a.photos.map((photo,i)=>`<div><img alt="Freigegebenes Flächenfoto" src="${photo}"><button class="btn text" data-photo-remove="${i}">Entfernen</button></div>`).join('')}</div>${area('Hinweise für spätere Arbeiten','bath-note',a.note)}${field('Ersatzmaterial – was und wo?','bath-spares',a.spares)}<p class="hint">Diese Angaben und Fotos werden an Kunden übergeben. Keine internen Notizen eintragen.</p></details>${areas.length>1?'<button class="btn text" id="bath-remove">Diese Fläche entfernen</button>':''}`;
  prep=createPreparationEditor($('#bath-prep'),a.preparation,{choice:areaChoice(a),customLabel:a.name,onChange:()=>{if(collectPrep()){a.confirmation='';changed();}}});
  $('#bath-area').onchange=e=>{if(!collectPrep()){e.target.value=selected;return;}selected=+e.target.value;render();};
  $('#bath-area-name').oninput=e=>{a.name=e.target.value;a.confirmation='';changed();};
  $('#bath-position').onchange=e=>{if(!collectPrep()){e.target.value=a.position;return;}a.position=e.target.value;prep.setArea(areaChoice(a),a.name);a.preparation=prep.read();a.confirmation='';changed();};
  $('#bath-add').onclick=()=>{if(!collectPrep())return;if(areas.length>=8){$('#bath-error').textContent='Bis zu 8 Flächen pro Bad.';return;}areas.push(newArea(trade,dashboard.company.standards?.[trade]||{},'Neue Fläche'));selected=areas.length-1;changed();render();};
  if($('#bath-remove'))$('#bath-remove').onclick=()=>{if(confirm('Diese Fläche mit ihren Angaben aus diesem Entwurf entfernen?')){areas.splice(selected,1);selected=0;changed();render();}};
  $$('[data-bath-product]').forEach(b=>b.onclick=act(async()=>{
   if(!collectPrep())return;const k=b.dataset.bathProduct;
   const apply=(product,manufacturer,includeDocs=true)=>{
    const next={...product,manufacturer:manufacturer.name,color:'',batch:'',label_photo:'',documents:includeDocs?(product.documents||[]).filter(d=>d.verification!=='source_link').map(d=>({name:d.name,type:d.type,url:d.url,source:manufacturer.name,document_date:d.document_date||'',data:''})):[]};
    // Re-selecting the exact same named variant preserves project-specific colour/charge.
    const old=a.products[k];if(old?.name===next.name&&old?.manufacturer===next.manufacturer&&(old.article_number||'')===(next.article_number||'')){$('#modal').close();return;}
    replaceProduct(a,k,next);
    if(k==='surface'){const finish=defaultFinish(next);replaceProduct(a,'finish',finish?{...finish,documents:(finish.documents||[]).map(d=>({...d,source:finish.manufacturer}))}:{});}
    $('#modal').close();changed();render();
   };
   await openCatalogPicker(k,{modal,isCurrent:()=>!disposed,onPick:apply,onManual:()=>{
    modal('Produkt selbst eintragen',`<form id="bath-manual">${field('Hersteller','manual-maker','','text','required')}${field('Produkt / genaue Variante','manual-name','','text','required')}<button class="btn olive" type="submit">Übernehmen</button></form>`);
    $('#bath-manual').onsubmit=e=>{e.preventDefault();apply({name:$('#manual-name').value,documents:[]},{name:$('#manual-maker').value});};
   }});
  }));
  const productChange=(k,f,value)=>{a.products[k][f]=value;a.confirmation='';if(a.care?.text)a.care.confirmed=false;$('#bath-care-confirm').checked=false;$('#bath-care-status').textContent=a.care?.text?'Aufbau geändert – Pflege erneut prüfen.':'';changed();};
  $$('[data-bath-color]').forEach(e=>e.oninput=()=>productChange(e.dataset.bathColor,'color',e.value));
  $$('[data-bath-palette]').forEach(e=>e.onchange=()=>{const k=e.dataset.bathPalette,input=$('#bath-color-'+k);input.hidden=e.value!=='__custom__';if(e.value==='__custom__'){input.focus();return;}input.value=e.value;productChange(k,'color',e.value);});
  for(const k of bathKinds[a.trade])for(const [fieldName,suffix] of [['batch','batch'],['article_number','article'],['format','format']]){const el=$('#bath-'+suffix+'-'+k);if(el)el.oninput=()=>productChange(k,fieldName,el.value);}
  $$('[data-product-clear]').forEach(b=>b.onclick=()=>{replaceProduct(a,b.dataset.productClear,{});changed();render();});
  $$('[data-doc-remove]').forEach(b=>b.onclick=()=>{const [k,i]=b.dataset.docRemove.split(':');a.products[k].documents.splice(+i,1);a.confirmation='';changed();render();});
  $$('[data-doc-link]').forEach(b=>b.onclick=()=>{
   const k=b.dataset.docLink;modal('Unterlage zuordnen',`<form id="bath-document">${field('Bezeichnung','doc-name','','text','required')}${field('Link','doc-url','','url','required')}${field('Quelle','doc-source',a.products[k].manufacturer)}${field('Dokumentstand (falls bekannt)','doc-date')}<button class="btn olive" type="submit">Zuordnen</button></form>`);
   $('#bath-document').onsubmit=e=>{e.preventDefault();const docs=a.products[k].documents||=[];if(docs.length>=6){return;}docs.push({name:$('#doc-name').value,type:'Unterlage',url:$('#doc-url').value,source:$('#doc-source').value,document_date:$('#doc-date').value,data:''});a.confirmation='';$('#modal').close();changed();render();};
  });
  $$('[data-bath-pdf]').forEach(input=>input.onchange=act(async()=>{
   const f=input.files[0];if(!f)return;if(f.size>1000000)throw Error('PDF bitte auf höchstens 1 MB verkleinern.');
   const docs=a.products[input.dataset.bathPdf].documents||=[];if(docs.length>=6)throw Error('Bis zu 6 Unterlagen je Produkt.');busy++;
   try{const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});if(!/^data:application\/pdf;base64,JVBER/.test(data))throw Error('Keine gültige PDF-Datei.');docs.push({name:f.name,type:'PDF',url:'',source:'Vom Betrieb hochgeladen',document_date:'',data});a.confirmation='';changed();render();}finally{busy--;}
  }));
  for(const [suffix,key] of [['text','text'],['source','source'],['url','url'],['date','document_date']])$('#bath-care-'+suffix).oninput=e=>{a.care||={};a.care[key]=e.target.value;a.care.confirmed=false;a.confirmation='';$('#bath-care-confirm').checked=false;changed();};
  $('#bath-care-confirm').onchange=e=>{if(e.target.checked&&(!a.care?.text?.trim()||!a.care?.source?.trim())){e.target.checked=false;$('#bath-care-status').textContent='Bitte Anweisung und Quelle ergänzen.';return;}a.care.basis=materialBasis(a);a.care.confirmed=e.target.checked;a.confirmation='';$('#bath-care-status').textContent=e.target.checked?'Vom Betrieb fachlich bestätigt.':'';changed();};
  for(const key of ['note','spares'])$('#bath-'+key).oninput=e=>{a[key]=e.target.value;a.confirmation='';changed();};
  $('#bath-photos').onchange=act(async()=>{const files=[...$('#bath-photos').files];if(areas.reduce((n,a)=>n+a.photos.length,0)+files.length>8)throw Error('Bis zu 8 Flächenfotos pro Bad.');busy++;try{for(const f of files)a.photos.push(await compress(f));a.confirmation='';changed();render();}finally{busy--;}});
  $$('[data-photo-remove]').forEach(b=>b.onclick=()=>{a.photos.splice(+b.dataset.photoRemove,1);a.confirmation='';changed();render();});
 }
 async function advance(next){if(!collectPrep())return;if(!p.title.trim())throw Error('Bitte das Projekt benennen.');await autosave.flush();step=next;render();window.scrollTo?.(0,0);}
 $$('[data-bath-step]').forEach(b=>b.onclick=act(()=>advance(+b.dataset.bathStep)));
 $('#bath-next').onclick=act(async()=>{
  if(step<2)return advance(step+1);
  const issues=areas.flatMap(a=>areaIssues(a).map(issue=>a.name+': '+issue));if(issues.length)throw Error(issues.join(' · '));
  $('#bath-next').disabled=true;try{await autosave.flush();const saved=await api('handover',{id:p.id,version:p.version});setDirty(false);go('ready/'+saved.id);}finally{if($('#bath-next'))$('#bath-next').disabled=false;}
 });
 render();changed();return {flush:async()=>{if(!collectPrep())throw Error('Untergrund bitte vervollständigen.');await autosave.flush();},dispose(){disposed=true;autosave.dispose();}};
}
