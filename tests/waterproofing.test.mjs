import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {content,standard,company} from '../server/validation.mjs';
import {waterproofingFields,waterproofingHTML} from '../public/waterproofing.mjs';

const photo='data:image/jpeg;base64,/9j/AA==';
test('waterproofing stays optional, preserves project documentation and rejects unsafe or oversized input',()=>{
 assert.equal(content({}).waterproofing_details,undefined);
 assert.deepEqual(content({waterproofing_details:{}}).waterproofing_details,{water_class:'',type:'',photos:[]});
 const details={water_class:'W2-I',type:'compound',photos:[photo],forged:'ignored'};
 const saved=content({waterproofing:{manufacturer:'PCI',name:'Seccoral 1K',color:'grau'},waterproofing_details:details});
 assert.equal(saved.waterproofing.color,'');assert.deepEqual(saved.waterproofing_details,{water_class:'W2-I',type:'compound',photos:[photo]});
 assert.deepEqual(content(JSON.parse(JSON.stringify(saved))).waterproofing_details,saved.waterproofing_details);
 assert.throws(()=>content({waterproofing_details:{water_class:'W4-I'}}),/Wassereinwirkungsklasse/);
 assert.throws(()=>content({waterproofing_details:{type:'constructor'}}),/Dichtbahn oder Dichtmasse/);
 assert.throws(()=>content({waterproofing_details:{photos:['https://tracking.example/photo.jpg']}}));
 assert.throws(()=>content({waterproofing_details:{photos:['data:image/svg+xml;base64,PHN2Zz4=']}}));
 assert.throws(()=>content({waterproofing_details:{photos:Array(9).fill(photo)}}));
 assert.equal(content({photos:Array(7).fill(photo),waterproofing_details:details}).photos.length,7);
 assert.throws(()=>content({photos:Array(8).fill(photo),waterproofing_details:details}),/höchstens 8 Fotos insgesamt/);
 assert.equal(standard(saved,'seamless').waterproofing_details,undefined);
 assert.equal(company({name:'Betrieb',favorites:{waterproofing:[{...saved.waterproofing,waterproofing_details:details}]}}).favorites.waterproofing[0].waterproofing_details,undefined);
});

test('optional waterproofing fields reopen without guessing a class; customer photos reject unsafe URLs',async()=>{
 const win=new Window();
 try{
  win.document.body.innerHTML=waterproofingFields();
  const $=s=>win.document.querySelector(s);
  assert.equal($('#waterproofing-water-class').value,'');assert.equal($('#waterproofing-type').value,'');
  assert.equal($('#waterproofing-photo-upload').required,false);assert.equal($('#waterproofing-photo-upload').multiple,true);
  assert.match($('#waterproofing-documentation summary').textContent,/Fotos der Abdichtung \(empfohlen\)/);
  assert.match($('#waterproofing-documentation').textContent,/Optional – am besten vor dem Überdecken aufnehmen/);
  assert.equal(win.document.querySelector('[required]'),null);
  win.document.body.innerHTML=waterproofingFields({water_class:'W1-I',type:'sheet',photos:[photo]});
  assert.equal($('#waterproofing-water-class option[selected]').value,'W1-I');assert.equal($('#waterproofing-type option[selected]').value,'sheet');
  const html=waterproofingHTML({water_class:'W1-I',type:'sheet',photos:[photo,'https://tracking.example','data:image/jpeg;base64,/9j/" onerror="alert(1)']});
  win.document.body.innerHTML=html;
  assert.match(html,/Dichtbahn/);assert.match(html,/W1-I/);assert.equal(win.document.querySelectorAll('img').length,1);
  assert.equal($('img').alt,'Dokumentation der Abdichtung 1');assert.equal($('img').getAttribute('onerror'),null);
  assert.equal(waterproofingHTML(), '');assert.equal(waterproofingHTML({water_class:'<script>',type:'__proto__'}),'');
 }finally{await win.happyDOM.abort();win.close();}
});
