import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {editorSection,bindEditorSections} from '../public/editor-layout.mjs';

test('compact sections keep entered data and reveal invalid fields without opening unrelated sections',async()=>{
 const win=new Window();
 win.document.body.innerHTML=`<form>${editorSection('project','Projekt & Fläche','<input id="title" name="title" required>')}${editorSection('materials','Materialien','<details data-material="surface"><summary>Oberfläche</summary><input name="surface-color" value="NCS S 1502-Y"></details><details data-material="silicone"><summary>Silikon</summary><input name="silicone-color" value="16 · Silbergrau"></details>')}${editorSection('files','Fotos & Unterlagen','<input name="documents" value="Produktblatt">')}${editorSection('handover','Übergabe & Pflege','<textarea name="care">Eigene Pflegehinweise</textarea>')}</form>`;
 const $=s=>win.document.querySelector(s),form=$('form');bindEditorSections(form);
 try{
  const sections=[...form.querySelectorAll('[data-editor-section]')];assert.equal(sections.length,4);assert.ok(sections.every(s=>!s.open));
  $('[data-editor-section="project"] > summary').click();assert.equal(sections[0].open,true);
  $('#title').value='Bad Klement';
  $('[data-editor-section="materials"] > summary').click();assert.equal(sections[0].open,false);assert.equal(sections[1].open,true);
  $('[data-material="surface"] > summary').click();assert.equal($('[data-material="surface"]').open,true);
  $('[data-material="silicone"] > summary').click();assert.equal($('[data-material="surface"]').open,false);
  assert.equal($('[data-material="silicone"]').open,true);
  $('[data-editor-section="files"] > summary').click();assert.equal(sections[1].open,false);assert.equal(sections[2].open,true);
  const data=Object.fromEntries(new win.FormData(form));
  assert.deepEqual(data,{title:'Bad Klement','surface-color':'NCS S 1502-Y','silicone-color':'16 · Silbergrau',documents:'Produktblatt',care:'Eigene Pflegehinweise'});
  $('#title').value='';assert.equal(form.reportValidity(),false);
  assert.equal(sections[0].open,true);assert.equal(sections[3].open,false);
 }finally{await win.happyDOM.abort();win.close();}
});
