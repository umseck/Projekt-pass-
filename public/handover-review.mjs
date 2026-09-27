import {esc,hasProduct,date} from './ui.mjs';
import {names} from './trades.mjs';
export function handoverReview(project,trade){
 const c=project.content||{};
 return `<section class="handover-review no-print" id="handover-review"><h1>Angaben kurz prüfen</h1><p><strong>${esc(project.title)}</strong>${c.application_area?' · '+esc(c.application_area):''}</p><dl>${trade.products.map(kind=>{const p=c[kind]||{};return `<div><dt>${esc(names[kind])}</dt><dd>${hasProduct(p)?esc([p.manufacturer,p.name,kind==='waterproofing'?'':p.color,p.sheen].filter(Boolean).join(' · ')):'Keine Angabe'}</dd></div>`;}).join('')}</dl><p class="hint">${(c.photos||[]).length} Fotos vom Bad · ${(c.waterproofing_details?.photos||[]).length} Abdichtungsfotos · ${(c.documents||[]).length} Unterlagen</p><p class="hint">${c.usage_available_at?esc(trade.usage)+': '+esc(date(c.usage_available_at,true)):'Nutzungszeitpunkt: keine Angabe'}</p><p>Stimmen die Angaben mit Ihrer Ausführung überein? Auch vorausgefüllte Produkte und Farbtöne prüfen.</p></section>`;
}
