import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

test('downloadable standalone file runs the actual MVP with its embedded catalog and no external assets',async()=>{
 const html=await readFile(new URL('../public/Projektpass-MVP-Test.html',import.meta.url),'utf8');
 assert.ok(!/<script[^>]+src=|<link[^>]+stylesheet/.test(html));
 const code=html.match(/<script>([\s\S]*)<\/script>/)?.[1];assert.ok(code);
 const win=new Window({url:'file:///Projektpass-MVP-Test.html',settings:{enableJavaScriptEvaluation:true}});
 win.structuredClone=structuredClone;
 win.document.write(html.replace(/<script>[\s\S]*<\/script>/,''));
 const $=s=>win.document.querySelector(s),wait=async predicate=>{for(let i=0;i<160;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error('Standalone UI timeout: '+win.document.body.textContent);};
 try{
  win.eval(code);await wait(()=>$('#bath-title'));
  const catalog=await (await win.fetch('/catalog.json')).json();assert.equal(catalog.version,1);assert.ok(catalog.products.length>0);
  await assert.rejects(win.fetch('https://example.test/api/customer_add'),/keine Live-Verbindung/);
  $('#demo-ready').click();await wait(()=>$('#bath-dashboard'));$('[data-bath-step="3"]').click();await wait(()=>$('#bath-release-confirm'));
  for(const checkbox of win.document.querySelectorAll('[data-confirm-area]')){checkbox.checked=true;checkbox.dispatchEvent(new win.Event('change'));}
  const gaps=$('#bath-gaps-confirm');if(gaps){gaps.checked=true;gaps.dispatchEvent(new win.Event('change'));}
  $('#bath-release-confirm').checked=true;$('#bath-release-confirm').dispatchEvent(new win.Event('change'));$('#bath-next').click();await wait(()=>$('#customer-add'));
  assert.equal($('#customer-current-qr'),null,'physical QR links are not offered from a local fictional file');
  $('#customer-add').click();await wait(()=>$('#event-description'));$('#event-description').value='Fiktiver Offline-Wartungsnachweis';$('#customer-event-form').dispatchEvent(new win.Event('submit',{cancelable:true,bubbles:true}));
  await wait(()=>$('#customer-events')?.textContent.includes('Fiktiver Offline-Wartungsnachweis'));assert.ok($('.customer-original-stamp'));
  $('#export').click();await wait(()=>$('#export-zip'));assert.ok($('#export-pdf'));assert.ok($('#export-html'));
  $('#modal').close();$('#trial-mode').value='public';$('#trial-mode').dispatchEvent(new win.Event('change'));await wait(()=>$('#customer-add')===null);
  assert.match($('#customer-events').textContent,/nicht sichtbar/);assert.ok(!$('#customer-events').textContent.includes('Fiktiver Offline-Wartungsnachweis'));
 }finally{win.happyDOM.abort();}
});
