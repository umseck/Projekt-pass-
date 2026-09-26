import {esc,num,date,field,area,fields,compress,safeLink,labelPhoto} from './ui.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const message='<div class="form-message" role="status"></div>';
export function collaboration({api,shell,modal,bindForm,run,notify,openOwnerEditor}){
 const notesHTML=(notes=[],author='')=>notes.length?notes.map(n=>{
   const expired=n.note.until&&Date.parse(n.note.until)<=Date.now();
   return `<article class="care ${expired?'expired-note':''}"><span class="source">${esc(n.author)} · ${date(n.created_at,true)}</span><p class="preline">${esc(n.note.text)}</p>${n.note.until?`<p class="hint">${expired?'Abgelaufen':'Gilt bis'}: ${date(n.note.until,true)}</p>`:'<p class="hint">Gilt bis zur Freigabe durch den Verfasser.</p>'}${author===n.author?`<button class="btn text" data-resolve="${n.id}">Hinweis erledigt</button>`:''}${labelPhoto(n.note.photo)?`<img class="photo-preview" src="${n.note.photo}" alt="Foto zum Hinweis">`:''}</article>`;
 }).join(''):'<p class="hint">Noch keine Hinweise hinterlegt. Vor Arbeitsbeginn im Zweifel beim Betrieb nachfragen.</p>';
 const noteForm=()=>`<form id="site-note">${area('Was muss der Nächste wissen?','note-text','','required maxlength="2000" placeholder="Zum Beispiel: Boden bis morgen 10 Uhr nicht betreten."')}<details><summary>Foto oder Gültigkeit ergänzen</summary>${field('Gilt bis (optional)','note-until','','datetime-local')}<div class="field"><label for="note-photo">Foto (optional)</label><input id="note-photo" type="file" accept="image/*"></div></details><p class="hint">Zum Diktieren das Mikrofon Ihrer Handytastatur nutzen. Hinweise sind über die Karte lesbar; keine privaten Daten eintragen.</p>${message}<button class="btn olive spaced" type="submit">Hinweis hinterlassen</button></form>`;
 function bindResolve(op,args,author,notes){
   $('#site-notes').innerHTML=notesHTML(notes,author);
   $$('[data-resolve]').forEach(b=>b.onclick=()=>run(b,async()=>{const r=await api(op,{...args,note_id:b.dataset.resolve});bindResolve(op,args,author,r.notes);}));
 }
 function bindNote(op,args,done){bindForm('#site-note',async form=>{
   const v=fields(form),file=$('#note-photo').files[0];
   const r=await api(op,{...args,note:{text:v['note-text'],until:v['note-until']?new Date(v['note-until']).toISOString():'',photo:file?await compress(file):''}});
   form.reset();await done(r);notify('Hinweis gespeichert.');
 });}
 function share(title,link){
   modal(title,`<p>Dieser persönliche Link erlaubt Änderungen. Nur an den vorgesehenen Empfänger weitergeben, nicht an die Tür hängen.</p><div class="field"><label for="share-link">Persönlicher Link</label><textarea id="share-link" readonly>${esc(link)}</textarea></div><button class="btn olive" id="copy-invite">Link kopieren</button>${message}`);
   $('#copy-invite').onclick=()=>run($('#copy-invite'),async()=>{await navigator.clipboard.writeText(link);notify('Link kopiert.');},$('#modal .form-message'));
 }
 function invite(op,args,done){
   modal('Gewerk einladen',`<p>Ein persönlicher Link. Kein Firmenprofil nötig. Jeder bearbeitet nur seinen eigenen Beitrag.</p><form id="invite-form">${field('Gewerk oder Firma','label','','text','required maxlength="100" placeholder="Zum Beispiel: Huber Sanitär"')}${message}<button type="submit" class="btn olive">Einladungslink erstellen</button></form>`);
   bindForm('#invite-form',async form=>{const r=await api(op,{...args,label:fields(form).label});await done?.();share('Einladung für '+r.label,location.origin+'/#trade/'+args.token+'/'+r.participant_id+'/'+r.invite_key);});
 }
 function site(p,token){
   shell(`<section class="hero"><span class="eyebrow">Bauphase · Pass ${num(p.pass_number)}</span><h1>Vor der Arbeit<br>kurz nachsehen.</h1><p>Aktuelle Hinweise der beteiligten Handwerker.</p></section><button class="btn light" id="refresh-board">Hinweise aktualisieren</button><section id="site-notes">${notesHTML(p.notes)}</section><p class="hint">Wichtige Sperrhinweise gehören zusätzlich sichtbar an die Tür. Zum Schreiben den persönlichen Einladungslink verwenden.</p><a class="btn light" href="#activate/${token}">Als verantwortlicher Betrieb öffnen</a>`,{customer:true});
   $('#refresh-board').onclick=()=>location.reload();
 }
 function bindSite(p,before,reload){
   if(p.status!=='draft')return;
   const holder=document.createElement('section');holder.className='section';holder.id='construction-tools';
   holder.innerHTML=`<h2>Auf der Baustelle</h2><div class="row"><button class="btn light" id="open-board">Türansicht öffnen</button><button class="btn light" id="invite-trade">Gewerk einladen</button></div><details class="spaced"><summary>Hinweis hinterlassen</summary>${noteForm()}</details><div id="site-notes">${notesHTML(p.notes)}</div><details><summary>Beteiligte Gewerke (${(p.trades||[]).length})</summary>${(p.trades||[]).map(t=>`<div class="care"><strong>${esc(t.label)}</strong>${t.revoked?'<p>Zugang beendet</p>':`<button class="btn text" data-revoke="${t.id}">Zugang beenden</button>`}</div>`).join('')}</details>`;
   $('#edit').before(holder);
   $('#open-board').onclick=()=>run($('#open-board'),async()=>{await before();location.hash='p/'+p.token;});
   $('#invite-trade').onclick=()=>run($('#invite-trade'),async()=>{await before();invite('site_invite',{id:p.id,token:p.token},reload);});
   bindResolve('site_resolve',{id:p.id},p.company_snapshot?.name,p.notes);
   bindNote('site_note',{id:p.id},async r=>{bindResolve('site_resolve',{id:p.id},p.company_snapshot?.name,r.notes);});
   $$('[data-revoke]').forEach(b=>b.onclick=()=>run(b,async()=>{await api('site_revoke',{id:p.id,participant_id:b.dataset.revoke});b.replaceWith(document.createTextNode('Zugang beendet'));}));
 }
 const tradeHTML=(trades=[])=>trades.filter(t=>Object.values(t.entry||{}).some(Boolean)).map(t=>`<article class="owner-entry"><h3>${esc(t.label)}</h3><span class="source">Über den persönlichen Firmenlink ergänzt · ${date(t.updated_at)}</span>${t.entry.product?`<p><strong>${esc(t.entry.product)}</strong></p>`:''}${t.entry.note?`<p class="preline">${esc(t.entry.note)}</p>`:''}${labelPhoto(t.entry.photo)?`<img class="photo-preview" src="${t.entry.photo}" alt="Dokumentiertes Produkt">`:''}${safeLink(t.entry.url)?`<p><a href="${esc(safeLink(t.entry.url))}" target="_blank" rel="noopener noreferrer">Unterlage öffnen ↗</a></p>`:''}</article>`).join('');
 async function trade(token,participant_id,key){
   let p=await api('trade_open',{token,participant_id,key});
   if(location.hash!==`#trade/${token}/${participant_id}/${key}`)return;
   let photo=p.entry.photo||'';
   shell(`<section class="hero"><span class="eyebrow">Ihr Beitrag · ${p.phase==='draft'?'Bauphase':'Kundenmappe'}</span><h1>${esc(p.label)}</h1><p>Nur Ihren Teil ergänzen. Alles andere bleibt geschützt.</p></section>${p.phase==='draft'?`<details class="section" open><summary>Baustellenhinweise</summary><div id="site-notes">${notesHTML(p.notes)}</div>${noteForm()}</details>`:''}<form id="trade-entry"><h2>Für die Kundenmappe</h2>${field('Material / Produkt (optional)','product',p.entry.product,'text','maxlength="1000"')}${area('Was soll der Kunde wissen?','trade-text',p.entry.note,'maxlength="3000"')}<details><summary>Foto oder Unterlage ergänzen</summary><div class="field"><label for="trade-photo">Etikett oder Produkt fotografieren</label><input id="trade-photo" type="file" accept="image/*"></div>${photo?`<img class="photo-preview" src="${labelPhoto(photo)}" alt="Gespeichertes Produktfoto"><label><input type="checkbox" name="remove_photo"> Foto entfernen</label>`:''}${field('Unterlage als Link (optional)','url',p.entry.url,'url')}</details><p class="hint">Diese Angaben bleiben nach der Übergabe beim Kunden. Keine internen Baustellenhinweise hier eintragen.</p>${message}<button type="submit" class="btn olive wide spaced">Meinen Beitrag speichern</button></form>`,{customer:true});
   if(p.phase==='draft'){bindResolve('trade_resolve',{token,participant_id,key},p.label,p.notes);bindNote('trade_note',{token,participant_id,key},async r=>{bindResolve('trade_resolve',{token,participant_id,key},p.label,r.notes);});}
   bindForm('#trade-entry',async form=>{const v=fields(form),file=$('#trade-photo').files[0];if(v.remove_photo)photo='';if(file)photo=await compress(file);p=await api('trade_save',{token,participant_id,key,version:p.version,entry:{product:v.product,note:v['trade-text'],url:v.url,photo}});$('#trade-entry .form-message').textContent='Ihr Beitrag ist gespeichert.';});
 }
 async function owner(token,key=''){
   if(!key){shell(`<section class="hero"><h1>Mein Projekt verwalten</h1><form id="owner-unlock">${field('Persönlicher Schlüssel','key','','password','required minlength="64" maxlength="64" autocomplete="off"')}${message}<button class="btn olive" type="submit">Öffnen</button></form></section>`,{customer:true});bindForm('#owner-unlock',async form=>owner(token,fields(form).key));return;}
   const p=await api('owner_manage',{token,key});
   shell(`<section class="hero"><span class="eyebrow">Ihr persönlicher Zugang</span><h1>Mein Projekt.</h1><p>Firmen einladen und Zugänge verwalten. Jede Firma ergänzt nur ihren eigenen Beitrag.</p><button class="btn olive" id="owner-invite">Firma einladen</button><button class="btn light" id="owner-additions">Eigene Angaben ergänzen</button><a class="btn text" href="#p/${token}">Kundenmappe ansehen →</a></section><section>${p.trades.map(t=>`<article class="care"><h3>${esc(t.label)}</h3><p>${t.revoked?'Zugang beendet · Angaben bleiben erhalten':'Persönlicher Zugang aktiv'}</p><button class="btn light" data-reinvite="${t.id}">${t.revoked?'Erneut einladen':'Link ersetzen'}</button>${!t.revoked?`<button class="btn text" data-owner-revoke="${t.id}">Zugang beenden</button>`:''}</article>`).join('')}</section>`,{customer:true});
   $('#owner-additions').onclick=()=>run($('#owner-additions'),async()=>openOwnerEditor(await api('scan',{token}),token,key));
   $('#owner-invite').onclick=()=>invite('owner_invite',{token,key},()=>owner(token,key));
   $$('[data-reinvite]').forEach(b=>b.onclick=()=>run(b,async()=>{const t=p.trades.find(t=>t.id===b.dataset.reinvite);const r=await api('owner_invite',{token,key,participant_id:t.id,label:t.label});await owner(token,key);share('Einladung für '+t.label,location.origin+'/#trade/'+token+'/'+t.id+'/'+r.invite_key);}));
   $$('[data-owner-revoke]').forEach(b=>b.onclick=()=>run(b,async()=>{await api('owner_revoke',{token,key,participant_id:b.dataset.ownerRevoke});await owner(token,key);}));
 }
 return {site,bindSite,trade,owner,tradeHTML,share};
}
