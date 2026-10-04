import {customerCopy} from './bath-customer.mjs';
import {answerRows} from './bath-model.mjs';
import {esc} from './ui.mjs';
// A local message draft only. No service call, tracking or background delivery.
export function inquiryDraft(project,areaId,kind='question',note=''){
 const copy=customerCopy(project,[areaId]),a=copy.areas[0];
 if(!a)throw Error('Bitte eine freigegebene Fläche wählen.');
 const email=String(copy.company.email||'').trim();
 if(!/^[^\s@?&#\r\n]+@[^\s@?&#\r\n]+\.[^\s@?&#\r\n]+$/.test(email))throw Error('Keine verwendbare E-Mail-Adresse hinterlegt. Bitte den Betrieb telefonisch kontaktieren.');
 const subject=`${kind==='maintenance'?'Wartung oder Reparatur':'Frage'}: ${a.name} · ${copy.title}`;
 const body=[`Anfrage zu ${a.name} in ${copy.title}.`,`Übergabestand: ${copy.handed_over_at||'Entwurf – noch nicht veröffentlicht'}`,`Ausführender Betrieb: ${copy.company.name}`,'',note.trim().slice(0,2000),'',...answerRows(a).slice(0,3).flatMap(r=>[r.question,r.answer]),'','Diese Nachricht enthält nur den ausgewählten freigegebenen Bereich.'].join('\n');
 return {email,subject,body};
}
export function inquiryURI(draft,consent=false){if(consent!==true)throw Error('Bitte die Weitergabe bewusst bestätigen.');return `mailto:${encodeURIComponent(draft.email)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;}
export function openInquiry(project,areaId,kind,modal){
 let draft;try{draft=inquiryDraft(project,areaId,kind);}catch(e){modal('Betrieb kontaktieren',`<p>${esc(e.message)}</p>`);return;}
 modal('Anfrage prüfen',`<p>Empfänger: <strong>${esc(draft.email)}</strong></p><label for="bath-inquiry-note">Ihr Anliegen</label><textarea id="bath-inquiry-note" maxlength="2000" rows="3"></textarea><button type="button" class="btn light spaced" id="bath-inquiry-preview">Nachricht prüfen</button><pre id="bath-inquiry-text" class="preline"></pre><label class="bath-consent"><input id="bath-inquiry-consent" type="checkbox"> Ich möchte diese ausgewählten Angaben an den genannten Betrieb weitergeben.</label><button class="btn olive wide" id="bath-inquiry-open">E-Mail-Entwurf öffnen</button><p class="hint">Es wird nichts automatisch versendet. Den Versand bestätigen Sie anschließend in Ihrem E-Mail-Programm.</p><p id="bath-inquiry-error" role="alert"></p>`);
 const el=id=>document.getElementById(id);const preview=()=>{draft=inquiryDraft(project,areaId,kind,el('bath-inquiry-note').value);el('bath-inquiry-text').textContent=draft.subject+'\n\n'+draft.body;};preview();
 el('bath-inquiry-note').oninput=()=>{el('bath-inquiry-consent').checked=false;preview();};el('bath-inquiry-preview').onclick=preview;
 el('bath-inquiry-open').onclick=()=>{try{preview();const uri=inquiryURI(draft,el('bath-inquiry-consent').checked);location.href=uri;}catch(e){el('bath-inquiry-error').textContent=e.message;}};
}
