import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {matchingProducts,mergeDocuments,categories} from '../public/catalog.mjs';
const c=JSON.parse(await readFile(new URL('../public/catalog.json',import.meta.url),'utf8'));
test('catalog is deliberately empty until real project products are approved',()=>{
 assert.equal(c.version,1);assert.deepEqual(c.manufacturers,[]);assert.deepEqual(c.products,[]);
 assert.deepEqual(matchingProducts(c,{kind:'silicone'}),[]);
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
