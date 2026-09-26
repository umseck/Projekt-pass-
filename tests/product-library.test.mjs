import {test} from 'node:test';
import assert from 'node:assert/strict';
import {upsertProduct} from '../public/product-library.mjs';
import {loadCatalog,setCompanyCatalog} from '../public/catalog.mjs';
import {company} from '../server/validation.mjs';
test('real project products are reusable, deduplicated and private to the current company',async()=>{
 const item={manufacturer:'Eigenhersteller',name:'System',article_number:'A1',color:'Beige',batch:'Charge1',label_photo:'photo',documents:[{name:'Datenblatt',type:'Produktunterlage',url:'https://example.test/a.pdf'}]};
 const initial={};const a=upsertProduct(initial,'surface',item);assert.deepEqual(initial,{});assert.equal(a.surface[0].color,'');assert.equal(a.surface[0].label_photo,'');
 const b=upsertProduct(a,'surface',{...item,name:'system',documents:[]});assert.equal(b.surface.length,1);assert.equal(b.surface[0].documents.length,0);assert.equal(a.surface[0].documents.length,1);
 const validated=company({name:'Betrieb',favorites:a});assert.equal(validated.favorites.surface[0].documents.length,1);
 assert.throws(()=>company({name:'Betrieb',favorites:{surface:[{...item,label_photo:'',documents:[{url:'javascript:alert(1)'}]}]}}));
 globalThis.fetch=async()=>Response.json({version:1,manufacturers:[],products:[]});setCompanyCatalog(validated);let c=await loadCatalog();assert.equal(c.products.length,1);assert.equal(c.products[0].documents[0].verification,'business');
 setCompanyCatalog({name:'Anderer Betrieb',favorites:{}});c=await loadCatalog();assert.equal(c.products.length,0);assert.equal(c.manufacturers.length,0);
});
