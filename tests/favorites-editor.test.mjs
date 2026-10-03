import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createFavoritesEditor} from '../public/js/features/favorites-editor.mjs';
test('private products preserve metadata, protect drafts and support add/edit/remove/undo',()=>{
 const w=new Window();w.document.body.innerHTML='<details><div id="root"></div></details><dialog id="modal"></dialog>';globalThis.document=w.document;
 const root=w.document.querySelector('#root'),$=s=>root.querySelector(s),click=s=>$(s).click();let picker;
 const original={surface:[{manufacturer:'EPI',name:'Quartz R',system_type:'Fugenlos',label_photo:'photo',documents:[{name:'Datenblatt',type:'technical',url:'https://example.com/doc.pdf'}]}],primer:[{manufacturer:'Old',name:'Retained'}]};
 const editor=createFavoritesEditor(root,original,{modal:()=>{},openCatalogPicker:(kind,options)=>{picker=options;}});editor.setTrade('seamless');assert.deepEqual(editor.read(),original);
 click('[data-favorite-edit="surface:0"]');$('#favorite-name').value='Quartz R neu';assert.equal(editor.setTrade('tile'),false);assert.throws(()=>editor.read(),/übernehmen/);click('[data-favorite-new="silicone"]');assert.equal($('#favorite-name').value,'Quartz R neu');click('[data-favorite-apply]');
 assert.deepEqual(editor.read().surface[0].documents,original.surface[0].documents);assert.equal(editor.read().surface[0].label_photo,'photo');assert.equal(original.surface[0].name,'Quartz R');
 click('[data-favorite-delete="surface:0"]');assert.equal(editor.read().surface.length,0);click('[data-favorite-undo]');assert.equal(editor.read().surface[0].name,'Quartz R neu');
 click('[data-favorite-new="surface"]');$('#favorite-maker').value='EPI';$('#favorite-name').value='Quartz R neu';click('[data-favorite-apply]');assert.match($('[data-favorite-error]').textContent,/bereits/);click('[data-favorite-cancel]');assert.equal(editor.read().surface.length,1);
 click('[data-favorite-new="silicone"]');$('#favorite-maker').value='PCI';$('#favorite-name').value='<b>Produkt</b>';click('[data-favorite-apply]');assert.equal(root.querySelector('b'),null);assert.equal(editor.read().silicone.length,1);
 click('[data-favorite-catalog="waterproofing"]');picker.onPick({name:'Seccoral',documents:[{name:'PDF',type:'technical',url:'https://example.com/a.pdf'},{name:'Page',verification:'source_link',url:'https://example.com'}]},{name:'PCI'},true);assert.equal(editor.read().waterproofing[0].documents.length,1);
 editor.setTrade('tile');assert.deepEqual(editor.read().primer,original.primer);editor.setTrade('seamless');assert.equal(editor.read().silicone.length,1);w.happyDOM.abort();delete globalThis.document;
});
