import {bathEditor} from './bath-editor.mjs';
import {newArea,materialBasis,areaBasis,areaIssues} from './bath-model.mjs';
import {mountBathCustomer} from './bath-customer.mjs';
import {esc} from './ui.mjs';
const company={name:'Musterbetrieb · Testdaten',email:'service@example.test',trade:'seamless',standards:{seamless:{surface:{manufacturer:'EPI',name:'Quartz R'},finish:{manufacturer:'EPI',name:'Corestone Sealer'},waterproofing:{manufacturer:'PCI',name:'Seccoral 1K'},silicone:{manufacturer:'PCI',name:'Silcofug E'}},tile:{tile:{manufacturer:'Musterhersteller',name:'Musterfliese'},adhesive:{manufacturer:'Musterhersteller',name:'Musterkleber'},grout:{manufacturer:'Musterhersteller',name:'Musterfuge'},waterproofing:{manufacturer:'PCI',name:'Seccoral 1K'}}}};
let current,session,dashboard={company:structuredClone(company),company_version:1};
const shell=html=>{document.querySelector('#app').innerHTML=`<main class="wrap narrow">${html}</main>`;};
const modal=(title,body)=>{const d=document.querySelector('#modal');d.innerHTML=`<div class="dialog-head"><h2>${esc(title)}</h2><button class="close" aria-label="Schließen">×</button></div>${body}`;d.querySelector('.close').onclick=()=>d.close();if(!d.open)d.showModal();};
const api=async(op,data)=>{
 if(op==='project')return structuredClone(current);
 if(op==='save'){if(data.version!==current.version)throw Error('Versionskonflikt');current={...current,...structuredClone(data),version:current.version+1};return structuredClone(current);}
 if(op==='company_save'){dashboard={company:structuredClone(data.profile),company_version:dashboard.company_version+1};return structuredClone(dashboard);}
 if(op==='handover'){const issues=current.content.areas.flatMap(areaIssues);if(issues.length)throw Error(issues.join(' · '));current.status='handed_over';current.handed_over_at=new Date().toISOString();current.handover_snapshot={company:structuredClone(company),handed_over_at:current.handed_over_at};return structuredClone(current);}
 throw Error('Diese isolierte Vorschau nutzt keine Live-API.');
};
function showCustomer(){session?.dispose();shell(`<div class="customer-dossier"><section class="hero"><p class="eyebrow">Ihr Projektpass · Muster</p><h1>${esc(current.title)}</h1><p>Ihre dokumentierten Materialien, Pflegehinweise und Unterlagen.</p></section><section class="section"><h2>Ihr Fachbetrieb</h2><p>${esc(company.name)}</p><button class="btn light" id="export">Kundenkopie speichern</button></section></div>`);mountBathCustomer(current,{modal});}
async function start(trade){session?.dispose();current={id:'11111111-1111-4111-8111-111111111111',version:1,title:'Musterbad',pass_number:1,status:'draft',company:structuredClone(company),internal:{},content:{trade,...structuredClone(company.standards[trade]),areas:[newArea(trade,company.standards[trade],'Duschwand','walls')]}};session=await bathEditor(current.id,{api,shell,modal,dashboard,go:showCustomer});}
document.querySelector('#demo-seamless').onclick=()=>start('seamless');document.querySelector('#demo-tile').onclick=()=>start('tile');
document.querySelector('#demo-ready').onclick=async()=>{
 await start('seamless');const wall=current.content.areas[0];wall.products.surface.color='Canvas';
 wall.care={text:'Dies ist ein fiktiver Testhinweis zur Prüfung der Bedienung – keine Pflegeempfehlung.',source:'Fiktiver Musterbetrieb · Testquelle',document_date:'28.09.2026',url:'',basis:materialBasis(wall),confirmed:true};wall.confirmation=areaBasis(wall);
 const floor=newArea('seamless',{surface:{manufacturer:'Lamurista',name:'HardRock'},finish:{manufacturer:'Lamurista',name:'GoodLack wb'}},'Badezimmerboden','floor');floor.products.surface.color='Sonderfarbe Test';floor.spares='Musterreserve · beschrifteter Behälter im Abstellraum';floor.confirmation=areaBasis(floor);current.content.areas.push(floor);current.status='handed_over';current.handed_over_at=new Date().toISOString();showCustomer();
};
start('seamless');
