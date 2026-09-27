import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {editorSection,bindEditorSections} from '../public/editor-layout.mjs';

test('compact sections keep entered data and reveal invalid fields without opening unrelated sections',async()=>{
 const win=new Window();
 win.document.body.innerHTML=`<form>${editorSection('project','Projekt & Fläche','<input id="title" name="title" required>')}${editorSection('materials','Materialien','<details data-material="surface"><summary>Oberfläche</summary><input name="surface-color" value="NCS S 1502-Y"></details><details data-material="silicone"><summary>Silikon</summary><input name="silicone-color" value="16 · Silbergrau"></details>')}${editorSection('files','Fotos & Unterlagen','<input name="documents" value="Produktblatt">')}${editorSection('handover','Übergabe & Pflege','<textarea name="care">Eigene Pflegehinweise</textarea>')}<button type="button" id="editor-next"></button><button type="button" id="preview"></button><span id="editor-progress"></span></form>`;
 const $=s=>win.document.querySelector(s),form=$('form');bindEditorSections(form);
 try{
  const sections=[...form.querySelectorAll('[data-editor-section]')];let scrolled=null;for(const section of sections)section.scrollIntoView=()=>scrolled=section;assert.equal(sections.length,4);assert.equal(sections[0].open,true);assert.ok(sections.slice(1).every(s=>!s.open));
  $('[data-editor-section="project"] > summary').click();assert.equal(sections[0].open,true);
  $('#title').value='Bad Klement';
  $('#editor-next').click();assert.equal(sections[0].open,false);assert.equal(sections[1].open,true);assert.equal(scrolled,sections[1]);
  assert.equal($('[data-material="surface"]').open,true);
  assert.equal($('[data-editor-go="materials"]').getAttribute('aria-current'),'step');
  $('#editor-back').click();assert.equal(sections[0].open,true);assert.equal($('#editor-back').hidden,true);
  $('[data-editor-go="materials"]').click();assert.equal(sections[1].open,true);

  $('[data-material="silicone"] > summary').click();assert.equal($('[data-material="surface"]').open,false);
  assert.equal($('[data-material="silicone"]').open,true);
  $('#editor-back').click();assert.equal($('[data-material="surface"]').open,true);
  $('[data-editor-go="files"]').click();assert.equal(sections[1].open,false);assert.equal(sections[2].open,true);
  $('#editor-next').click();assert.equal(sections[3].open,true);assert.equal($('#preview').hidden,false);assert.equal($('#editor-next').hidden,true);
  const data=Object.fromEntries(new win.FormData(form));
  assert.deepEqual(data,{title:'Bad Klement','surface-color':'NCS S 1502-Y','silicone-color':'16 · Silbergrau',documents:'Produktblatt',care:'Eigene Pflegehinweise'});
  $('#title').value='';assert.equal(form.reportValidity(),false);
  assert.equal(sections[0].open,true);assert.equal(sections[3].open,false);
 }finally{await win.happyDOM.abort();win.close();}
});
