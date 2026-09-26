import {esc,date,field,fields,compress,labelPhoto} from './ui.mjs';
const $=(s,r=document)=>r.querySelector(s);
const message='<div class="form-message" role="status"></div>';
const logoPreview=logo=>labelPhoto(logo)?`<img class="photo-preview" src="${logo}" alt="Firmenlogo">`:'';

export async function operatorPage(route,id,ctx){
 const {api,shell,bindForm,run,notify,go,setDirty,isCurrent,dashboard}=ctx;
 if(dashboard.role!=='operator'){const e=Error('Die Betriebsverwaltung ist nur für den Betreiber zugänglich.');e.status=403;throw e;}
 if(route==='admin'){
   const data=await api('operator_list');if(!isCurrent())return;
   shell(`<section class="admin-title"><span class="eyebrow">Betreiberverwaltung</span><h1>Ihre Betriebe.<br>Alles im Blick.</h1><p class="intro">Betriebsprofile und Zugänge für PROJEKTPASS verwalten.</p><div class="row spaced">${dashboard.company?'':'<a class="btn olive" href="#business-new/me">Meinen Betrieb einrichten</a>'}<a class="btn light" href="#business-new">+ Betrieb anlegen</a></div><div class="stats"><div><strong>${data.companies.length}</strong><span>Betriebe</span></div><div><strong>${data.companies.filter(c=>c.active).length}</strong><span>Aktive Zugänge</span></div></div><div class="search"><label class="sr-only" for="business-search">Betriebe suchen</label><input id="business-search" type="search" placeholder="Firma, Ansprechpartner oder E-Mail"></div><div id="businesses"></div></section>`);
   const render=query=>{$('#businesses').innerHTML=data.companies.filter(c=>[c.name,c.contact,c.email].join(' ').toLowerCase().includes(query.toLowerCase())).map(c=>`<article class="list-item"><div class="content"><h2>${esc(c.name)}</h2><p class="small muted">${esc(c.contact||c.email||'Kontaktdaten noch offen')}</p><p class="small">${c.active?'Zugang aktiv':c.invited?'Einrichtung ausstehend':'Noch kein Zugang'} · ${c.passes} Pässe · ${c.projects} Projekte</p></div><div class="buttons"><a href="#business/${c.id}">Verwalten →</a></div></article>`).join('')||'<p class="empty">Noch kein passender Betrieb vorhanden. Über „Betrieb anlegen“ starten Sie.</p>';};
   render('');$('#business-search').oninput=e=>render(e.target.value);return;
 }
 const fresh=route==='business-new',own=fresh&&id==='me';
 const business=fresh?{id:crypto.randomUUID(),profile:{},members:[],version:1}:await api('operator_company',{id});
 if(!isCurrent())return;
 const profile=business.profile;let logo=profile.logo||'';
 shell(`<section class="admin-title"><a class="btn text" href="#admin">← Alle Betriebe</a><span class="eyebrow">Betreiberverwaltung</span><h1>${fresh?(own?'Meinen Betrieb einrichten.':'Betrieb anlegen.'):esc(profile.name)}</h1><p class="intro">${fresh?(own?'Dieser Betrieb gehört zu Ihrem bestehenden Zugang. Anschließend wählen Sie Ihr Gewerk.':'Firmenname eintragen und bei Bedarf Kontaktdaten ergänzen. Der neue Betrieb erhält 20 Projektpässe.'):'Betriebsprofil und Zugang verwalten. Die Projektdaten bleiben dem jeweiligen Betriebszugang zugeordnet.'}</p></section><form id="operator-business"><div class="form-grid">${field('Firmenname','name',profile.name,'text','required maxlength="150"')}${field('Ansprechpartner','contact',profile.contact)}${field('Telefon','phone',profile.phone,'tel')}${field('Öffentliche Kontakt-E-Mail','email',profile.email,'email')}${field('Website','website',profile.website,'url')}</div><div class="field"><label for="business-logo">Firmenlogo (optional)</label><input id="business-logo" type="file" accept="image/*"></div><div id="business-logo-preview">${logoPreview(logo)}</div><button id="remove-business-logo" class="btn text" type="button" ${logo?'':'hidden'}>Logo entfernen</button>${message}<button class="btn olive spaced" type="submit">${fresh?'Betrieb anlegen':'Betriebsprofil speichern'}</button></form>${fresh?'':`<section class="section"><h2>Betriebszugang</h2><p>${business.passes} Projektpässe · ${business.projects} Projekte</p>${business.members.length?`<p class="spaced">Zugang eingerichtet für ${business.members.map(m=>esc(m.email||'den hinterlegten Benutzer')).join(', ')}.</p>`:`<p class="spaced">Erstellen Sie einen persönlichen Einrichtungslink. Der Empfänger wählt darüber sein Passwort selbst.</p>${business.invite?`<p class="hint">Letzter Link für ${esc(business.invite.email)}: ${Date.parse(business.invite.expires_at)>Date.now()?'gültig bis '+date(business.invite.expires_at,true):'abgelaufen'}. Ein neuer Link ersetzt den bisherigen.</p>`:''}<form id="business-access" class="spaced">${field('E-Mail für die Anmeldung','login-email',business.invite?.email||profile.email||'','email','required autocomplete="off"')}${message}<button class="btn olive" type="submit">${business.invite?'Neuen Einrichtungslink erstellen':'Einrichtungslink erstellen'}</button></form><div id="created-access"></div>`}</section>`}`);
 const form=$('#operator-business');form.oninput=()=>setDirty(true);
 function renderLogo(){$('#business-logo-preview').innerHTML=logoPreview(logo);$('#remove-business-logo').hidden=!logo;}
 $('#remove-business-logo').onclick=()=>{logo='';renderLogo();setDirty(true);};
 $('#business-logo').onchange=e=>run($('[type=submit]',form),async()=>{if(e.target.files[0]){logo=await compress(e.target.files[0]);renderLogo();setDirty(true);}e.target.value='';},$('.form-message',form));
 bindForm('#operator-business',async form=>{
   const v=fields(form),next={...profile,...Object.fromEntries(['name','contact','phone','email','website'].map(k=>[k,v[k]])),logo};
   const saved=await api(fresh?'operator_create':'operator_save',{id:business.id,version:business.version,profile:next,use_for_me:own});
   setDirty(false);business.version=saved.version;business.profile=saved.profile;
   if(fresh){go(own?'settings':'business/'+saved.id);notify(own?'Ihr Betrieb ist angelegt. Jetzt das Gewerk auswählen.':'Betrieb mit 20 Projektpässen angelegt. Jetzt den Zugang einrichten.');}
   else {$('h1').textContent=saved.profile.name;notify('Betriebsprofil gespeichert.');}
 });
 if($('#business-access'))bindForm('#business-access',async form=>{
   const result=await api('operator_invite',{id:business.id,email:fields(form)['login-email']});
   $('#created-access').innerHTML=`<div class="quiet spaced"><h3>Einrichtungslink bereit</h3><p>Für ${esc(result.invite.email)} · gültig bis ${date(result.invite.expires_at,true)} Uhr.</p><p class="hint">Nur an den vorgesehenen Empfänger weitergeben. Der Link ist einmal verwendbar. Es wurde keine E-Mail versendet.</p><label class="sr-only" for="access-link">Persönlicher Einrichtungslink</label><textarea class="secret wide" id="access-link" readonly rows="3">${esc(result.access_link)}</textarea><button class="btn olive" type="button" id="copy-access-link">Link kopieren</button></div>`;
   $('[type=submit]',form).textContent='Neuen Einrichtungslink erstellen';
   $('.form-message',form).textContent='Ein neuer Link ersetzt immer den bisherigen.';
   $('#copy-access-link').onclick=()=>run($('#copy-access-link'),async()=>{await navigator.clipboard.writeText(result.access_link);notify('Einrichtungslink kopiert.');});
 });
}

