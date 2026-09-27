import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAutosave} from '../public/autosave.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('autosave serializes slow writes and only confirms the newest value',async()=>{
 let value='old',version=1,active=0;const writes=[],states=[],gate=deferred();
 const saver=createAutosave({delay:10000,read:()=>({value}),write:async data=>{assert.equal(active++,0);writes.push([version,data.value]);if(writes.length===1)await gate.promise;version++;active--;},onState:s=>states.push(s)});
 try{
  value='first';saver.changed();const first=saver.flush();
  value='latest';saver.changed();const second=saver.flush();
  assert.equal(states.at(-1),'pending');assert.equal(writes.length,1);
  gate.resolve();await Promise.all([first,second]);
  assert.deepEqual(writes,[[1,'first'],[2,'latest']]);assert.equal(states.at(-1),'saved');
  await saver.flush();assert.equal(writes.length,2);
 }finally{saver.dispose();}
});
test('network errors retain edits for retry; conflicts stop retries instead of overwriting',async()=>{
 let value='old',failure=true,calls=0;const states=[];
 const saver=createAutosave({delay:10000,read:()=>({value}),write:async()=>{calls++;if(failure)throw Error('Offline');},onState:s=>states.push(s)});
 value='edit';saver.changed();await assert.rejects(saver.flush(),/Offline/);assert.equal(states.at(-1),'error');
 failure=false;await saver.flush();assert.equal(calls,2);assert.equal(states.at(-1),'saved');saver.dispose();
 let conflictCalls=0;const conflict=createAutosave({read:()=>({value}),write:async()=>{conflictCalls++;throw Object.assign(Error('Version conflict'),{status:409});}});
 value='another edit';await assert.rejects(conflict.flush(),/Version conflict/);value='newer edit';conflict.changed();await assert.rejects(conflict.flush(),/Version conflict/);assert.equal(conflictCalls,1);conflict.dispose();
});
test('pending photo processing and invalid data do not write; disposing cancels a queued save',async()=>{
 let value='old',ready=false,invalid=false,calls=0;
 const saver=createAutosave({delay:5,read:()=>{if(invalid)throw Error('Incomplete');return {value};},ready:()=>ready,write:async()=>calls++});
 value='edit';await assert.rejects(saver.flush(),/Fotos/);assert.equal(calls,0);
 ready=true;invalid=true;await assert.rejects(saver.flush(),/Incomplete/);assert.equal(calls,0);
 invalid=false;saver.changed();saver.dispose();await new Promise(r=>setTimeout(r,15));assert.equal(calls,0);
});
