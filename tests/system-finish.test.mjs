import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultFinish,finishSelection} from '../public/system-finish.mjs';
import {content,standard} from '../server/validation.mjs';
const epi={manufacturer:'EPI',name:'Quartz R'},mono={manufacturer:'Murface',name:'MF Mono'};
test('coatings are assigned only to documented systems, including known spelling variants',()=>{
 assert.equal(defaultFinish(epi).name,'Corestone Sealer');
 assert.equal(defaultFinish({manufacturer:'.murface',name:'MF Industrial'}).name,'MF NanoTop');
 assert.equal(defaultFinish(mono).sheen,'Ultra matt');
 for(const name of ['HardRock','HardRock PRO'])assert.equal(defaultFinish({manufacturer:'Lamurista',name}).name,'GoodLack wb');
 for(const surface of [{manufacturer:'EPI',name:'Micro'},{manufacturer:'Murface',name:'MurStone'},{manufacturer:'ArtStucco',name:'ArtStucco (Wand)'},{manufacturer:'ArtStucco',name:'Lavasteinboden'},{manufacturer:'Other',name:'Quartz R'}])assert.equal(defaultFinish(surface),null);
});
test('reopening retains custom or explicitly cleared coatings; switching systems replaces stale data',()=>{
 const custom={manufacturer:'Own',name:'Custom',batch:'old-project-batch',sheen:'Gloss'};
 assert.deepEqual(finishSelection(epi,epi,custom,'manual'),{product:custom,mode:'manual',replace:false});
 assert.equal(finishSelection(epi,epi,{},'manual').replace,false);
 assert.equal(finishSelection(epi,epi,custom).mode,'manual');
 const picked=finishSelection(mono,epi,custom,'manual');
 assert.equal(picked.product.name,'MF NanoTop');assert.equal(picked.product.batch,undefined);assert.equal(picked.mode,'system');
 assert.deepEqual(finishSelection({manufacturer:'Unknown',name:'Other'},mono,picked.product,'system'),{product:{},mode:'',replace:true});
 assert.equal(finishSelection(epi,epi,{}).product.name,'Corestone Sealer');
 assert.equal(finishSelection({}, {}, {}).replace,false);
});
test('override intent survives validation; old primers remain project data but leave new standards',()=>{
 const saved=content({trade:'seamless',surface:epi,finish_selection:'manual',finish:{},primer:{name:'Previously documented'}});
 assert.equal(saved.finish_selection,'manual');assert.equal(saved.finish.name,'');assert.equal(saved.primer.name,'Previously documented');
 assert.equal(standard(saved,'seamless').primer,undefined);
 assert.throws(()=>content({...saved,finish_selection:'unknown'}));
});
