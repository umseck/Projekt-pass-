import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {matchingProducts,mergeDocuments,loadCatalog,setCompanyCatalog} from '../public/catalog.mjs';
import {paletteFor} from '../public/color-palettes.mjs';
const c=JSON.parse(await readFile(new URL('../public/catalog.json',import.meta.url),'utf8'));
test('curated pilot systems have matching palettes; Murface stays limited to Mono and Industrial',()=>{
 assert.equal(c.version,1);
 assert.deepEqual(c.products.filter(p=>p.manufacturer_id==='murface').map(p=>p.name).sort(),['MF Industrial','MF Mono']);
 for(const p of c.products){
  const m=c.manufacturers.find(m=>m.id===p.manufacturer_id);assert.ok(m);
  assert.ok(paletteFor(p.kinds[0],m.name,p.name),m.name+' '+p.name);
  assert.ok(p.source_url.startsWith('https://'));assert.ok(Array.isArray(p.documents));
 }
 assert.deepEqual(matchingProducts(c,{kind:'silicone'}).map(p=>p.name),['Silcofug E']);
 assert.ok(!matchingProducts(c,{kind:'grout'}).some(p=>p.name==='Silcofug E'));
});
test('preferred makers filter without hiding other makers or mixing private business products',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify(c));
 try{
  setCompanyCatalog({preferred_manufacturers:['EPI'],favorites:{surface:[{manufacturer:'EPI',name:'Eigene Variante',documents:[]},{manufacturer:'EPI',name:'Quartz R',documents:[{name:'Geprüftes eigenes Merkblatt',type:'Unterlage',url:'https://example.test/own-quartz.pdf'}]}]}});
  const first=await loadCatalog();assert.equal(first.manufacturers.filter(m=>m.name==='EPI').length,1);
  assert.ok(matchingProducts(first,{manufacturer:'__preferred'}).every(p=>p.manufacturer_id==='epi'));
  assert.ok(matchingProducts(first,{manufacturer:'murface',kind:'surface'}).length===2);
  assert.ok(matchingProducts(first,{manufacturer:'__preferred'}).some(p=>p.name==='Eigene Variante'));
  assert.equal(first.products.filter(p=>p.name==='Quartz R').length,1);
  assert.equal(first.products.find(p=>p.name==='Quartz R').documents[0].url,'https://example.test/own-quartz.pdf');
  setCompanyCatalog({preferred_manufacturers:['Murface']});const second=await loadCatalog();
  assert.ok(!second.products.some(p=>p.name==='Eigene Variante'));
  assert.equal(second.products.find(p=>p.name==='Quartz R').documents[0].url,'https://epifloors.com/de/unsere-boden/quartz-r/');
  assert.deepEqual(matchingProducts(second,{manufacturer:'__preferred',kind:'surface'}).map(p=>p.name).sort(),['MF Industrial','MF Mono']);
 }finally{globalThis.fetch=original;setCompanyCatalog(null);}
});
test('catalog filters respect material role and manufacturer; document merge is bounded and keeps manual links',()=>{
 const fixture={manufacturers:[{id:'test',name:'Testanbieter'}],products:[{id:'a',manufacturer_id:'test',name:'Test Silikon',kinds:['silicone']},{id:'b',manufacturer_id:'test',name:'Test Oberfläche',kinds:['surface']}]};
 assert.equal(matchingProducts(fixture,{manufacturer:'test',kind:'silicone'}).length,1);
 assert.equal(matchingProducts(fixture,{query:'oberfläche'}).length,1);
 assert.equal(matchingProducts(fixture,{manufacturer:'other'}).length,0);
 const a={name:'Eigene Unterlage',type:'Unterlage',url:'https://example.test/own.pdf'};
 const b={name:'Produktblatt',type:'Technisches Merkblatt',url:'https://example.test/product.pdf'};
 const before=[a];assert.deepEqual(mergeDocuments(before,[a,b,b]),[a,b]);assert.deepEqual(before,[a]);
 assert.deepEqual(mergeDocuments([], [{url:'javascript:alert(1)'}]),[]);
 assert.throws(()=>mergeDocuments(Array.from({length:20},(_,i)=>({...a,url:'https://example.test/'+i})),[b]),/20 Unterlagen/);
});
test('HardRock documents match the variant and survive private catalog overrides',async()=>{
 const generic=c.products.find(p=>p.id==='lamurista-hardrock');
 const pro=c.products.find(p=>p.id==='lamurista-hardrock-pro');
 assert.ok(generic.documents.some(d=>d.type==='Pflegeanleitung'));
 assert.ok(!generic.documents.some(d=>d.url.includes('HardrockPRO_TM')));
 assert.ok(pro.documents.some(d=>d.type==='Technisches Merkblatt'&&d.url.endsWith('Lamurista_HardrockPRO_TM.pdf')));
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify(c));
 try{
  setCompanyCatalog({favorites:{surface:[{manufacturer:'Lamurista',name:'HardRock PRO',documents:[]}]}});
  const privateCatalog=await loadCatalog(),p=privateCatalog.products.find(p=>p.id==='own-surface-0');
  assert.deepEqual(p.documents,pro.documents);
  const {productDocuments}=await import('../public/catalog.mjs');
  const docs=await productDocuments('surface',{manufacturer:'Lamurista',name:'HardRock PRO'});
  assert.ok(docs.some(d=>d.type==='Pflegeanleitung'));
  assert.ok(docs.some(d=>d.type==='Technisches Merkblatt'));
  assert.deepEqual(await productDocuments('surface',{manufacturer:'Lamurista',name:'Unbekannte Variante'}),[]);
 }finally{globalThis.fetch=original;setCompanyCatalog(null);}
});