export async function accessPage(token,ctx){
 const info=await ctx.api('access_info',{token});if(!ctx.isCurrent())return;
 ctx.shell(`<section class="hero login-box account-setup"><span class="eyebrow">${info.kind==='operator'?'PROJEKTPASS · Betreiberzugang':'Ihr Betriebszugang'}</span><h1>${info.kind==='operator'?'Willkommen bei PROJEKTPASS.':esc(info.company_name)}</h1><p class="intro">Legen Sie Ihren persönlichen Zugang fest. Danach können Sie direkt starten.</p><form id="access-setup" class="spaced">${field('E-Mail für die Anmeldung','setup-email',info.email||'','email',`required autocomplete="username" ${info.email?'readonly':''}`)}${field('Passwort','setup-password','','password','required minlength="12" maxlength="72" autocomplete="new-password"')}${field('Passwort wiederholen','setup-repeat','','password','required minlength="12" maxlength="72" autocomplete="new-password"')}<p class="hint">Mindestens 12 Zeichen. Wenn Sie mit dieser E-Mail bereits einen Zugang haben, verwenden Sie Ihr bestehendes Passwort.</p>${message}<button class="btn olive wide" type="submit">Zugang einrichten</button></form><p class="hint">Der Einrichtungslink ist einmal verwendbar und bis ${date(info.expires_at,true)} Uhr gültig.</p><a class="btn text spaced" href="#login">Bereits eingerichtet? Zur Anmeldung →</a></section>`,{customer:true});
 ctx.bindForm('#access-setup',async form=>{
   const v=fields(form);if(v['setup-password']!==v['setup-repeat'])throw Error('Die beiden Passwörter stimmen noch nicht überein.');
   const data=await ctx.api('access_activate',{token,email:v['setup-email'],password:v['setup-password']});
   ctx.completeAccess(data);
 });
}
