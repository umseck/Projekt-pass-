import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {attachAIEntry} from '../public/ai-entry.mjs';
test('KI entry stays at top on mobile, including expired sessions, denial and network failures',async()=>{
 const win=new Window({width:390,height:844});const original=globalThis.document;globalThis.document=win.document;
 try{
  for(const status of [200,401,403,503,0]){
   win.document.body.innerHTML='<section id="editor"><h1>Materialien</h1><p>Weitere Felder</p></section>';
   const root=win.document.querySelector('#editor');
   attachAIEntry('example',{root,fetcher:async()=>{if(!status)throw Error('offline');return Response.json({allowed:status===200},{status});}});
   await new Promise(r=>setTimeout(r,0));
   assert.equal(root.firstElementChild.className,'project-capture');assert.equal(root.querySelector('a').getAttribute('href'),'#ai/example');
   const label=root.querySelector('[role=status]').textContent;assert.ok(!label.includes('wird geprüft'));
   if(status===401)assert.match(label,/erneut anmelden/);if(status===403)assert.match(label,/nicht freigeschaltet/);if(status===0)assert.match(label,/Verbindung/);
  }
 }finally{globalThis.document=original;await win.happyDOM.close();}
});
