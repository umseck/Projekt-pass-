import {esc,labelPhoto} from '../core/ui.mjs';
import {waterClasses,waterproofingTypes,projectPhotoLimit} from '../shared/waterproofing-data.mjs';

const select=(id,label,value,options)=>`<div class="field"><label for="${id}">${label}</label><select id="${id}" name="${id}"><option value="" ${value?'':'selected'}>Keine Angabe</option>${Object.entries(options).map(([key,name])=>`<option value="${key}" ${value===key?'selected':''}>${esc(name)}</option>`).join('')}</select></div>`;
export function waterproofingFields(details={}){
 return `<details class="spaced"><summary>Klasse & Ausführung (optional)</summary><div class="form-grid">${select('waterproofing-water-class','Wassereinwirkungsklasse',details.water_class,Object.fromEntries(waterClasses.map(k=>[k,k])))}${select('waterproofing-type','Art der Abdichtung',details.type,waterproofingTypes)}</div></details>`;
}
export function waterproofingPhotoFields(){
 return `<details class="spaced" id="waterproofing-documentation"><summary>Fotos der Abdichtung (empfohlen)</summary><p class="hint">Optional – am besten vor dem Überdecken aufnehmen. Die Fotos sind nach der Übergabe für den Kunden sichtbar.</p><div class="field"><label for="waterproofing-photo-upload">Fotos hinzufügen</label><input id="waterproofing-photo-upload" type="file" accept="image/*" multiple></div><div id="waterproofing-photos"></div><p class="hint">Bis zu ${projectPhotoLimit} Fotos insgesamt für Abdichtung und Bad bei Übergabe.</p></details>`;
}
export function waterproofingHTML(details={}){
 const type=Object.hasOwn(waterproofingTypes,details.type)?waterproofingTypes[details.type]:'',waterClass=waterClasses.includes(details.water_class)?details.water_class:'';
 const photos=(details.photos||[]).filter(labelPhoto);
 return `${type||waterClass?`<dl class="specs">${type?`<div><dt>Art der Abdichtung</dt><dd>${esc(type)}</dd></div>`:''}${waterClass?`<div><dt>Wassereinwirkungsklasse</dt><dd>${esc(waterClass)}</dd></div>`:''}</dl>`:''}${photos.length?`<h4>Fotos der Abdichtung</h4><div class="gallery">${photos.map((src,i)=>`<img src="${src}" alt="Dokumentation der Abdichtung ${i+1}" loading="lazy">`).join('')}</div>`:''}`;
}
