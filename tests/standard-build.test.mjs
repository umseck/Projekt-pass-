import {test} from 'node:test';
import assert from 'node:assert/strict';
import {missingStandardProducts} from '../public/standard-build.mjs';
import {trades} from '../public/trades.mjs';
const standard={surface:{manufacturer:'EPI',name:'Quartz R',color:'Never copy',batch:'Never copy'},finish:{manufacturer:'EPI',name:'Corestone Sealer'},silicone:{manufacturer:'PCI',name:'Silcofug E'}};
test('standard fills empty slots, strips project details and preserves different systems and overrides',()=>{
 const added=Object.fromEntries(missingStandardProducts({},standard,trades.seamless));
 assert.equal(added.surface.name,'Quartz R');assert.equal(added.surface.color,'');assert.equal(added.surface.batch,'');assert.equal(added.finish.name,'Corestone Sealer');
 const custom={surface:{manufacturer:'Other',name:'My surface',color:'My colour'}};
 assert.deepEqual(missingStandardProducts(custom,standard,trades.seamless).map(([k])=>k),['silicone']);
 assert.equal(custom.surface.color,'My colour');
 assert.deepEqual(missingStandardProducts({...standard,finish:{},finish_selection:'manual'},standard,trades.seamless),[]);
 assert.deepEqual(missingStandardProducts({},standard,trades.tile).map(([k])=>k),['silicone']);
});
