import {createFavoritesEditor} from './favorites-editor.mjs';
import {createAutosave} from './autosave.mjs';
import {handoverReview,missingColors} from './handover-review.mjs';
import {missingStandardProducts} from './standard-build.mjs';
import {editorSection,bindEditorSections} from './editor-layout.mjs';
import {defaultFinish,finishSelection} from './system-finish.mjs';
import {waterproofingFields,waterproofingPhotoFields,waterproofingHTML} from './waterproofing.mjs';
import {hasWaterproofingDetails,projectPhotoLimit} from './waterproofing-data.mjs';
import {colorField,refreshColorOptions,bindColorOptions} from './color-palettes.mjs';
import {saveProductDialog} from './product-library.mjs';
import {createPreparationEditor,preparationHTML} from './preparation.mjs';
import {workflowPage,participantPage,journalHTML,ownerEntry} from './workflow.mjs';
import {esc,num,date,safeLink,hasProduct,labelPhoto,field,area,fields,compress,download} from './ui.mjs';
import {operatorPage,accessPage} from './operator.mjs';
import {names,productKeys,trades,tradeFor} from './trades.mjs';
import {catalogPage,openCatalogPicker,mergeDocuments,loadCatalog,setCompanyCatalog,productDocuments} from './catalog.mjs';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let dashboardLoadedAt=0;
let dashboard=null,dirty=false,routeVersion=0,ownerKey='',editorSession=null;
const steps=active=>`<ol class="project-steps" aria-label="Projektschritte">${['Aktivieren','Bauphase','Übergabe'].map((label,i)=>`<li ${i===active?'aria-current="step"':''}>${i+1}. ${label}</li>`).join('')}</ol>`;
const blankProduct=()=>({manufacturer:'',name:'',color:'',format:'',article_number:'',batch:'',system_type:'',sheen:'',label_photo:''});
const applicationAreas=['Boden','Wände','Wände & Boden'];
function applicationAreaField(value=''){
 const custom=Boolean(value)&&!applicationAreas.includes(value);
 return `<div class="field"><label for="application_area">Anwendungsbereich</label><select id="application_area" name="application_area"><option value="" ${value?'':'selected'}>Bitte auswählen</option>${applicationAreas.map(option=>`<option value="${esc(option)}" ${value===option?'selected':''}>${esc(option)}</option>`).join('')}<option value="other" ${custom?'selected':''}>Andere Fläche</option></select></div><div id="application-area-custom" ${custom?'':'hidden'}>${field('Welche Fläche?','application_area_custom',custom?value:'','text',`maxlength="1000" placeholder="z. B. Treppe" ${custom?'':'disabled'}`)}</div>`;
}
const go=path=>{location.hash=path;};
function notify(message){$('#notice').textContent=message;$('#notice').classList.add('show');setTimeout(()=>$('#notice').classList.remove('show'),5000);}
async function api(op,body={}){
 const r=await fetch('/api/'+op,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 let data;try{data=await r.json();}catch{throw Error('Die Verbindung ist noch nicht eingerichtet. Bitte erneut versuchen.');}
 if(!r.ok){if(r.status===401){dashboardLoadedAt=0;dashboard=null;}const e=Error(data.error||'Bitte erneut versuchen.');e.status=r.status;throw e;}
 if(!['bootstrap','project','preview','scan','flow_get','flow_portal','operator_list','operator_company','access_info'].includes(op))dashboardLoadedAt=0;
 return data;
}
function errorHTML(message){return `<p class="error" role="alert">${esc(message)}</p>`;}
function shell(body,{customer=false,company={},compact=false}={}){
 const operator=dashboard?.role==='operator';
 const navigation=operator?`<a class="btn text" href="#admin">Betriebe</a>${dashboard.company?'<a class="btn text" href="#home">Meine Projekte</a><a class="btn text" href="#settings">Mein Betrieb</a>':''}`:'<a class="btn text" href="#settings">Betrieb</a>';
 const menu=`${navigation}<a class="btn text" href="#catalog">Produktkatalog</a><button class="btn text" id="logout">Abmelden</button>`;
 $('#app').innerHTML=`<div class="wrap ${customer?'':'narrow'}"><header class="top"><a class="wordmark" href="${customer?esc(location.hash):operator?'#admin':'#home'}">PROJEKTPASS</a><div class="top-right">${customer?(labelPhoto(company.logo)?`<img class="small-logo" alt="${esc(company.name)}" src="${company.logo}">`:`<span class="subtle">${esc(company.name)}</span>`):compact?`<details class="account-menu"><summary>Menü</summary><nav aria-label="Betriebsmenü">${menu}</nav></details>`:menu}</div></header><main>${body}</main><footer class="footer"><div><strong>PROJEKTPASS</strong>Ein Scan. Alles zum Bad.</div><div class="row"><a href="/datenschutz.html" target="_blank" rel="noopener">Datenschutz</a><a href="/impressum.html" target="_blank" rel="noopener">Impressum</a></div></footer></div>`;
 if($('#logout'))$('#logout').onclick=()=>run($('#logout'),async()=>{await api('logout');dashboard=null;dirty=false;go('login');});
}
function modal(title,body){const d=$('#modal');d.innerHTML=`<div class="dialog-head"><h2>${esc(title)}</h2><button class="close" aria-label="Schließen">×</button></div>${body}`;$('.close',d).onclick=()=>d.close();if(!d.open)d.showModal();}
async function run(button,fn,output){if(button?.disabled)return;if(button)button.disabled=true;try{await fn();}catch(e){if(output)output.innerHTML=errorHTML(e.message);else notify(e.message);if(e.status===401&&dirty)renewSession();}finally{if(button?.isConnected)button.disabled=false;}}
function renewSession(){
 modal('Ihre Eingaben bleiben hier',`<p>Die Sitzung ist abgelaufen. Melden Sie sich erneut an und speichern Sie anschließend Ihre Änderungen.</p><form id="renew">${field('E-Mail','renew-email','','email','required autocomplete="username"')}${field('Passwort','renew-password','','password','required autocomplete="current-password"')}${message}<button class="btn olive wide" type="submit">Erneut anmelden</button></form>`);
 bindForm('#renew',async form=>{const v=fields(form);await api('login',{email:v['renew-email'],password:v['renew-password']});$('#modal').close();notify('Wieder angemeldet. Sie können jetzt speichern.');});
}
function bindForm(id,fn){const form=$(id);form.onsubmit=e=>{e.preventDefault();run($('[type=submit]',form),()=>fn(form),$('.form-message',form));};return form;}
const message='<div class="form-message" role="status"></div>';
function login(returnTo='home'){
 shell(`<section class="hero login-box"><span class="eyebrow">Ihr Betriebszugang</span><h1>Gute Arbeit.<br>Gut übergeben.</h1><p class="intro">Den üblichen Aufbau einmal merken. Pro Projekt nur Abweichungen ergänzen. Materialien, Pflege und Unterlagen geordnet an Ihre Kunden übergeben.</p><form id="login" class="spaced">${field('E-Mail','email','','email','required autocomplete="username"')}${field('Passwort','password','','password','required autocomplete="current-password"')}${message}<button class="btn olive wide" type="submit">Anmelden</button></form><p class="hint">Ihre Kunden brauchen zum Lesen weder App noch Anmeldung.</p><a class="btn text" href="/start.html">So funktioniert der Projektpass →</a></section>`,{customer:true});
 bindForm('#login',async form=>{dashboard=await api('login',fields(form));dashboardLoadedAt=Date.now();setCompanyCatalog(dashboard.company);if(location.hash==='#'+returnTo)render();else go(returnTo);});
}
async function loadDashboard({reuse=false}={}){if(reuse&&dashboard&&Date.now()-dashboardLoadedAt<30000)return dashboard;dashboard=await api('bootstrap');dashboardLoadedAt=Date.now();setCompanyCatalog(dashboard.company);return dashboard;}
function home(){
 const d=dashboard,free=d.passes.filter(p=>!p.project_id&&!p.disabled).length,activated=d.passes.length-free;
 shell(`<section class="admin-title"><span class="eyebrow">${esc(d.company.name)}</span><h1>Die Übergabe.<br>Einfach gut gemacht.</h1><p class="muted">Ihr Aufbau. Ihre Arbeit. Für Ihren Kunden griffbereit.</p><a class="btn olive" href="#passes">Aktivieren →</a><div class="stats"><div><strong>${free}</strong><span>Freie Pässe</span></div><div><strong>${activated}</strong><span>Aktivierte Pässe</span></div><div><strong>${d.projects.length}</strong><span>Projekte</span></div></div><div class="row between"><h2>Meine Projekte</h2><span class="small muted">${d.passes.length} Projektpässe</span></div><div class="search"><label class="sr-only" for="search">Projekte suchen</label><input id="search" type="search" placeholder="Projekt, Passnummer, Material oder Kunde"></div><div id="projects"></div></section>`);
 const render=q=>{$('#projects').innerHTML=d.projects.filter(p=>JSON.stringify([p.title,p.internal,p.content,num(d.passes.find(s=>s.id===p.pass_id)?.number)]).toLowerCase().includes(q.toLowerCase())).map(p=>{
  const pass=d.passes.find(s=>s.id===p.pass_id);return `<article class="list-item"><div class="pass-number">${num(pass.number)}</div><div class="content"><h3>${esc(p.title)}</h3><span class="small muted">${date(p.activated_at)} · ${pass.disabled?'Link gesperrt':p.status==='handed_over'?'Übergeben':'In Vorbereitung'}</span></div><div class="buttons"><a href="#work/${p.id}">Öffnen →</a></div></article>`;
 }).join('')||'<p class="empty">Hier erscheinen Ihre Projekte. Beginnen Sie mit einem freien Pass.</p>';};render('');$('#search').oninput=e=>render(e.target.value);
}
function passes(){
 shell(`<section class="admin-title"><a href="#home" class="btn text">← Meine Projekte</a><h1>Ihre Projektpässe.</h1><p class="muted">Wählen Sie einen Pass zum Aktivieren oder Verwalten. Weitere Pässe können Sie jederzeit hinzufügen.</p><button class="btn olive spaced" id="add-passes">+ Pässe hinzufügen</button><div class="pass-grid spaced">${dashboard.passes.map(p=>p.disabled?`<span class="pass-card used" aria-disabled="true"><strong>${num(p.number)}</strong><small>Stillgelegt</small></span>`:`<a class="pass-card ${p.project_id?'used':''}" href="${p.project_id?'#edit/'+p.project_id:'#activate/'+p.id}"><strong>${num(p.number)}</strong><small>${p.project_id?'Aktiviert':'Frei'}</small></a>`).join('')}</div><section class="section"><button class="btn light" id="export-pass-links">NFC-Links herunterladen</button><p class="hint">Schreiben Sie den jeweiligen Link auf den passenden NFC-Tag oder verwenden Sie ihn für Ihren QR-Code. Der Kundenlink zeigt Projektdaten erst nach der Übergabe.</p></section></section>`);
 $('#export-pass-links').onclick=()=>download('Projektpass-NFC-Links.json',dashboard.passes.filter(p=>!p.disabled).map(p=>({nummer:p.number,link:location.origin+'/#p/'+p.token})));
 $('#add-passes').onclick=()=>{
  const requestId=crypto.randomUUID();
  modal('Weitere Projektpässe',`<p>Wie viele neue Pässe möchten Sie hinzufügen? Sie können diesen Schritt jederzeit wiederholen.</p><form id="add-passes-form">${field('Anzahl','quantity','20','number','required min="1" max="100" step="1"')}${message}<button class="btn olive wide spaced" type="submit">Pässe hinzufügen</button></form>`);
  bindForm('#add-passes-form',async form=>{const result=await api('passes_add',{id:requestId,quantity:Number(fields(form).quantity)});$('#modal').close();await loadDashboard();passes();notify(result.added+' neue Pässe hinzugefügt.');});
 };
}
function activate(id){
 const pass=dashboard.passes.find(p=>p.id===id||p.token===id);if(!pass)throw Error('Dieser Pass gehört nicht zu Ihrem Betrieb.');
 if(pass.project_id){go('edit/'+pass.project_id);return;}if(pass.disabled)throw Error('Dieser Pass wurde stillgelegt. Bitte einen freien Pass wählen.');
 shell(`<section class="admin-title"><a class="btn text" href="#passes">← Ihre Pässe</a>${steps(0)}<span class="eyebrow">Aktivieren</span><h1>Projektpass ${num(pass.number)}</h1><p class="intro">Was soll Ihr Kunde später noch wissen?</p><form id="activate" class="spaced">${dashboard.company.standards?.[dashboard.company.trade||'tile']?`<aside class="standard-start"><strong>Mit meinem üblichen Aufbau starten</strong><p>${tradeFor(dashboard.company.trade).products.map(k=>dashboard.company.standards[dashboard.company.trade||'tile'][k]).filter(hasProduct).map(p=>esc([p.manufacturer,p.name].filter(Boolean).join(' '))).join(' · ')}</p><span class="hint">Wird vorausgefüllt. Fläche und Farbtöne ergänzen Sie im nächsten Schritt.</span></aside>`:''}${field('Wie heißt das Projekt?','title','','text','required maxlength="150" placeholder="Bad Familie Müller"')}${message}<button class="btn olive wide" type="submit">Aktivieren →</button></form></section>`);
 bindForm('#activate',async form=>{const p=await api('activate',{pass_id:pass.id,title:fields(form).title});dirty=false;go('edit/'+p.id);});
}
function favoriteButtons(kind,favorites=[]){
 const preferred=new Set((dashboard?.company?.preferred_manufacturers||[]).map(m=>m.toLocaleLowerCase('de'))),indexed=favorites.map((v,i)=>({v,i}));
 const mine=indexed.filter(({v})=>preferred.has((v.manufacturer||'').toLocaleLowerCase('de'))),shown=(mine.length?mine:indexed).slice(0,3);
 return shown.length?`<div class="favorite-shortcuts"><p class="hint">Schnellwahl aus Ihrem Betrieb</p><div class="chips">${shown.map(({v,i})=>`<button class="chip" type="button" data-favorite="${kind}:${i}">${esc([v.manufacturer,v.name,kind==='waterproofing'?'':v.color].filter(Boolean).join(' · '))}</button>`).join('')}</div></div>`:'';
}
function productForm(kind,p,favorites=[],primary='tile',details={},nested=false,systemFinish=''){
 const selected=hasProduct(p),title=nested&&kind==='grout'?'Fugenmaterial':names[kind];
 return `<details class="form-block material-card material-fold" data-material="${kind}"><summary><span><strong>${title}</strong><small class="material-summary" id="summary-${kind}">${esc([[p.manufacturer,p.name].filter(Boolean).join(' '),kind==='waterproofing'?'':p.color].filter(Boolean).join(' · ')||'Noch kein Produkt ausgewählt')}</small></span></summary><div class="material-fields">${favoriteButtons(kind,favorites)}<button class="btn light product-change" type="button" data-open-catalog="${kind}">${selected?'Ändern':kind==='surface'?'System auswählen':'Produkt auswählen'}</button><details class="material-edit manual-product"><summary>Produkt selbst eintragen / bearbeiten</summary><div class="form-grid">${field('Hersteller',kind+'-manufacturer',p.manufacturer)}${field(kind==='tile'?'Serie / Artikel':kind==='waterproofing'?'Produkt':'Produkt / System',kind+'-name',p.name)}${kind==='tile'?field('Format',kind+'-format',p.format):''}${kind==='surface'?field('Systemart',kind+'-system_type',p.system_type,'text','placeholder="Wird bei der Systemauswahl ausgefüllt"'):''}</div><button class="btn light" type="button" data-save-library="${kind}">Im Betriebskatalog speichern</button></details>${kind==='waterproofing'?waterproofingFields(details)+waterproofingPhotoFields():`${colorField(kind,p)}${systemFinish}<details class="spaced"><summary>Weitere Angaben (optional)</summary>${field('Artikelnummer',kind+'-article_number',p.article_number)}${field('Charge / Kaliber',kind+'-batch',p.batch)}${kind===primary?`${photoInput('Foto vom Etikett','label-photo')}<div id="label-preview">${photoPreview(p.label_photo)}</div>`:''}</details>`}</div></details>`;
}
function finishForm(p,favorites=[]){
 return `<div class="system-finish" data-material="finish"><span class="field-label">Versiegelung</span><p id="summary-finish">${esc([p.manufacturer,p.name].filter(Boolean).join(' ')||'Noch nicht hinterlegt')}</p><small id="finish-status" class="muted"></small><details class="material-edit"><summary>Versiegelung ändern</summary>${favoriteButtons('finish',favorites)}<button class="btn light" type="button" data-open-catalog="finish">Andere Versiegelung auswählen</button><div class="form-grid spaced">${field('Hersteller','finish-manufacturer',p.manufacturer)}${field('Produkt','finish-name',p.name)}${field('Glanzgrad (optional)','finish-sheen',p.sheen)}</div><details class="manual-product"><summary>Weitere Angaben</summary>${field('Artikelnummer','finish-article_number',p.article_number)}${field('Charge','finish-batch',p.batch)}${field('Farbton (optional)','finish-color',p.color)}<button type="button" class="btn light" data-save-library="finish">Im Betriebskatalog speichern</button></details><div class="row"><button type="button" class="btn text" id="reset-finish">Systemvorschlag übernehmen</button><button type="button" class="btn text" id="clear-finish">Angabe entfernen</button></div></details></div>`;
}
function materialForms(trade,content,company){
 const card=(kind,nested=false)=>productForm(kind,{...blankProduct(),...content[kind]},company.favorites?.[kind],trade.primary,content.waterproofing_details,nested,kind==='surface'?finishForm({...blankProduct(),...content.finish},company.favorites?.finish):'');
 if(trade.primary==='tile')return `${card('tile')}<section class="form-block joint-materials" id="joint-materials" aria-labelledby="joint-materials-title"><h3 id="joint-materials-title">${trade.buildTitle}</h3>${card('silicone',true)}${card('grout',true)}</section>`;
 return ['surface','waterproofing','silicone'].filter(k=>trade.products.includes(k)).map(k=>card(k)).join('');
}
function photoInput(label,id,multiple=false){return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="file" accept="image/*" ${multiple?'multiple':''}></div>`;}
function photoPreview(photo){return labelPhoto(photo)?`<img class="photo-preview" src="${photo}" alt="Gespeichertes Foto">`:'';}
function docsText(docs=[]){return JSON.stringify(docs);}
function parseDocs(value){return JSON.parse(value||'[]');}
function localDate(value){if(!value)return '';const d=new Date(value);return new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
async function edit(id){
 let p=await api('project',{id});if(location.hash!=='#edit/'+id)return;if(p.handover_snapshot){go('work/'+id);return;}
 if(p.content?.areas?.length){go('bath/'+id);return;}
 const c=structuredClone(p.content),trade=tradeFor(c.trade),primary=trade.primary,sp=c.spare_materials?.[0]||{};let photos=c.photos||[],waterproofingPhotos=c.waterproofing_details?.photos||[],label=c[primary]?.label_photo||'',sparePhoto=sp.photo||'',busyPhotos=0;
 let previousSurface={...c.surface},finishMode=c.finish_selection||'',autosaver;
 function changed(){if(autosaver&&!form.isConnected)return;dirty=true;if(autosaver)$('.form-message',form).textContent='';autosaver?.changed();}
 const projectFields=`${field('Projektname','title',p.title,'text','required maxlength="150"')}${c.trade==='seamless'?`<div class="spaced">${applicationAreaField(c.application_area)}<details class="spaced" id="preparation-section"><summary>Untergrund & Vorbereitung (optional)</summary><div id="preparation-editor"></div><details class="preparation-notes" ${c.substrate?'open':''}><summary>Ergänzende Notiz (optional)</summary>${area('Ergänzende Notiz','substrate',c.substrate)}</details></details></div>`:''}<details class="spaced"><summary>Interne Kundendaten (optional)</summary>${field('Kundenname (intern)','customer_name',p.internal?.customer_name)}${field('Adresse (intern)','address',p.internal?.address)}<p class="hint">Nur für Ihren Betrieb sichtbar.</p></details>`;
 const materials=`<div class="standard-start"><p class="hint">${dashboard.company.standards?.[c.trade||'tile']?'Ihr üblicher Aufbau ist verfügbar. Vorausgefüllte Produkte kurz prüfen und den Farbton ergänzen.':'Produkte einmal auswählen und als „Mein Standardbad“ speichern. Neue Projekte übernehmen diese Produkte automatisch.'}</p><button type="button" class="btn light" id="use-standard" hidden>Fehlende Produkte aus meinem Standard ergänzen</button></div>${materialForms(trade,c,dashboard.company)}<section class="standard-save"><strong>Beim nächsten Bad schneller fertig</strong><p class="hint" id="standard-summary"></p><button type="button" class="btn light" id="remember-standard">Als „Mein Standardbad“ speichern</button><p class="hint">Neue Projekte übernehmen diese Produkte und passenden Unterlagen. Farbton, Charge und Fotos wählen Sie je Projekt.</p><p id="standard-feedback" role="status"></p></section>`;
 const files=`<details class="spaced" open><summary>Fotos vom fertigen Bad</summary>${photoInput('Fotos hinzufügen','project-photos',true)}<div id="photos"></div><p class="hint">Für Ihren Kunden sichtbar. Bis zu 8 Fotos${trade.products.includes('waterproofing')?' insgesamt für Abdichtung und Übergabe':''}.</p></details><details class="spaced" open><summary>Produktunterlagen & weitere Links</summary><textarea id="documents" name="documents" hidden maxlength="50000">${esc(docsText(c.documents))}</textarea><div id="document-list"></div><button type="button" class="btn light spaced" id="add-document">+ Unterlage verlinken</button><p class="hint">Ausgewählte Produktunterlagen werden hier gesammelt. Links müssen für Ihren Kunden erreichbar sein.</p></details>`;
 const handover=`${field(trade.usage,'usage',localDate(c.usage_available_at),'datetime-local')}<div class="chips"><button type="button" class="chip" data-usage="0">Sofort</button><button type="button" class="chip" data-usage="24">In 24 Stunden</button><button type="button" class="chip" data-usage="48">In 48 Stunden</button><button type="button" class="chip" data-usage="clear">Keine Angabe</button></div><p class="hint">Den Zeitpunkt legen Sie als Fachbetrieb fest.</p><details class="spaced"><summary>Pflegehinweise (optional)</summary>${trade.care.map(k=>area(names[k],'care-'+k,c.care_notes?.[k])).join('')}<p class="hint">Nur vom Betrieb geprüfte Hinweise hinterlegen.</p></details><details class="spaced"><summary>Ersatzmaterial (optional)</summary>${field('Material','spare-material',sp.material)}${field('Menge','spare-quantity',sp.quantity)}${field('Lagerort','spare-location',sp.location)}${photoInput('Foto vom Lagerort','spare-photo')}<div id="spare-preview">${photoPreview(sparePhoto)}</div></details>`;
 shell(`<section class="admin-title editor-title"><a class="btn text" href="#work/${p.id}">← Projektübersicht & Mitteilungen</a>${steps(p.status==='handed_over'?2:1)}<h1>${esc(p.title)}</h1><p class="muted">Pass ${num(p.pass_number)} · Schritt für Schritt zum fertigen Projektpass</p></section><form id="edit"><nav class="material-overview" aria-label="Materialübersicht"><p><strong>Ihr Aufbau</strong> <span id="material-completion"></span></p>${trade.products.filter(k=>k!=='finish').map(k=>`<button type="button" data-material-jump="${k}"><span><strong>${esc(names[k])}</strong><small data-material-status="${k}"></small></span><span data-material-action="${k}"></span></button>`).join('')}</nav>${editorSection('project','Projekt & Fläche',projectFields)}${editorSection('materials','Materialien',materials)}${editorSection('files','Fotos & Unterlagen',files)}${editorSection('handover','Übergabe & Pflege',handover)}${message}<div class="sticky autosave-bar"><button type="button" id="editor-progress" class="editor-progress" aria-label="Zur Übersicht"></button><span id="save-status" role="status" aria-live="polite">Gespeichert</span><button class="btn light" type="submit" id="save" hidden>Jetzt speichern</button><button class="btn olive" type="button" id="editor-next">Weiter: Materialien →</button><button class="btn olive" type="button" id="preview">Übergabe prüfen →</button></div></form><details class="section no-print editor-tools"><summary>Pass & Zugriff verwalten</summary><button type="button" class="btn light" id="nfc-link">NFC-Link anzeigen</button><div class="row spaced"><button class="btn light" id="visibility">${p.disabled?'Kundenlink wieder freigeben':'Kundenlink sperren'}</button><button class="btn light" id="owner-key">Schlüssel für Kundenergänzungen</button><button class="btn danger" id="delete">Projekt löschen</button></div></details>`,{compact:true});
 const form=$('#edit');bindEditorSections(form);
 const resume=document.createElement('button');resume.type='button';resume.id='editor-resume';resume.className='btn olive wide editor-resume';$('.editor-rail',form).after(resume);
 $$('[data-material-jump]',form).forEach(button=>button.onclick=()=>{const section=$('[data-editor-section="materials"]');section.querySelector(':scope > summary').click();const card=$('[data-material="'+button.dataset.materialJump+'"]');if(card&&!card.open)card.querySelector(':scope > summary').click();card?.scrollIntoView?.({block:'start',behavior:'auto'});});
 $$('[data-material]',form).forEach(card=>bindColorOptions(card,card.dataset.material));
 if($('#waterproofing-water-class')){
  $('#waterproofing-water-class').value=c.waterproofing_details?.water_class||'';
  $('#waterproofing-type').value=c.waterproofing_details?.type||'';
 }
 const preparationEditor=$('#preparation-editor')?createPreparationEditor($('#preparation-editor'),c.preparation||[],{choice:applicationAreas.includes(c.application_area)?c.application_area:c.application_area?'other':'',customLabel:c.application_area||'',onChange:()=>changed()}):null;
 if($('#application_area'))$('#application_area').value=applicationAreas.includes(c.application_area)?c.application_area:c.application_area?'other':'';
 if($('#application_area'))$('#application_area').onchange=()=>{
  const custom=$('#application_area').value==='other';$('#application-area-custom').hidden=!custom;$('#application_area_custom').disabled=!custom;changed();
  preparationEditor?.setArea($('#application_area').value,$('#application_area_custom').value);refreshOverview();
  if(custom)$('#application_area_custom').focus();
 };
 if($('#application_area_custom'))$('#application_area_custom').addEventListener('input',()=>preparationEditor?.setCustomLabel($('#application_area_custom').value));
 function readProduct(kind){return Object.fromEntries(Object.keys(blankProduct()).map(k=>[k,$('#'+kind+'-'+k)?.value??c[kind]?.[k]??'']));}
 function writeProduct(kind,item){c[kind]={...blankProduct(),...item};for(const key of Object.keys(blankProduct())){const el=$('#'+kind+'-'+key);if(el)el.value=c[kind][key];}}
 function refreshMaterial(kind,close=false){
  const card=$('[data-material="'+kind+'"]');
  $('#summary-'+kind).textContent=[[$('#'+kind+'-manufacturer').value,$('#'+kind+'-name').value].filter(Boolean).join(' '),$('#'+kind+'-color')?.value,kind==='finish'?$('#finish-sheen').value:''].filter(Boolean).join(' · ')||(kind==='finish'?'Noch nicht hinterlegt':'Noch kein Produkt ausgewählt');
  refreshColorOptions(card,kind,{reset:close});if(close){$('.material-edit',card).open=false;$$('.manual-product',card).forEach(d=>d.open=false);}
  if(kind!=='finish')$('[data-open-catalog]',card).textContent=hasProduct(readProduct(kind))?'Ändern':'Produkt auswählen';
  if(kind==='finish'){$('#finish-status').textContent=finishMode==='system'?'Aus dem System vorausgefüllt':hasProduct(readProduct('finish'))?'Eigene Auswahl':finishMode==='manual'?'Keine Angabe':'Bei Bedarf ergänzen';$('#reset-finish').hidden=!defaultFinish(readProduct('surface'));}
  refreshOverview();
 }
 function applyProduct(kind,item,documents=[],includeFinishDocs=true){
  const next=kind==='surface'?finishSelection(item,previousSurface,readProduct('finish'),finishMode):null;
  // Check document limits before changing either product, so a failed pick is atomic.
  const docs=mergeDocuments(parseDocs($('#documents').value),[...documents,...(next?.replace&&includeFinishDocs?next.product.documents||[]:[])]);
  writeProduct(kind,item);$('#documents').value=docsText(docs);
  if(next){previousSurface={...item};finishMode=next.mode;if(next.replace)writeProduct('finish',next.product);refreshMaterial('finish',next.replace);}
  if(kind==='finish'){finishMode='manual';}
  if(kind===primary){label=item.label_photo||'';renderLabel();}
  refreshMaterial(kind,true);changed();
 }
 function syncSurface(){
  const item=readProduct('surface'),next=finishSelection(item,previousSurface,readProduct('finish'),finishMode);
  previousSurface={...item};finishMode=next.mode;
  if(next.replace){writeProduct('finish',next.product);changed();try{$('#documents').value=docsText(mergeDocuments(parseDocs($('#documents').value),next.product.documents||[]));}catch(e){notify('Versiegelung übernommen. '+e.message);}}
  refreshMaterial('finish',next.replace);
 }
 function renderDocuments(){
  const docs=parseDocs($('#documents').value);
  $('#document-list').innerHTML=docs.map((doc,i)=>`<div class="editor-document"><div>${safeLink(doc.url)?`<a href="${esc(safeLink(doc.url))}" target="_blank" rel="noopener noreferrer">${esc(doc.name||doc.type)} ↗</a>`:esc(doc.name||doc.type)}<span class="hint">${esc(doc.type)}</span></div><button type="button" class="btn text" data-remove-document="${i}" aria-label="${esc((doc.name||doc.type)+' entfernen')}">Entfernen</button></div>`).join('')||'<p class="hint">Noch keine Unterlagen. Bei der Produktauswahl können passende Merkblätter übernommen werden.</p>';
  $$('[data-remove-document]',form).forEach(button=>button.onclick=()=>{$('#documents').value=docsText(docs.filter((_,i)=>i!==Number(button.dataset.removeDocument)));changed();refreshOverview();});
 }
 $('#add-document').onclick=()=>{
  modal('Unterlage verlinken',`<form id="project-document">${field('Bezeichnung','document-name','','text','required placeholder="z. B. Pflegeanleitung"')}${field('Link zur Unterlage','document-url','','url','required placeholder="https://…"')}${message}<button class="btn olive" type="submit">Hinzufügen</button></form>`);
  bindForm('#project-document',async dialogForm=>{const v=fields(dialogForm);if(!safeLink(v['document-url']))throw Error('Bitte einen vollständigen http- oder https-Link eingeben.');$('#documents').value=docsText(mergeDocuments(parseDocs($('#documents').value),[{name:v['document-name'],type:'Unterlage',url:v['document-url']}]));changed();refreshOverview();$('#modal').close();});
 };
 function refreshOverview(){
  const set=(key,value)=>{$('[data-editor-summary="'+key+'"]').textContent=value;const status=$('[data-step-status="'+key+'"]');if(status)status.textContent=value;};
  const area=$('#application_area')?.value;
  const currentProducts=Object.fromEntries(trade.products.map(k=>[k,readProduct(k)])),colorsMissing=missingColors(currentProducts,trade);
  const standard=dashboard.company.standards?.[c.trade||'tile'];
  $('#use-standard').hidden=!missingStandardProducts({...currentProducts,finish_selection:finishMode},standard,trade).length;
  $('#standard-summary').textContent=standard?'Gespeichert: '+trade.products.filter(k=>standard[k]?.name).map(k=>[standard[k].manufacturer,standard[k].name].filter(Boolean).join(' ')).join(' · '):'Diesen Aufbau einmal merken, bei weiteren Projekten nur Abweichungen ändern.';
  $('#remember-standard').disabled=!trade.products.some(k=>currentProducts[k]?.name.trim());
  set('project',[$('#title').value,area==='other'?$('#application_area_custom').value:area].filter(Boolean).join(' · ')||'Projekt benennen');
  const products=trade.products.map(k=>[$('#'+k+'-manufacturer')?.value,$('#'+k+'-name')?.value].filter(Boolean).join(' ')).filter(Boolean);
  const visibleKinds=trade.products.filter(k=>k!=='finish');
  let filled=0;
  for(const k of visibleKinds){const name=$('#'+k+'-name')?.value.trim(),maker=$('#'+k+'-manufacturer')?.value.trim();const button=$('[data-material-jump="'+k+'"]');button.classList.toggle('is-missing',!name);$('[data-material-status="'+k+'"]').textContent=name?[maker,name].filter(Boolean).join(' '):'Noch offen';$('[data-material-action="'+k+'"]').textContent=name?'Ändern →':'Auswählen →';if(name)filled++;}
  $('#material-completion').textContent=filled+' von '+visibleKinds.length+' Produkten eingetragen';
  const missing=trade.products.filter(k=>!$('#'+k+'-name')?.value.trim());
  for(const k of trade.products){const card=$('[data-material="'+k+'"]');if(card)card.classList.toggle('material-missing',missing.includes(k));}
  set('materials',missing.length?'Noch offen: '+missing.map(k=>names[k]).join(' · '):colorsMissing.length?'Farbton prüfen: '+colorsMissing.map(k=>names[k]).join(' · '):products.length?`${products.length} ${products.length===1?'Produkt':'Produkte'} hinterlegt`:'Verwendete Produkte und Farbtöne auswählen');
  const photoCount=photos.length+waterproofingPhotos.length,docCount=parseDocs($('#documents').value).length;
  renderDocuments();
  set('files',photoCount||docCount?`${photoCount} ${photoCount===1?'Foto':'Fotos'} · ${docCount} ${docCount===1?'Unterlage':'Unterlagen'}`:'Fotos ergänzen und Produktunterlagen sammeln');
  const jumpMaterial=kind=>{const parent=kind==='finish'?'surface':kind;$('[data-material-jump="'+parent+'"]').click();if(kind==='finish')$('[data-material="finish"] .material-edit').open=true;};
  const nextMissing=visibleKinds.find(k=>missing.includes(k));
  if(!$('#title').value.trim()){resume.textContent='Projekt benennen →';resume.onclick=()=>{$('[data-editor-go="project"]').click();$('#title').focus();};}
  else if($('#application_area')&&(!area||(area==='other'&&!$('#application_area_custom').value.trim()))){resume.textContent='Fläche auswählen →';resume.onclick=()=>{$('[data-editor-go="project"]').click();$('#application_area').focus();};}
  else if(nextMissing){resume.textContent=names[nextMissing]+' ergänzen →';resume.onclick=()=>jumpMaterial(nextMissing);}
  else if(colorsMissing.length){const kind=colorsMissing[0];resume.textContent=names[kind]+': Farbton ergänzen →';resume.onclick=()=>jumpMaterial(kind);}
  else{resume.textContent='Weiter zur Übergabe →';resume.onclick=()=>{$('[data-editor-go="handover"]').click();};}
  const careCount=trade.care.filter(k=>$('#care-'+k)?.value.trim()).length;
  set('handover',[$('#usage').value?'Nutzungszeitpunkt hinterlegt':'',careCount?`${careCount} Pflegehinweise`:''].filter(Boolean).join(' · ')||'Nutzung, Pflege und Ersatzmaterial – optional');
 }
 form.oninput=e=>{if(e.target.matches('[data-color-select]'))return;changed();const kind=e.target.closest('[data-material]')?.dataset.material;if(kind==='finish')finishMode='manual';if(kind)refreshMaterial(kind);else refreshOverview();};
 if(primary==='surface'){
  for(const key of ['manufacturer','name'])$('#surface-'+key).addEventListener('change',syncSurface);
  $('#reset-finish').onclick=()=>{const item=defaultFinish(readProduct('surface'));if(!item)return;try{applyProduct('finish',item,item.documents||[]);finishMode='system';refreshMaterial('finish',true);}catch(e){notify(e.message);}};
  $('#clear-finish').onclick=()=>{applyProduct('finish',blankProduct());};
  syncSurface();
 }
 form.addEventListener('change',refreshOverview);refreshOverview();
 function renderPhotos(){$('#photos').innerHTML=`<div class="gallery">${photos.map((v,i)=>`<div class="thumb"><img src="${v}" alt="Übergabefoto ${i+1}"><button type="button" data-remove="${i}" aria-label="Foto entfernen">×</button></div>`).join('')}</div>`;$$('[data-remove]').forEach(b=>b.onclick=()=>{photos.splice(+b.dataset.remove,1);changed();renderPhotos();});refreshOverview();}renderPhotos();
 async function upload(input,fn){busyPhotos++;$('#save').disabled=$('#preview').disabled=true;try{await fn([...input.files]);if(form.isConnected)changed();}catch(e){if(form.isConnected)notify(e.message);}finally{busyPhotos--;if(form.isConnected&&!busyPhotos)$('#save').disabled=$('#preview').disabled=false;input.value='';}}
 function renderLabel(){if(!form.isConnected)return;$('#label-preview').innerHTML=photoPreview(label)+(label?'<button class="btn text" type="button" id="remove-label">Etikettenfoto entfernen</button>':'');if($('#remove-label'))$('#remove-label').onclick=()=>{label='';changed();renderLabel();};}
 function renderSpare(){if(!form.isConnected)return;$('#spare-preview').innerHTML=photoPreview(sparePhoto)+(sparePhoto?'<button class="btn text" type="button" id="remove-spare">Lagerfoto entfernen</button>':'');if($('#remove-spare'))$('#remove-spare').onclick=()=>{sparePhoto='';changed();renderSpare();};}
 renderLabel();renderSpare();
 function renderWaterproofingPhotos(){const root=$('#waterproofing-photos');if(!root)return;root.innerHTML=`<div class="gallery">${waterproofingPhotos.map((v,i)=>`<div class="thumb"><img src="${labelPhoto(v)}" alt="Foto der Abdichtung ${i+1}"><button type="button" data-remove-waterproofing="${i}" aria-label="Foto der Abdichtung entfernen">×</button></div>`).join('')}</div>`;$$('[data-remove-waterproofing]',root).forEach(b=>b.onclick=()=>{waterproofingPhotos.splice(+b.dataset.removeWaterproofing,1);changed();renderWaterproofingPhotos();});refreshOverview();}renderWaterproofingPhotos();
 async function addPhotos(files,target,render){
  const check=()=>{if(photos.length+waterproofingPhotos.length+files.length>projectPhotoLimit)throw Error('Bitte höchstens 8 Fotos insgesamt für Abdichtung und Übergabe wählen.');};
  check();const added=[];for(const f of files)added.push(await compress(f));if(!form.isConnected)return;check();target.push(...added);render();
 }
 $('#project-photos').onchange=e=>upload(e.target,files=>addPhotos(files,photos,renderPhotos));
 if($('#waterproofing-photo-upload'))$('#waterproofing-photo-upload').onchange=e=>upload(e.target,files=>addPhotos(files,waterproofingPhotos,renderWaterproofingPhotos));
 $('#label-photo').onchange=e=>upload(e.target,async files=>{if(files[0])label=await compress(files[0]);renderLabel();});
 $('#spare-photo').onchange=e=>upload(e.target,async files=>{if(files[0])sparePhoto=await compress(files[0]);renderSpare();});
 $$('[data-favorite]').forEach(b=>b.onclick=()=>run(b,async()=>{const [kind,i]=b.dataset.favorite.split(':');const item={...blankProduct(),...dashboard.company.favorites[kind][i]};applyProduct(kind,item,await productDocuments(kind,item));notify('Material übernommen.');},$('.form-message',form)));
 $$('[data-open-catalog]').forEach(b=>b.onclick=()=>run(b,()=>openCatalogPicker(b.dataset.openCatalog,{modal,isCurrent:()=>location.hash==='#edit/'+p.id,onManual:()=>{const kind=b.dataset.openCatalog;$('#modal').close();const card=$('[data-material="'+kind+'"]');$$('.material-edit,.manual-product',card).forEach(d=>d.open=true);$('#'+kind+'-manufacturer')?.focus();},onPick:(product,manufacturer,includeDocs)=>{
  const docs=includeDocs?product.documents.filter(d=>d.verification!=='source_link'):[];
  const kind=b.dataset.openCatalog,item={...blankProduct(),manufacturer:manufacturer.name,name:product.name,article_number:product.article_number||'',format:product.format||'',system_type:product.system_type||'',sheen:product.sheen||''};
  applyProduct(kind,item,docs,includeDocs);$('#modal').close();notify(kind==='waterproofing'?'Produkt übernommen. Unterlagen bitte prüfen.':'Produkt übernommen. Farbton, Charge und Unterlagen bitte prüfen.');
 }}),$('.form-message',form)));
 $$('[data-usage]').forEach(b=>b.onclick=()=>{$('#usage').value=b.dataset.usage==='clear'?'':localDate(new Date(Date.now()+(+b.dataset.usage)*3600000));changed();refreshOverview();});
 function values(){const v=fields(form);let preparation;if(preparationEditor){try{preparation=preparationEditor.read();}catch(error){$('[data-editor-section="project"]').open=true;$('#preparation-section').open=true;throw error;}}return {id:p.id,version:p.version,title:v.title,internal:{customer_name:v.customer_name,address:v.address},content:{...c,
  trade:c.trade||'tile',application_area:v.application_area==='other'?(v.application_area_custom??''):(v.application_area??c.application_area??''),substrate:v.substrate??c.substrate??'',...(preparationEditor?{preparation}:{}),
  ...Object.fromEntries(trade.products.map(k=>[k,Object.fromEntries(Object.keys(blankProduct()).map(f=>[f,k==='waterproofing'&&f==='color'?'':k===primary&&f==='label_photo'?label:v[k+'-'+f]??c[k]?.[f]??'']))])),
  ...(trade.products.includes('waterproofing')?{waterproofing_details:{water_class:v['waterproofing-water-class'],type:v['waterproofing-type'],photos:waterproofingPhotos}}:{}),
  ...(primary==='surface'?{finish_selection:finishMode}:{}),
  care_notes:{...c.care_notes,...Object.fromEntries(trade.care.map(k=>[k,v['care-'+k]]))},photos,
  usage_available_at:v.usage?new Date(v.usage).toISOString():'',
  spare_materials:[...([v['spare-material'],v['spare-quantity'],v['spare-location'],sparePhoto].some(Boolean)?[{material:v['spare-material'],quantity:v['spare-quantity'],location:v['spare-location'],photo:sparePhoto}]:[]),...(c.spare_materials||[]).slice(1)],documents:parseDocs(v.documents)}};}
 async function save(){if(busyPhotos)throw Error('Bitte warten, bis die Fotos vorbereitet sind.');if(!form.reportValidity())throw Error('Bitte den Projektnamen ergänzen.');await autosaver.flush();$('.form-message',form).textContent='Auf dem Server gespeichert.';}
 bindForm('#edit',save);
 $$('[data-save-library]').forEach(b=>b.onclick=()=>run(b,async()=>{const kind=b.dataset.saveLibrary;saveProductDialog(kind,values().content[kind],parseDocs($('#documents').value),{modal,bindForm,dashboard,api,notify,saveProject:save,includeDocuments:docs=>{$('#documents').value=docsText(mergeDocuments(parseDocs($('#documents').value),docs));changed();}});},$('.form-message',form)));
 $('#remember-standard').onclick=()=>run($('#remember-standard'),async()=>{
  const catalog=await loadCatalog(),current=values().content,documents=[];
  for(const kind of trade.products){const item=current[kind];const match=catalog.products.find(x=>x.kinds.includes(kind)&&x.name===item.name&&(x.article_number||'')===(item.article_number||'')&&catalog.manufacturers.find(m=>m.id===x.manufacturer_id)?.name===item.manufacturer);if(match)documents.push(...match.documents.filter(d=>d.verification!=='source_link'&&current.documents.some(v=>v.url===d.url)));}
  const standard={...Object.fromEntries(trade.products.map(k=>[k,{...current[k],color:'',batch:'',label_photo:''}])),documents:mergeDocuments([],documents)};
  await save();
  const result=await api('company_save',{version:dashboard.company_version,profile:{...dashboard.company,standards:{...dashboard.company.standards,[c.trade||'tile']:standard}}});
  Object.assign(dashboard,result);refreshOverview();$('#standard-feedback').textContent='Gespeichert – Ihr nächstes Projekt übernimmt diesen Aufbau.';notify('Standard gespeichert. Dieses Projekt ist ebenfalls gespeichert. Neue Projekte übernehmen die Materialauswahl.');
 },$('.form-message',form));
 $('#preview').onclick=()=>run($('#preview'),async()=>{await save();go('preview/'+p.id);},$('.form-message',form));
 $('#nfc-link').onclick=()=>{modal('Diesen Link auf den NFC-Pass schreiben',`${field('NFC-Link','nfc-url',location.origin+'/#p/'+p.token,'text','readonly')}<button class="btn olive" id="copy-nfc-url">Link kopieren</button><p class="hint">Als URL auf dem NFC-Tag speichern. Der Link bleibt bei Bauphase und Übergabe gleich. Kundendaten erscheinen erst nach der Übergabe.</p>`);$('#copy-nfc-url').onclick=()=>run($('#copy-nfc-url'),async()=>{await navigator.clipboard.writeText(location.origin+'/#p/'+p.token);notify('NFC-Link kopiert.');});};
 $('#visibility').onclick=()=>run($('#visibility'),async()=>{if(dirty)await save();p=await api('visibility',{id:p.id,version:p.version,disabled:!p.disabled});$('#visibility').textContent=p.disabled?'Kundenlink wieder freigeben':'Kundenlink sperren';notify(p.disabled?'Der Kundenlink ist gesperrt.':'Der Kundenlink ist wieder freigegeben.');});
 $('#owner-key').onclick=()=>{
  modal('Ergänzungen gehören dem Kunden',`<p>Der separate Schlüssel erlaubt eigene Ergänzungen. Die Angaben Ihres Betriebs bleiben geschützt.</p><p>Ein neuer Schlüssel ersetzt den bisherigen. Geben Sie ihn nur an den Eigentümer weiter.</p><button class="btn olive spaced" id="generate-key">Neuen Schlüssel erstellen</button>${message}`);
  $('#generate-key').onclick=()=>run($('#generate-key'),async()=>{if(dirty)await save();const r=await api('owner_key',{id:p.id,version:p.version});p=r;modal('Persönlicher Ergänzungsschlüssel',`<p>Nur an den Eigentümer weitergeben. Der Schlüssel wird nur jetzt angezeigt.</p><p class="secret">${r.owner_key}</p><button class="btn olive spaced" id="copy-key">Schlüssel kopieren</button>`);$('#copy-key').onclick=()=>run($('#copy-key'),async()=>{await navigator.clipboard.writeText(r.owner_key);notify('Schlüssel kopiert.');});},$('.form-message',$('#modal')));
 };
 $('#delete').onclick=()=>{modal('Projekt endgültig löschen?',`<p>„${esc(p.title)}“ und die Kundenergänzungen werden gelöscht. Pass ${num(p.pass_number)} wird stillgelegt, damit seine alte Karte niemals ein anderes Bad öffnet.</p><button class="btn danger spaced" id="confirm-delete">Ja, Projekt löschen</button>${message}`);$('#confirm-delete').onclick=()=>run($('#confirm-delete'),async()=>{await save();await api('delete',{id:p.id,version:p.version});autosaver.dispose();dirty=false;$('#modal').close();go('home');},$('.form-message',$('#modal')));};
 const initialDirty=dirty;
 autosaver=createAutosave({
  read:()=>{if(!form.checkValidity())throw Error('Bitte den Projektnamen ergänzen.');const {id,version,...data}=values();return data;},
  initial:initialDirty?null:undefined,ready:()=>busyPhotos===0,
  write:async data=>{const saved=await api('save',{...data,id:p.id,version:p.version});p=saved;},
  onState:(state,error)=>{
   if(!form.isConnected)return;
   dirty=state!=='saved';
   $('#save-status').dataset.state=state;
   $('#save-status').textContent=state==='saved'?'Gespeichert':state==='saving'?'Wird gespeichert …':state==='pending'?'Änderungen noch nicht gespeichert':'Nicht gespeichert – '+(error?.message||'bitte erneut versuchen');
   $('#save').textContent=state==='error'?'Erneut speichern':'Jetzt speichern';$('#save').hidden=state!=='error';
  }
 });
 const online=()=>{if(form.isConnected&&dirty)autosaver.flush().catch(()=>{});};
 window.addEventListener('online',online);
 editorSession={flush:()=>save(),dispose:()=>{autosaver.dispose();window.removeEventListener('online',online);}};
 form.addEventListener('change',()=>changed());
 if(initialDirty)autosaver.changed();
 if($('#use-standard'))$('#use-standard').onclick=()=>run($('#use-standard'),async()=>{
  const standard=dashboard.company.standards[c.trade||'tile'],current=values().content;
  const missing=missingStandardProducts(current,standard,trade);
  if(!missing.length){notify('Die Produkte sind bereits eingetragen. Einzelne Produkte ändern Sie über „Ändern“.');return;}
  const catalog=await loadCatalog(),docs=[];
  for(const [kind,item] of missing){const match=catalog.products.find(x=>x.kinds.includes(kind)&&x.name===item.name&&(x.article_number||'')===(item.article_number||'')&&catalog.manufacturers.find(m=>m.id===x.manufacturer_id)?.name===item.manufacturer);if(match)docs.push(...match.documents.filter(d=>d.verification!=='source_link'));}
  const merged=mergeDocuments(parseDocs($('#documents').value),docs);
  for(const [kind,item] of missing)writeProduct(kind,item);
  if(primary==='surface'){previousSurface={...readProduct('surface')};if(missing.some(([k])=>k==='finish'))finishMode='manual';syncSurface();}
  $('#documents').value=docsText(mergeDocuments(merged,parseDocs($('#documents').value)));
  for(const [kind] of missing)refreshMaterial(kind,true);
  changed();notify('Fehlende Produkte aus Ihrem Aufbau ergänzt. Farbton und Ausführung bitte prüfen.');
 },$('.form-message',form));

}
function material(p={},label,kind='',details={}){
 const waterproofing=kind==='waterproofing',extra=waterproofing?waterproofingHTML(details):'';
 if(!hasProduct(p)&&!extra)return '';
 return `<div class="care"><h3>${esc(label)}</h3><p class="material-title">${esc([p.manufacturer,p.name].filter(Boolean).join(' '))}</p>${p.color&&!waterproofing?`<p class="color-name">${esc(p.color)}</p>`:''}<dl class="specs">${(waterproofing?[]:[['Systemart',p.system_type],['Format',p.format],['Glanzgrad',p.sheen],['Artikelnummer',p.article_number],['Charge / Kaliber',p.batch]]).filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${waterproofing?extra:photoPreview(p.label_photo)}<span class="source">Vom Fachbetrieb dokumentiert</span></div>`;
}
function documentLinks(docs){return docs.map(d=>`<div class="doc"><div>${safeLink(d.url)?`<a href="${esc(safeLink(d.url))}" rel="noopener noreferrer" target="_blank">${esc(d.name||d.type)} ↗</a>`:esc(d.name||d.type)}<span class="small">${esc(d.type)}</span></div></div>`).join('');}
function contact(company){return `<section class="section"><div class="contact"><span class="eyebrow">Ihr Fachbetrieb</span><div class="contact-title">${photoPreview(company.logo)}<div><h2>${esc(company.name)}</h2>${company.contact?`<p>${esc(company.contact)}</p>`:''}</div></div><div class="row">${company.phone?`<a class="btn light" href="tel:${esc(company.phone.replace(/[^+\d]/g,''))}">Anrufen</a>`:''}${company.email?`<a class="btn light" href="mailto:${esc(company.email)}">Nachricht senden</a>`:''}<button class="btn olive" id="help">Ich brauche Hilfe</button></div>${safeLink(company.website)?`<p><a target="_blank" rel="noopener noreferrer" href="${esc(safeLink(company.website))}">Website des Betriebs ↗</a></p>`:''}</div></section>`;}
async function customer(id,preview=false){
 const p=await api(preview?'preview':'scan',preview?{id}:{token:id});const expected='#'+(preview?'preview':'p')+'/'+id;if(location.hash!==expected)return;
 const c=p.content||{},company=p.company||{},trade=tradeFor(c.trade),other=[...trade.products,...(c.trade==='seamless'&&hasProduct(c.primer)?['primer']:[])].filter(k=>k!==trade.primary),hasTile=hasProduct(c[trade.primary])||c.application_area||c.substrate||c.preparation?.length||(c.spare_materials||[]).length,hasJoints=other.some(k=>hasProduct(c[k])||(k==='waterproofing'&&hasWaterproofingDetails(c.waterproofing_details))),careDocuments=(c.documents||[]).filter(d=>/pflege|reinigung|care/i.test(d.type||'')),hasCare=trade.care.some(k=>c.care_notes?.[k])||careDocuments.length>0;
 shell(`${preview?`<div class="preview-strip no-print"><a class="btn text" href="#edit/${p.id}">← Weiter bearbeiten</a><div>${steps(2)}</div></div>${handoverReview(p,trade)}<details class="customer-preview" id="customer-preview"><summary>Kundenansicht ansehen</summary><div>`:''}<div class="customer-dossier"><section class="hero"><span class="eyebrow">Ihr Projektpass · ${num(p.pass_number)}</span><h1>${esc(p.title)}</h1><p class="welcome-copy">Alles zu Ihrem neuen Bad.<span>Ihre dokumentierten Materialien, Pflegehinweise und Unterlagen – auch später griffbereit.</span></p><p class="hero-meta">Projektpass erstellt am ${date(p.activated_at)}<br>Ausgeführt von ${esc(company.name)}</p>${c.photos?.[0]?`<img class="hero-photo" src="${labelPhoto(c.photos[0])}" alt="Ihr Bad bei Übergabe">`:''}</section>
 ${c.usage_available_at?`<aside class="quiet"><span class="eyebrow">${Date.parse(c.usage_available_at)>Date.now()?'Heute wichtig':'Zur Übergabe'}</span><h3>${trade.usage}</h3><p>${date(c.usage_available_at,true)} Uhr</p><span class="source">Vom Fachbetrieb dokumentiert</span></aside>`:''}
 <section class="question"><h2>Ihr Bad auf einen Blick</h2><div class="actions">${[[hasTile||hasJoints,'tiles','Materialien','Oberflächen & Aufbau'],[hasCare,'care','Pflege','So bleibt Ihr Bad schön'],[c.documents?.length,'documents','Unterlagen','Merkblätter & Dokumente'],[!preview,'journal','Checkheft','Wartung & Ergänzungen']].filter(([show])=>show).map(([,key,label,description])=>`<button class="action" data-panel="${key}" aria-expanded="false" aria-controls="panel-${key}"><span class="customer-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true">${{tiles:'<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',care:'<path d="M12 3c-2 4-7 8-7 12a7 7 0 0 0 14 0c0-4-5-8-7-12Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',documents:'<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6"/>',journal:'<path d="M8 5H5v16h14V5h-3"/><rect x="8" y="3" width="8" height="4" rx="1"/><path d="m8 14 3 3 5-6"/>'}[key]}</svg></span><strong>${label}</strong><span class="small">${description}</span><span class="arrow">↗</span></button>`).join('')}</div></section>
 ${hasTile||hasJoints?`<section class="customer-panel" id="panel-tiles" hidden tabindex="-1"><h2>${trade.materialTitle}</h2>${material(c[trade.primary],'')}${c.application_area?`<div class="care"><h3>Anwendungsbereich</h3><p>${esc(c.application_area)}</p></div>`:''}${c.substrate||c.preparation?.length?`<div class="care"><h3>Untergrund & Vorbereitung</h3>${preparationHTML(c.preparation||[],p.handover_snapshot?.company?.name||company.name,c.application_area)}${c.substrate?`<p class="preline">${esc(c.substrate)}</p>`:''}</div>`:''}${(c.spare_materials||[]).map(s=>`<div class="spare"><h3>Für später aufgehoben</h3><p>${esc([s.quantity,s.material].filter(Boolean).join(' '))}</p>${s.location?`<p>${esc(s.location)}</p>`:''}${photoPreview(s.photo)}<span class="source">Vom Fachbetrieb dokumentiert</span></div>`).join('')}${hasJoints?`<div id="panel-joints" class="spaced"><h2>${trade.buildTitle}</h2><div class="duo">${other.map(k=>material(c[k],names[k],k,c.waterproofing_details)).join('')}</div></div>`:''}</section>`:''}
 ${hasCare?`<section class="customer-panel" id="panel-care" hidden tabindex="-1"><span class="eyebrow">Für lange Freude an Ihrem Bad</span><h2>Reinigung & Pflege</h2>${careDocuments.length?`<div class="care-documents"><p>Die hinterlegten Anleitungen zu Ihrem Projekt:</p>${documentLinks(careDocuments)}</div>`:''}${Object.entries(c.care_notes||{}).filter(([k,v])=>trade.care.includes(k)&&v).map(([k,v])=>`<div class="care"><h3>${names[k]==='Fliese'?'Fliesen':names[k]==='Fuge'?'Fugen':names[k]}</h3><p>${esc(v)}</p></div>`).join('')}<span class="source">Vom Fachbetrieb dokumentiert</span></section>`:''}
 ${c.photos?.length>1?`<details class="customer-fold section"><summary>Ihr Bad bei Übergabe</summary><div class="gallery">${c.photos.map(v=>`<img src="${labelPhoto(v)}" alt="Ihr Bad bei Übergabe" loading="lazy">`).join('')}</div><span class="source">Vom Fachbetrieb dokumentiert</span></details>`:''}
 ${c.documents?.length?`<section class="customer-panel" id="panel-documents" hidden tabindex="-1"><h2>Ihre Projektunterlagen</h2>${documentLinks(c.documents)}<span class="source">Vom Fachbetrieb dokumentiert</span></section>`:''}
 ${!preview?`<section class="customer-panel" id="panel-journal" hidden tabindex="-1"><span class="eyebrow">Scheckheft fürs Bad</span><h2>Wartung, Reparaturen & Ergänzungen</h2>${journalHTML(p.journal)}<button class="btn light" id="owner-journal-entry">+ Eintrag ergänzen</button>${p.handover_snapshot?`<details class="customer-fold spaced"><summary>Gesicherter Übergabestand${p.handover_snapshot.legacy?' · bei Scheckheft-Einführung gesichert':''}</summary><p>Die Materialangaben dieses Passes stammen aus dem gesicherten Stand. Ergänzungen stehen separat im Scheckheft.</p><p>${esc(p.handover_snapshot.company?.name||'')} · ${date(p.handover_snapshot.handed_over_at||p.activated_at)}</p></details>`:''}</section>`:''}
 ${contact(company)}
 <details class="customer-fold section" id="owner-section"><summary>Mein Bad vervollständigen</summary><div><p>Ihr Fachbetrieb hat seine Arbeit dokumentiert. Hier können Sie weitere Bereiche Ihres Badezimmers ergänzen.</p>${ownerHTML(p.owner_additions)}${!preview?'<button class="btn light spaced" id="owner-edit">Eigene Ergänzungen bearbeiten</button>':''}</div></details>
 <section class="section no-print"><button class="btn light" id="export">Projektpass speichern</button><p class="hint">Wer diesen Kundenlink besitzt, kann die freigegebenen Informationen lesen. Teilen Sie ihn bewusst.</p></section>
 </div>${preview?`</div></details><div class="sticky"><button class="btn olive wide" id="handover">Angaben geprüft – übergeben →</button></div>${message}`:''}`,{customer:true,company});
 if($('#owner-journal-entry'))$('#owner-journal-entry').onclick=()=>ownerEntry(p,{modal,api,bindForm,notify,token:id,refresh:()=>customer(id)});
 $$('[data-panel]').forEach(b=>b.onclick=()=>{if(b.dataset.panel==='help'){service(p);return;}const target=$('#panel-'+b.dataset.panel),open=target.hidden;$$('.customer-panel').forEach(el=>el.hidden=true);$$('[data-panel]').forEach(el=>el.setAttribute('aria-expanded','false'));target.hidden=!open;b.setAttribute('aria-expanded',String(open));if(open){target.focus({preventScroll:true});target.scrollIntoView({behavior:'smooth',block:'start'});}});
 $('#help').onclick=()=>service(p);$('#export').onclick=()=>{
 modal('Ihr Projektpass bleibt bei Ihnen',`<p>Speichern Sie die Informationen zu Ihrem Bad zum Aufheben oder Weitergeben.</p><button class="btn olive wide spaced" id="print-pass">Drucken / als PDF speichern</button><button class="btn light wide spaced" id="download-pass">Daten mit Fotos speichern</button><p class="hint">Im Druckdialog können Sie „Als PDF speichern“ wählen.</p>`);
 $('#print-pass').onclick=()=>{$('#modal').close();window.print();};$('#download-pass').onclick=()=>download('Projektpass-'+num(p.pass_number)+'.json',p);
 };
 if(c.areas?.length){const {mountBathCustomer}=await import('./bath-customer.mjs');if(location.hash===expected)mountBathCustomer(p,{modal});}
 if($('#owner-edit'))$('#owner-edit').onclick=()=>ownerEditor(p,id);
 if(preview){
  $$('[data-review-edit]').forEach(a=>a.onclick=()=>{reviewEditTarget=a.dataset.reviewEdit;});

 }
 if(preview)$('#handover').onclick=()=>run($('#handover'),async()=>{const current=await api('project',{id:p.id});if(current.disabled)throw Error('Bitte zuerst den Kundenlink im Projekt wieder freigeben.');const ready=await api('handover',{id:p.id,version:p.version});go('ready/'+ready.id);},$('.form-message'));
}
function handoverReady(p){shell(`<section class="handover-ready"><div class="handover-seal" aria-hidden="true">✓</div><span class="eyebrow">Übergabe abgeschlossen</span><h1>Bereit für<br>Ihren Kunden.</h1><p class="intro">Ihr Kunde bekommt die hinterlegten Materialien, Pflegehinweise und Unterlagen gesammelt – mit Ihrem Betrieb als Ansprechpartner.</p><div class="handover-project"><div class="pass-number">${num(p.pass_number)}</div><div><h3>${esc(p.title)}</h3><p class="muted">Ein Scan. Alles zum Bad.</p></div></div><a class="btn olive wide" href="#p/${p.token}">Kundenansicht öffnen</a><button class="btn light wide spaced" id="copy-link">Kundenlink kopieren</button><button class="btn light wide spaced" id="handover-card">Übergabekarte mit QR-Code</button><p class="hint">Den NFC-/QR-Pass am vereinbarten Ort übergeben. Der Kunde kann direkt scannen – ohne App und ohne Anmeldung.</p><p class="hint">Öffnen Sie den Link zur ersten Kontrolle auf einem zweiten Smartphone.</p><a class="btn light wide spaced" href="#work/${p.id}">Scheckheft verwalten</a><a class="btn text spaced" href="#home">Zurück zu meinen Projekten →</a></section>`);$('#handover-card').onclick=()=>run($('#handover-card'),async()=>{const {openHandoverCard}=await import('./handover-card.mjs');openHandoverCard(p,p.company||dashboard?.company||p.company_snapshot||{},{modal});});$('#copy-link').onclick=()=>run($('#copy-link'),async()=>{await navigator.clipboard.writeText(location.origin+'/#p/'+p.token);notify('Kundenlink kopiert.');});}
function ownerHTML(additions=[]){return additions.map(a=>`<article class="owner-entry"><h3>${esc(a.type)}</h3><span class="source">Von Ihnen ergänzt</span>${a.company?.name?`<p>${esc(a.company.name)}${a.company.phone?' · '+esc(a.company.phone):''}</p>`:''}${a.products.map(v=>`<div class="owner-product"><strong>${esc([v.manufacturer,v.name,v.model].filter(Boolean).join(' '))}</strong>${v.note?`<p class="preline">${esc(v.note)}</p>`:''}${photoPreview(v.photo)}${safeLink(v.url)?`<p><a href="${esc(safeLink(v.url))}" rel="noopener noreferrer" target="_blank">Unterlage öffnen ↗</a></p>`:''}</div>`).join('')}</article>`).join('');}
function ownerEditor(p,token){
 let additions=structuredClone(p.owner_additions||[]),v=p.owner_version;
 modal('Ihr Bad ergänzen',`<p>Für Änderungen brauchen Sie den persönlichen Ergänzungsschlüssel Ihres Fachbetriebs.</p><form id="owner">${field('Ergänzungsschlüssel','key',ownerKey,'password','required autocomplete="off" minlength="64" maxlength="64"')}<div id="owner-entries"></div><button class="btn light" type="button" id="add-entry">+ Bereich hinzufügen</button>${message}<button class="btn olive wide spaced" type="submit">Eigene Ergänzungen speichern</button></form>`);
 const render=()=>{
 $('#owner-entries').innerHTML=additions.map((a,i)=>`<section class="form-block"><div class="field"><label for="type-${i}">Bereich</label><select id="type-${i}" data-owner="${i}:type">${['Sanitär','Elektro','Möbel / Ausstattung','Sonstiges'].map(k=>`<option ${a.type===k?'selected':''}>${k}</option>`).join('')}</select></div>${field('Fachbetrieb (optional)','owner-company-'+i,a.company?.name)}${field('Telefon (optional)','owner-phone-'+i,a.company?.phone,'tel')}<div class="owner-products">${a.products.map((item,j)=>`<div>${field('Produkt / Gerät','owner-name-'+i+'-'+j,item.name)}${field('Hersteller','owner-maker-'+i+'-'+j,item.manufacturer)}${field('Modell','owner-model-'+i+'-'+j,item.model)}${area('Notiz','owner-note-'+i+'-'+j,item.note)}${field('Unterlage / Link','owner-url-'+i+'-'+j,item.url,'url')}${photoInput('Produktfoto','owner-photo-'+i+'-'+j)}${photoPreview(item.photo)}<button type="button" class="btn text" data-remove-product="${i}:${j}">Produkt entfernen</button></div>`).join('')}</div><button class="btn light" type="button" data-add-product="${i}">+ Produkt hinzufügen</button><button class="btn danger" type="button" data-remove-entry="${i}">Bereich löschen</button></section>`).join('');
 $$('[data-add-product]').forEach(b=>b.onclick=()=>{collect();additions[+b.dataset.addProduct].products.push({});render();});
 $$('[data-remove-entry]').forEach(b=>b.onclick=()=>{collect();additions.splice(+b.dataset.removeEntry,1);render();});
 $$('[data-remove-product]').forEach(b=>b.onclick=()=>{collect();const [i,j]=b.dataset.removeProduct.split(':').map(Number);additions[i].products.splice(j,1);render();});
 additions.forEach((a,i)=>a.products.forEach((item,j)=>{$('#owner-photo-'+i+'-'+j).onchange=e=>run($('[type=submit]',$('#owner')),async()=>{collect();if(e.target.files[0])item.photo=await compress(e.target.files[0]);render();},$('.form-message',$('#owner')));}));
 };
 function collect(){additions.forEach((a,i)=>{a.type=$('#type-'+i).value;a.company={name:$('#owner-company-'+i).value,phone:$('#owner-phone-'+i).value};a.products.forEach((item,j)=>{for(const [key,prefix] of [['name','name'],['manufacturer','maker'],['model','model'],['note','note'],['url','url']])item[key]=$('#owner-'+prefix+'-'+i+'-'+j).value;});});}
 render();$('#add-entry').onclick=()=>{collect();additions.push({id:crypto.randomUUID(),type:'Sanitär',company:{},products:[{}]});render();};
 bindForm('#owner',async form=>{collect();ownerKey=fields(form).key;await api('owner_save',{token,key:ownerKey,version:v,additions});$('#modal').close();await customer(token);$('#owner-section').open=true;notify('Ihre Ergänzungen sind gespeichert.');});
}
function service(p){
 modal('Worum geht es?',`<form id="service"><div class="field"><label for="issue">Bereich</label><select id="issue" name="issue">${tradeFor(p.content.trade).products.map(k=>`<option>${names[k]}</option>`).join('')}<option>Sonstiges</option></select></div>${area('Kurze Nachricht','message')}${field('Ihr Name','name','','text','required autocomplete="name"')}${field('Telefon oder E-Mail','contact','','text','required')}<p class="hint">Ihr E-Mail-Programm öffnet sich mit dem Projektkontext. Dort können Sie ein Foto anhängen und die Nachricht absenden.</p>${message}<button class="btn olive wide" type="submit">Anfrage in E-Mail öffnen</button></form>`);
 bindForm('#service',async form=>{const v=fields(form);if(!p.company.email)throw Error('Ihr Fachbetrieb hat keine E-Mail hinterlegt. Bitte nutzen Sie den Telefonkontakt.');const context=[`Projekt: ${p.title}`,`Projekt-ID: ${p.id}`,`Pass: ${num(p.pass_number)}`,`Erstellt am: ${date(p.activated_at)}`,...tradeFor(p.content.trade).products.filter(k=>hasProduct(p.content[k])).map(k=>`${names[k]}: ${Object.values(p.content[k]).filter(x=>x&&!String(x).startsWith('data:')).join(' · ')}`),`Bereich: ${v.issue}`,`Nachricht: ${v.message}`,`Kontakt: ${v.name} · ${v.contact}`].join('\n');location.href=`mailto:${encodeURIComponent(p.company.email)}?subject=${encodeURIComponent('Projektpass · '+p.title)}&body=${encodeURIComponent(context)}`;$('.form-message',form).textContent='Anfrage vorbereitet. Bitte in Ihrem E-Mail-Programm prüfen und absenden.';});
}
async function settings(){
 const c=structuredClone(dashboard.company),first=c.onboarding_complete===false;let logo=c.logo||'';
 const runId=routeVersion,catalog=await loadCatalog().catch(()=>({manufacturers:[],products:[]}));if(runId!==routeVersion)return;
 const makerNames=[...new Set([...catalog.manufacturers.map(m=>m.name),...(c.preferred_manufacturers||[])])];
 const manufacturerChoices=makerNames.map(name=>{
  const ids=catalog.manufacturers.filter(m=>m.name===name).map(m=>m.id);
  const kinds=[...new Set(catalog.products.filter(p=>ids.includes(p.manufacturer_id)).flatMap(p=>p.kinds))];
  return `<label class="recipient" data-maker-kinds="${esc((kinds.length?kinds:productKeys).join(' '))}"><input type="checkbox" name="preferred-manufacturer" value="${esc(name)}" ${(c.preferred_manufacturers||[]).includes(name)?'checked':''}> ${esc(name)}</label>`;
 }).join('');
 const selected=first?'':(c.trade||'tile');
 shell(`<section class="admin-title">${first?'':'<a class="btn text" href="#home">← Meine Projekte</a>'}<span class="eyebrow">${first?'Schritt 2 · Ihr Betriebsprofil':'Einmal hinterlegen. Immer dabei.'}</span><h1>${first?'Richten Sie Ihren Betrieb ein.':'Ihr Betrieb.'}</h1><p class="muted">Ihr Gewerk bestimmt die passenden Fragen. Firmenname, Logo und Kontakt begleiten später jede Kundenübergabe. Ihren üblichen Aufbau können Sie im ersten Projekt speichern.</p></section><form id="settings"><div class="field"><label for="trade">Ihr Gewerk</label><select id="trade" name="trade" required><option value="" ${selected?'':'selected'} disabled>Bitte auswählen</option>${Object.entries(trades).map(([k,t])=>`<option value="${k}" ${selected===k?'selected':''}>${t.label}</option>`).join('')}</select></div><div class="form-grid">${field('Firmenname','name',c.name,'text','required')}${field('Ansprechpartner','contact',c.contact)}${field('Telefon','phone',c.phone,'tel')}${field('E-Mail','email',c.email,'email')}${field('Website','website',c.website,'url')}</div>${Object.keys(c.standards||{}).length?'<section class="form-block"><h2>Ihr gespeicherter Aufbau</h2><p>Neue Projekte übernehmen Ihren Standard. Einzelne Produkte ändern Sie direkt im Projekt.</p><button type="button" class="btn light" id="clear-standard">Standard für das gewählte Gewerk entfernen</button><p id="standard-status" role="status"></p></section>':''}<section class="form-block" id="manufacturer-preferences"><h2>Mit welchen Herstellern arbeiten Sie?</h2><p class="hint">Optional auswählen. Diese erscheinen im Projekt zuerst. Weitere Hersteller bleiben jederzeit erreichbar.</p><div class="chips">${manufacturerChoices}</div></section>${photoInput('Firmenlogo','logo')}<div id="logo-preview">${photoPreview(logo)}</div><details class="form-block"><summary>Ihre Pflegehinweise (optional)</summary><p class="hint">Nur eigene, fachlich geprüfte Hinweise hinterlegen. Neue Projekte übernehmen diese Angaben.</p>${productKeys.map(k=>`<div data-care-kind="${k}">${area(names[k],'care-'+k,c.care_notes?.[k])}</div>`).join('')}</details><details class="form-block" id="favorites-section"><summary>Meine Produkte (optional)</summary><div id="favorites-editor"></div></details>${message}<div class="sticky"><button class="btn olive" type="submit">${first?'Betrieb einrichten & starten':'Betriebsprofil speichern'}</button></div></form>`);
 const favoritesEditor=createFavoritesEditor($('#favorites-editor'),c.favorites,{modal,openCatalogPicker,onChange:()=>dirty=true});
 let favoriteTrade=$('#trade').value;const showTrade=()=>{if(!favoritesEditor.setTrade($('#trade').value)){$('#trade').value=favoriteTrade;return;}favoriteTrade=$('#trade').value;const t=trades[favoriteTrade];$$('[data-care-kind]').forEach(el=>el.hidden=!t?.care.includes(el.dataset.careKind));$$('[data-product-kind]').forEach(el=>el.hidden=!t?.products.includes(el.dataset.productKind));$$('[data-maker-kinds]').forEach(el=>el.hidden=!el.dataset.makerKinds.split(' ').some(k=>t?.products.includes(k)));$('#manufacturer-preferences').hidden=!$$('[data-maker-kinds]').some(el=>!el.hidden);};
 if($('#clear-standard'))$('#clear-standard').onclick=()=>{const kind=$('#trade').value;if(!kind)return;delete c.standards[kind];dirty=true;$('#standard-status').textContent='Standard entfernt. Bitte Betriebsprofil speichern.';};
 showTrade();$('#trade').onchange=()=>{showTrade();dirty=true;};
 $('#settings').oninput=()=>dirty=true;
 $('#logo').onchange=e=>run($('[type=submit]',$('#settings')),async()=>{if(e.target.files[0])logo=await compress(e.target.files[0]);$('#logo-preview').innerHTML=photoPreview(logo);dirty=true;});
 bindForm('#settings',async form=>{const v=fields(form);if(!trades[v.trade])throw Error('Bitte Ihr Gewerk auswählen.');
 const profile={...c,...Object.fromEntries(['name','contact','phone','email','website'].map(k=>[k,v[k]])),logo,trade:v.trade,onboarding_complete:true,preferred_manufacturers:new FormData(form).getAll('preferred-manufacturer'),
 care_notes:Object.fromEntries(productKeys.map(k=>[k,v['care-'+k]])),favorites:favoritesEditor.read()};
 const saved=await api('company_save',{profile,version:dashboard.company_version});Object.assign(dashboard,saved);dirty=false;notify('Betriebsprofil gespeichert.');go('home');});
}
let previousHash=location.hash,allowNavigation=false,reviewEditTarget=null;
async function render(){
 editorSession?.dispose();editorSession=null;
 const runId=++routeVersion;const loading=document.querySelector('#route-status');if(loading){loading.textContent='Seite wird geladen …';loading.hidden=false;}const [route,arg]=location.hash.slice(1).split('/');if($('#modal').open)$('#modal').close();
 const operatorContext=()=>({api,shell,bindForm,run,notify,go,dashboard,isCurrent:()=>runId===routeVersion,
   setDirty:value=>{dirty=value;},completeAccess:data=>{dashboard=data;dirty=false;history.replaceState(null,'',location.pathname+location.search+'#home');previousHash=location.hash;render();}});
 try{
  const flowContext={api,shell,run,bindForm,notify,modal,isCurrent:()=>runId===routeVersion,setDirty:value=>dirty=value};
  if(route==='site'){await participantPage(arg,flowContext);return;}
  if(route==='p'){await customer(arg);return;}
  if(route==='access'){await accessPage(arg,operatorContext());return;}
  if(route==='login'||!route){login();return;}
  await loadDashboard({reuse:true});if(runId!==routeVersion)return;
  if(['admin','business-new','business'].includes(route)){await operatorPage(route,arg,operatorContext());return;}
  if(route==='catalog'){await catalogPage({shell,isCurrent:()=>runId===routeVersion});return;}
  if(dashboard.role==='operator'&&!dashboard.company){if(route==='home'){await operatorPage('admin',null,operatorContext());return;}go('admin');return;}
  if(dashboard.company?.onboarding_complete===false&&route!=='settings'){go('settings');return;}
  if(route==='bath'){const {bathEditor}=await import('./bath-editor.mjs');editorSession=await bathEditor(arg,{...flowContext,go,dashboard});return;}
  if(route==='work')await workflowPage(arg,flowContext);else if(route==='home')home();else if(route==='passes')passes();else if(route==='activate')activate(arg);else if(route==='edit')await edit(arg);else if(route==='preview')await customer(arg,true);else if(route==='settings')await settings();else if(route==='ready'){const p=await api('project',{id:arg});if(p.status!=='handed_over')throw Error('Bitte das Projekt zuerst übergeben.');handoverReady(p);}else throw Error('Diese Seite wurde nicht gefunden.');
  window.scrollTo(0,0);
  if(route==='edit'&&$('#edit')){const link=document.createElement('a');link.className='btn light spaced';link.href='#bath/'+arg;link.textContent='Flächenbezogenen Bad-Ablauf öffnen →';$('#edit').before(link);}
  if(route==='edit'&&reviewEditTarget){const target=reviewEditTarget;reviewEditTarget=null;const section=$('[data-editor-section="'+(['project','files','handover'].includes(target)?target:'materials')+'"]');section?.querySelector(':scope > summary').click();if(['project','files','handover'].includes(target))return;const card=$('[data-material="'+(target==='finish'?'surface':target)+'"]')||$('[data-material="surface"]');if(target==='finish')$('[data-material="finish"] .material-edit').open=true;if(card){if(!card.open)card.querySelector(':scope > summary').click();card.scrollIntoView?.({block:'start',behavior:'auto'});card.querySelector('summary').focus();}}
 }catch(e){
  if(runId!==routeVersion)return;
  if(e.status===401){login(location.hash.slice(1)||'home');notify(e.message);return;}
  shell(`<section class="hero"><h1>${route==='p'?'Ihr Projektpass.':'Einen Moment.'}</h1>${errorHTML(e.message)}<button class="btn olive spaced" id="retry">Erneut versuchen</button>${route==='p'?`<p><a class="btn text" href="#activate/${esc(arg)}">Als Fachbetrieb öffnen →</a></p>`:'<p><a class="btn text" href="#login">Zum Betriebszugang →</a></p>'}</section>`,{customer:true});$('#retry').onclick=render;
 }finally{if(runId===routeVersion&&loading){loading.hidden=true;loading.textContent='';}}
}
window.addEventListener('hashchange',async()=>{
 if(allowNavigation){allowNavigation=false;return;}
 const target=location.hash;
 if(dirty&&editorSession){try{await editorSession.flush();}catch{}if(location.hash!==target)return;}
 if(dirty&&!confirm('Es gibt ungespeicherte Änderungen. Seite trotzdem verlassen?')){allowNavigation=true;location.hash=previousHash;return;}
 dirty=false;previousHash=location.hash;ownerKey='';render();
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
const printDetails=[];window.addEventListener('beforeprint',()=>{$$('details').forEach(d=>{printDetails.push([d,d.open]);d.open=true;});});window.addEventListener('afterprint',()=>{printDetails.splice(0).forEach(([d,open])=>d.open=open);});
render();
