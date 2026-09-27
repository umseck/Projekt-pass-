import {esc} from './ui.mjs';

export function editorSection(key,title,body){
 return `<details class="editor-section" data-editor-section="${key}"><summary><span><strong>${esc(title)}</strong><small data-editor-summary="${key}"></small></span>${['files','handover'].includes(key)?'<span class="editor-optional">Optional</span>':''}</summary><div class="editor-section-body">${body}</div></details>`;
}

export function bindEditorSections(form){
 const singleOpen=selector=>{
  const sections=[...form.querySelectorAll(selector)];
  for(const section of sections){
   const closeOthers=()=>sections.forEach(other=>{if(other!==section)other.open=false;});
   section.querySelector(':scope > summary').addEventListener('click',()=>{if(!section.open)closeOthers();});
   section.addEventListener('toggle',()=>{if(section.open)closeOthers();});
  }
 };
 singleOpen('[data-editor-section]');singleOpen('details[data-material]');
 // Validation must reveal the relevant field even when its section is closed.
 form.addEventListener('invalid',event=>{
  for(let parent=event.target.parentElement;parent&&parent!==form;parent=parent.parentElement){
   if(parent.tagName==='DETAILS')parent.open=true;
  }
 },true);
}
