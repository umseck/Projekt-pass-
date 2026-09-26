import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {matchingProducts,mergeDocuments,categories} from '../public/catalog.mjs';
const c=JSON.parse(await readFile(new URL('../public/catalog.json',import.meta.url),'utf8'));
test('catalog provenance: unique products, official source hosts, honest document verification',()=>{
 assert.equal(c.manufacturers.length,6);assert.equal(c.products.length,90);
 assert.equal(new Set(c.products.map(p=>p.id)).size,c.products.length);
 const hosts=new Set(['www.pci-augsburg.eu','doc.pci-augsburg.com','www.otto-chemie.de','lamurista.de','murface.com','murface.sharepoint.com','murface.cdn.prismic.io','artstucco.de','epifloors.com','zakelijk.epifloors.com','customerportal.epigroup.nl']);
 for(const p of c.products){
  assert.ok(c.manufacturers.some(m=>m.id===p.manufacturer_id));assert.ok(p.kinds.every(k=>categories[k]));
  for(const value of [p.source_url,...p.documents.map(d=>d.url)]){const u=new URL(value);assert.equal(u.protocol,'https:');assert.ok(hosts.has(u.hostname),value);assert.equal(u.username,'');}
  for(const d of p.documents){assert.ok(['pdf','page','source_link'].includes(d.verification));if(d.verification==='pdf')assert.match(d.sha256,/^[a-f0-9]{64}$/);}
 }
 const seal=c.products.find(p=>p.id==='lamurista-seal');assert.deepEqual(seal.kinds,['primer']);assert.ok(!seal.kinds.includes('waterproofing'));
 assert.ok(c.products.filter(p=>p.manufacturer_id==='murface').every(p=>p.documents.every(d=>d.verification==='source_link')));
});
test('catalog filters respect material role and manufacturer; document merge is bounded and keeps manual links',()=>{
 assert.equal(matchingProducts(c,{manufacturer:'lamurista',query:'hardrock',kind:'surface'}).length,2);
 assert.equal(matchingProducts(c,{manufacturer:'murface',kind:'waterproofing'}).length,3);
 assert.equal(matchingProducts(c,{manufacturer:'epi',kind:'primer'}).length,0);
 assert.equal(matchingProducts(c,{manufacturer:'pci',kind:'silicone'}).length,3);assert.equal(matchingProducts(c,{manufacturer:'otto',kind:'silicone'}).length,5);
 assert.equal(matchingProducts(c,{manufacturer:'pci',kind:'waterproofing'})[0].name,'Seccoral 1K');
 const a={name:'Eigene Unterlage',type:'Unterlage',url:'https://example.test/own.pdf'};
 const b={name:'Produktblatt',type:'Technisches Merkblatt',url:'https://example.test/product.pdf'};
 const before=[a];assert.deepEqual(mergeDocuments(before,[a,b,b]),[a,b]);assert.deepEqual(before,[a]);
 assert.deepEqual(mergeDocuments([], [{url:'javascript:alert(1)'}]),[]);
 assert.throws(()=>mergeDocuments(Array.from({length:20},(_,i)=>({...a,url:'https://example.test/'+i})),[b]),/20 Unterlagen/);
});
