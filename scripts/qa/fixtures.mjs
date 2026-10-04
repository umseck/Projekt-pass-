// Synthetic test data only. No construction evidence or technical care advice.
import {newArea,enableRecords,bathKinds,confirmMaterial,materialBasis,areaBasis,setOwnership} from '../../public/bath-model.mjs';
import {buildPDF} from '../../public/bath-pdf.mjs';
export const actor='11111111-1111-4111-8111-111111111111',foreign='22222222-2222-4222-8222-222222222222';
export const company={name:'TESTBETRIEB – keine echte Baustelle',contact:'Testverantwortliche Person',email:'test@example.test',phone:'+49 000 TEST',website:'https://example.test',trade:'seamless',onboarding_complete:true};
const product=k=>({manufacturer:'FIKTIVER TESTHERSTELLER',name:'TEST-'+k+' – genaue Prüfvariante',documents:[]});
export const testPDF=()=> 'data:application/pdf;base64,'+Buffer.from(buildPDF({title:'TESTDATEI – Individueller Betriebshinweis',company,areas:[],general:{}})).toString('base64');
export function fixture(kind='seamless',photos=[]){
 const descriptors=kind==='seamless'?[['Boden','seamless','floor'],['Duschwand','seamless','walls']]:kind==='tile'?[['Boden','tile','floor'],['Wand','tile','walls'],['Dusche','tile','walls'],['Nische','tile','other']]:[['Boden','tile','floor'],['Duschwand','seamless','walls'],['Nische abweichend','seamless','other']];
 const areas=descriptors.map(([name,trade,position],i)=>{
  const a=enableRecords(newArea(trade,Object.fromEntries(bathKinds[trade].map(k=>[k,product(k)])),name,position));
  a.products[trade==='tile'?'tile':'surface'].color=i%2?'TEST-Oliv':'TEST-Sand';
  if(a.products.grout)a.products.grout.color='TEST-Grau';a.products.silicone.color='TEST-Sand';
  if(trade==='tile'){a.products.tile.name=i%2?'TEST-Fliese B':'TEST-Fliese A';a.products.tile.format='60 × 60 cm';a.spares='TEST: 4 Restfliesen im beschrifteten Karton, Abstellraum.';}
  if(kind==='mixed'&&trade==='seamless'){a.products.surface.color='TEST-Sondermischung · Musterreferenz M-004';a.products.finish.name=i===2?'TEST-Versiegelung Nische, Variante B':'TEST-Versiegelung Wand, Variante A';setOwnership(a,'waterproofing','external');a.products.silicone={manufacturer:'',name:'Variante noch unbekannt'};}
  const role=trade==='seamless'?'finish':'tile';a.products[role].documents=[{id:crypto.randomUUID(),name:'FIKTIVER Betriebshinweis TEST.pdf',type:'Betriebshinweis',source:'Fiktiver Testbetrieb – KEINE Herstellerquelle',document_date:'2026-10-04',data:testPDF(),visibility:'public'}];
  if(i===0)a.products[role].documents.push({name:'Bewusst fehlendes Testmerkblatt',type:'Technisches Merkblatt',source:'TEST – Datei nicht vorhanden',url:'',data:'',visibility:'public'});
  a.care={text:'TESTHINWEIS: Diese Unterlage dient ausschließlich der Prüfung der Software. Keine reale Pflegeempfehlung.',source:'Fiktiver Testbetrieb – Prüfablauf',source_kind:'business',document_date:'2026-10-04',document_id:a.products[role].documents[0].id,confirmed:false};
  a.expected_photos=['before','finished'];return a;
 });
 photos.forEach((photo,i)=>{const a=areas[i%areas.length];a.photos.push(photo);a.photo_notes.push({stage:kind==='mixed'?'finished':i<areas.length?'before':'finished',caption:'FIKTIVES Testfoto '+(i+1)+' – kein Ausführungsnachweis',visibility:'public'});});
 return {trade:kind==='tile'?'tile':'seamless',areas,photos:[],documents:[],care_notes:{},internal_note:'NESTED_PRIVATE_SENTINEL'};
}
export function confirmFixture(c){for(const a of c.areas){for(const k of bathKinds[a.trade]){if(a.products[k]?.manufacturer&&a.records[k].ownership==='own')confirmMaterial(a,k);}a.care.basis=materialBasis(a);a.care.confirmed=true;a.confirmation=areaBasis(a);}return c;}
