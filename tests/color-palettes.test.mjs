import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paletteFor} from '../public/color-palettes.mjs';

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
