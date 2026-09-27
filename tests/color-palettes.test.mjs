import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paletteFor} from '../public/color-palettes.mjs';

test('surface palettes recognize common names without leaking to other makers, systems or materials',()=>{
 for(const product of ['Quartz R','Quarz R','EPI Quartz-R','Corestone Nature']){
  const palette=paletteFor('surface','EPI',product);
  assert.equal(palette.id,'corestone');
  assert.ok(palette.colors.includes('Concrete (Blend)'));
 }
 assert.ok(paletteFor('surface','.murface','Oberfläche').colors.includes('MF WHITE · B00'));
 for(const args of [
  ['surface','EPI',''],['surface','EPI','Superbase'],['surface','Anderer Hersteller','Quartz R'],
  ['surface','Nicht Murface','Oberfläche'],['primer','Murface','Grundierung'],['silicone','EPI','Quartz R'],
 ])assert.equal(paletteFor(...args),null);
});
