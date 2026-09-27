import {esc,field,area} from './ui.mjs';
import {preparationAreas,substrateTypes,preparationTypes,preparationActors,hasPreparationItem} from './preparation-data.mjs';

const emptyItem=()=>({kind:'',by:'',custom:'',company:'',note:''});
const areaKeys=choice=>choice==='Wände & Boden'?['walls','floor']:choice==='Wände'?['walls']:choice==='Boden'?['floor']:choice?['other']:[];
const select=(label,id,key,options,value)=>`<div class="field"><label for="${id}">${label}</label><select id="${id}" data-prep-field="${key}" data-current="${esc(value)}"><option value="">Bitte auswählen</option>${Object.entries(options).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></div>`;

export function createPreparationEditor(root,initial=[],{choice='',customLabel='',onChange=()=>{}}={}){
 const groups=new Map(initial.map(group=>[group.area,structuredClone(group)]));
 let active=[];
 const title=group=>group.area==='other'?(group.label||'Andere Fläche'):preparationAreas[group.area];
 const itemAt=row=>{const group=groups.get(row.dataset.prepArea);return row.dataset.prepStep==='base'?group.substrate:group.steps[Number(row.dataset.prepStep)];};
 function rowHTML(group,item,index){
  const base=index==='base',id=`prep-${group.area}-${index}`,types=base?substrateTypes:preparationTypes;
  return `<div class="preparation-row" data-prep-area="${group.area}" data-prep-step="${index}"><div class="form-grid">${select(base?'Welcher Untergrund?':'Was wurde gemacht?',id+'-kind','kind',types,item.kind)}${select(base?'Untergrund erstellt von':'Ausgeführt von',id+'-by','by',preparationActors,item.by)}</div><div class="preparation-custom" ${item.kind==='other'?'':'hidden'}>${field(base?'Welcher Untergrund?':'Welche Arbeit?',id+'-custom',item.custom,'text','maxlength="200" data-prep-field="custom"')}</div><details class="preparation-details" ${item.company||item.note?'open':''}><summary>${item.by==='other'?'Firma / Details ergänzen':'Details ergänzen'}</summary><div ${item.by==='other'?'':'hidden'}>${field('Firma (optional)',id+'-company',item.company,'text','maxlength="200" data-prep-field="company"')}</div>${area('Kurze Beschreibung (optional)',id+'-note',item.note,'data-prep-field="note"',500)}</details>${!base||hasPreparationItem(item)?`<button class="btn text preparation-remove" type="button" data-prep-remove="${index}" data-prep-area="${group.area}" aria-label="${base?'Untergrund':`Vorbereitung ${Number(index)+1}`} für ${esc(title(group))} entfernen">${base?'Untergrund zurücksetzen':'Arbeit entfernen'}</button>`:''}</div>`;
 }
 function render(){
  const visible=[...active,...[...groups.keys()].filter(key=>!active.includes(key)&&hasGroup(groups.get(key)))];
  root.innerHTML=visible.length?`<p class="hint">Wählen Sie den Untergrund und wer ihn erstellt hat. Ergänzen Sie weitere Arbeiten nur bei Bedarf.</p>${visible.map(key=>{
   const group=groups.get(key),extra=!active.includes(key);
   return `<section class="preparation-group" data-prep-group="${key}"><h3>${esc(title(group))}</h3>${extra?`<div class="preparation-extra"><p class="hint">Bereits dokumentiert; aktuell nicht im Anwendungsbereich ausgewählt.</p><button type="button" class="btn text" data-prep-remove-area="${key}">Bereich entfernen</button></div>`:''}${rowHTML(group,group.substrate,'base')}${group.steps.map((item,i)=>rowHTML(group,item,i)).join('')}<button type="button" class="btn light" data-prep-add="${key}" ${group.steps.length>=20?'disabled':''}>+ Vorbereitung hinzufügen</button></section>`;
  }).join('')}`:'<p class="hint">Wählen Sie zuerst den Anwendungsbereich oben aus.</p>';
  root.querySelectorAll('select[data-current]').forEach(el=>{el.value=el.dataset.current;});
  root.querySelectorAll('[data-prep-field]').forEach(el=>{
   const row=el.closest('[data-prep-step]'),item=itemAt(row),key=el.dataset.prepField;
   const update=()=>{item[key]=el.value;onChange();};
   el.oninput=update;
   if(el.tagName==='SELECT')el.onchange=()=>{update();const id=el.id;render();root.querySelector('#'+id)?.focus();};
  });
  root.querySelectorAll('[data-prep-add]').forEach(button=>button.onclick=()=>{const group=groups.get(button.dataset.prepAdd);if(group.steps.length>=20)return;group.steps.push(emptyItem());onChange();render();root.querySelector(`#prep-${group.area}-${group.steps.length-1}-kind`)?.focus();});
  root.querySelectorAll('[data-prep-remove]').forEach(button=>button.onclick=()=>{const group=groups.get(button.dataset.prepArea);if(button.dataset.prepRemove==='base')group.substrate=emptyItem();else group.steps.splice(Number(button.dataset.prepRemove),1);onChange();render();root.querySelector(`[data-prep-add="${group.area}"]`)?.focus();});
  root.querySelectorAll('[data-prep-remove-area]').forEach(button=>button.onclick=()=>{groups.delete(button.dataset.prepRemoveArea);onChange();render();});
 }
 function hasGroup(group){return hasPreparationItem(group.substrate)||group.steps.some(hasPreparationItem);}
 function setArea(nextChoice,label=''){
  active=areaKeys(nextChoice);
  for(const key of active){if(!groups.has(key))groups.set(key,{area:key,label:'',substrate:emptyItem(),steps:[]});if(key==='other')groups.get(key).label=label;}
  render();
 }
 function setCustomLabel(label){const group=groups.get('other');if(!group||!active.includes('other'))return;group.label=label;const heading=root.querySelector('[data-prep-group="other"] h3');if(heading)heading.textContent=title(group);}
 function read(){
  return [...groups.values()].filter(hasGroup).map(group=>{
   const check=(item,base)=>{
    if(!item.kind)throw Error(`Bitte für ${title(group)} ${base?'den Untergrund':'die Arbeit'} auswählen.`);
    if(item.kind==='other'&&!item.custom.trim())throw Error(`Bitte für ${title(group)} ${base?'den Untergrund':'die Arbeit'} kurz benennen.`);
    if(!item.by)throw Error(`Bitte für ${title(group)} auswählen, wer ${base?'den Untergrund erstellt':'die Arbeit ausgeführt'} hat. Falls nicht bekannt: „Unbekannt“.`);
    return {...item,custom:item.kind==='other'?item.custom.trim():'',company:item.by==='other'?item.company.trim():'',note:item.note.trim()};
   };
   return {area:group.area,label:group.area==='other'?group.label.trim():'',substrate:hasPreparationItem(group.substrate)?check(group.substrate,true):null,steps:group.steps.filter(hasPreparationItem).map(item=>check(item,false))};
  });
 }
 // Empty base rows are present in the form even if only preparation steps were saved.
 for(const group of groups.values()){group.label=group.label||'';group.substrate={...emptyItem(),...group.substrate};group.steps=(group.steps||[]).map(item=>({...emptyItem(),...item}));}
 setArea(choice,customLabel);
 return {read,setArea,setCustomLabel};
}

export function preparationHTML(groups=[],companyName=''){
 const actor=item=>item.by==='own'?(companyName||'Dokumentierender Betrieb'):item.by==='other'?(item.company?`Anderes Gewerk: ${item.company}`:'Anderes Gewerk'):'Unbekannt';
 const itemHTML=(item,base)=>!item?'':`<div class="preparation-fact"><dt>${base?'Untergrund: ':''}${esc(item.kind==='other'?item.custom:(base?substrateTypes:preparationTypes)[item.kind])}</dt><dd>${base?'Erstellt durch':'Ausgeführt durch'}: ${esc(actor(item))}${item.note?`<p class="preline">${esc(item.note)}</p>`:''}</dd></div>`;
 return groups.map(group=>`<section class="preparation-record"><h4>${esc(group.area==='other'?(group.label||'Andere Fläche'):preparationAreas[group.area])}</h4><dl>${itemHTML(group.substrate,true)}${(group.steps||[]).map(item=>itemHTML(item,false)).join('')}</dl></section>`).join('');
}
