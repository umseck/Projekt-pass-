import {esc} from './ui.mjs';
const steps=['project','materials','files','handover'];
const labels=['Projekt & Fläche','Materialien','Fotos & Unterlagen','Übergabe & Pflege'];
const guidance=['Projekt benennen und bearbeitete Fläche auswählen.','Vorausgefüllte Produkte prüfen und den Farbton ergänzen.','Fotos ergänzen. Diesen Schritt können Sie auch überspringen.','Nutzungszeitpunkt und Pflege prüfen. Danach die Übergabe ansehen.'];
export function editorSection(key,title,body){
 const i=steps.indexOf(key);
 return `<details class="editor-section" data-editor-section="${key}"><summary><span class="editor-step-number" aria-hidden="true">${i+1}</span><span><strong>${esc(title)}</strong><small data-editor-summary="${key}"></small></span>${key==='files'?'<span class="editor-optional">Optional</span>':''}</summary><div class="editor-section-body"><p class="editor-guidance">${guidance[i]}</p>${body}</div></details>`;
}
export function bindEditorSections(form){
 const sections=[...form.querySelectorAll('[data-editor-section]')],next=form.querySelector('#editor-next'),preview=form.querySelector('#preview'),progress=form.querySelector('#editor-progress');
 const materials=[...form.querySelectorAll('details[data-material]')];
 let active=0;
 const nextMaterial=()=>{const i=materials.findIndex(m=>m.open);return materials[i+1]||null;};
 function controls(){if(progress)progress.textContent=`Schritt ${active+1} von 4 · ${labels[active]}`;if(next){next.hidden=active===3;next.textContent='Weiter: '+(active===1&&nextMaterial()?(nextMaterial().querySelector(':scope > summary strong')||nextMaterial().querySelector(':scope > summary')).textContent:labels[active+1])+' →';}if(preview)preview.hidden=active!==3;}
 function activate(section,move=false){
  active=sections.indexOf(section);sections.forEach(other=>other.open=other===section);
  if(active===1&&!section.querySelector('details[data-material][open]')){const first=section.querySelector('details[data-material]');if(first)first.open=true;}
  controls();if(move){const summary=section.querySelector(':scope > summary');summary.focus();section.scrollIntoView?.({block:'start',behavior:'auto'});}
 }
 for(const section of sections){section.querySelector(':scope > summary').addEventListener('click',event=>{event.preventDefault();activate(section,true);});section.addEventListener('toggle',()=>{if(section.open&&sections.indexOf(section)!==active)activate(section);});}
 if(next)next.onclick=()=>{const invalid=[...sections[active].querySelectorAll('input,select,textarea')].find(el=>!el.checkValidity());if(invalid){invalid.reportValidity();return;}if(active===1&&nextMaterial()){nextMaterial().querySelector(':scope > summary').click();return;}if(active<3)activate(sections[active+1],true);};
 for(const section of materials){const closeOthers=()=>materials.forEach(other=>{if(other!==section)other.open=false;});section.querySelector(':scope > summary').addEventListener('click',event=>{event.preventDefault();const opening=!section.open;if(opening)closeOthers();section.open=opening;controls();if(opening){section.querySelector(':scope > summary').focus();section.scrollIntoView?.({block:'start',behavior:'auto'});}});section.addEventListener('toggle',()=>{if(section.open)closeOthers();controls();});}
 form.addEventListener('invalid',event=>{const section=event.target.closest('[data-editor-section]');if(section)activate(section);for(let parent=event.target.parentElement;parent&&parent!==form;parent=parent.parentElement){if(parent.tagName==='DETAILS')parent.open=true;}},true);
 if(sections.length)activate(sections[0]);
}
