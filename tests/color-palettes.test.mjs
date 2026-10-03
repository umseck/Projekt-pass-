import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paletteFor} from '../public/js/features/color-palettes.mjs';

test('surface palettes recognize common names without leaking to other makers, systems or materials',()=>{
 for(const product of ['Quartz R','Quarz R','EPI Quartz-R','Corestone Nature']){
  const palette=paletteFor('surface','EPI',product);
  assert.equal(palette.id,'corestone');
  assert.ok(palette.colors.includes('Concrete (Blend)'));
 }
 assert.ok(paletteFor('surface','.murface','MF Industrial').colors.includes('MF WHITE · B00'));
 assert.equal(paletteFor('surface','Murface','Mono').id,'murface');
 assert.ok(paletteFor('surface','Lamurista','HardRock PRO').colors.includes('München'));
 assert.equal(paletteFor('surface','Lamurista','HardRock').id,'lamurista');
 assert.ok(paletteFor('surface','Art Stucco','ArtStucco (Wand)').colors.includes('Alesio'));
 assert.ok(!paletteFor('surface','ArtStucco','Lavasteinboden').colors.includes('Alesio'));
 assert.ok(paletteFor('surface','ArtStucco','Lavasteinboden').colors.includes('Bari'));
 for(const args of [
  ['surface','EPI',''],['surface','EPI','Superbase'],['surface','Anderer Hersteller','Quartz R'],
  ['surface','Nicht Murface','Oberfläche'],['primer','Murface','Grundierung'],['silicone','EPI','Quartz R'],
  ['surface','Murface','Murmarble'],['surface','Lamurista','Tantum'],['surface','ArtStucco','Unbekannt'],['surface','EPI','Micro'],
 ])assert.equal(paletteFor(...args),null);
});

test('Silcofug E colours are product-specific and include official colour numbers',()=>{
 const palette=paletteFor('silicone','PCI','Silcofug E');
 assert.equal(palette.colors.length,28);assert.equal(new Set(palette.colors).size,28);
 assert.ok(palette.colors.includes('Transparent'));assert.ok(palette.colors.includes('01 · Brillantweiß'));
 assert.ok(palette.colors.includes('16 · Silbergrau'));assert.ok(palette.colors.includes('61 · Schiefergrau'));
 assert.ok(!palette.colors.some(c=>c.startsWith('20'))); // Silcoferm S white is a different product.
 assert.equal(paletteFor('silicone','PCI Augsburg GmbH','PCI Silcofug® E'),palette);
 for(const args of [
  ['silicone','PCI','Silcoferm S'],['silicone','PCI','Silcofug Multicolor'],['silicone','PCI','Silco G'],
  ['silicone','OTTO','Silcofug E'],['grout','PCI','Silcofug E'],['surface','PCI','Silcofug E'],
 ])assert.equal(paletteFor(...args),null);
});

test('native colour selector supports standard and custom colours across product changes',async()=>{
 const {Window}=await import('happy-dom');const {colorField,bindColorOptions,refreshColorOptions}=await import('../public/js/features/color-palettes.mjs');
 const w=new Window(),d=w.document;
 d.body.innerHTML='<section><input id="silicone-manufacturer" value="PCI"><input id="silicone-name" value="Silcofug E">'+colorField('silicone',{manufacturer:'PCI',name:'Silcofug E',color:'Mein Sonderton'})+'</section>';
 const card=d.querySelector('section'),input=d.querySelector('#silicone-color'),select=d.querySelector('[data-color-select]');bindColorOptions(card,'silicone');
 assert.equal(select.value,'__custom__');assert.equal(input.closest('.field').hidden,false);
 select.value='16 · Silbergrau';select.dispatchEvent(new w.Event('change'));assert.equal(input.value,'16 · Silbergrau');assert.equal(input.closest('.field').hidden,true);
 select.value='__custom__';select.dispatchEvent(new w.Event('change'));assert.equal(input.closest('.field').hidden,false);assert.equal(input.value,'16 · Silbergrau');
 d.querySelector('#silicone-name').value='Unbekannt';refreshColorOptions(card,'silicone');assert.equal(d.querySelector('[data-color-selection]').hidden,true);assert.equal(input.closest('.field').hidden,false);assert.equal(input.value,'16 · Silbergrau');
 await w.happyDOM.abort();w.close();
});
