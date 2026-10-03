import qrcode from '../vendor/qrcode.mjs';
import {esc,num,labelPhoto} from '../core/ui.mjs';
export function handoverCode(project,origin){
 const url=new URL('/#p/'+project.token,origin).href;
 if(!/^[a-f0-9]{64}$/.test(project.token)||!/^https?:/.test(url))throw Error('Kein gültiger Kundenlink.');
 const qr=qrcode(0,'M');qr.addData(url);qr.make();
 const svg=qr.createSvgTag({cellSize:4,margin:16,scalable:true,alt:'QR-Code zum Kundenpass'});
 return {url,svg};
}
export function handoverCard(project,company,origin){
 const {svg}=handoverCode(project,origin);
 return `<article class="takeaway-card"><header><span class="eyebrow">Ihr digitaler Projektpass fürs Bad</span>${labelPhoto(company.logo)?`<img class="takeaway-logo" src="${company.logo}" alt="${esc(company.name)}">`:''}</header><h2>Alles zu Ihrem neuen Bad.<br>Mit einem Scan.</h2><p class="takeaway-project">${esc(project.title)} <span>Pass ${num(project.pass_number)}</span></p><div class="takeaway-scan"><div class="takeaway-qr">${svg}</div><div><strong>Kamera öffnen & QR-Code scannen</strong><p>Materialien, hinterlegte Pflegehinweise und Unterlagen direkt auf Ihrem Smartphone.</p><p class="hint">Keine App. Keine Anmeldung zum Lesen.</p></div></div><p class="takeaway-keep">Bewahren Sie Ihren Projektpass für spätere Fragen und Unterlagen auf.</p><footer><strong>${esc(company.name||'Ihr Fachbetrieb')}</strong>${company.phone?`<span>${esc(company.phone)}</span>`:''}${company.email?`<span>${esc(company.email)}</span>`:''}<small>PROJEKTPASS · Gut übergeben. Wiedergefunden.</small></footer></article>`;
}
export function openHandoverCard(project,company,{modal,origin=location.origin}={}){
 const html=handoverCard(project,company,origin);
 modal('Ihre Übergabekarte',`${html}<button type="button" class="btn olive wide spaced" id="print-handover-card">Drucken / als PDF speichern</button><button type="button" class="btn light wide spaced" id="download-handover-qr">QR-Code für den physischen Pass herunterladen</button><p class="hint">Format A5. Vor der ersten Ausgabe den QR-Code mit einem zweiten Smartphone prüfen. Nur den Kundenlink weitergeben.</p>`);
 document.querySelector('#download-handover-qr').onclick=()=>{const {svg}=handoverCode(project,origin),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='Projektpass-'+num(project.pass_number)+'-QR.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);};
 document.querySelector('#print-handover-card').onclick=()=>{
  document.querySelector('#handover-print')?.remove();
  const sheet=document.createElement('section');sheet.id='handover-print';sheet.innerHTML=html;document.body.append(sheet);document.body.classList.add('printing-handover-card');
  const cleanup=()=>{sheet.remove();document.body.classList.remove('printing-handover-card');};
  window.addEventListener('afterprint',cleanup,{once:true});
  try{window.print();}catch(e){cleanup();throw e;}
 };
}
