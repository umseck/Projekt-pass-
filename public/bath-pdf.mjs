import {answerRows,bathKinds,bathNames,materialUsed,qualityStatements,photoStages} from './bath-model.mjs';
import {decodeData} from './file-integrity.mjs';
import {widths} from './pdf-widths.mjs';
// Self-contained PDF summary, standard WinAnsi fonts. HTML/JSON retain full Unicode.
const extras={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
const encoded=s=>[...String(s??'')].map(c=>extras[c]??(c.charCodeAt(0)<256?c.charCodeAt(0):63));
const hex=s=>encoded(s).map(n=>n.toString(16).padStart(2,'0')).join('');
const binary=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return s;};
function jpeg(data){
 const b=decodeData(data,'image/jpeg',550000);if(b[0]!==255||b[1]!==216||b.at(-2)!==255||b.at(-1)!==217)throw Error('JPEG-Datei ist beschädigt.');
 let i=2;while(i<b.length-4){if(b[i]!==255){i++;continue;}const m=b[i+1];if(m===216||m===217){i+=2;continue;}const n=b[i+2]*256+b[i+3];if(n<2)break;if([192,193,194].includes(m))return {bytes:b,width:b[i+7]*256+b[i+8],height:b[i+5]*256+b[i+6],components:b[i+9]};i+=n+2;}throw Error('JPEG-Abmessungen fehlen.');
}
export function buildPDF(copy){
 const objects=[null],add=s=>(objects.push(s),objects.length-1),catalog=add(''),pagesRef=add(''),font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const pages=[];let commands='',images={},y=790,pageNo=0;
 const measure=(s,size,b=false)=>encoded(s).reduce((sum,c)=>sum+(widths[b?'Helvetica-Bold':'Helvetica'][c-32]||556),0)*size/1000;
 function write(s,size=10.5,b=false,x=48){commands+=`BT /${b?'FB':'FR'} ${size} Tf 0.16 0.20 0.15 rg 1 0 0 1 ${x} ${y} Tm <${hex(s)}> Tj ET\n`;}
 function finish(){if(!pageNo)return;commands+=`BT /FR 8 Tf 0.35 0.38 0.32 rg 1 0 0 1 48 28 Tm <${hex('Projektpass Bad · '+(copy.handed_over_at||'Entwurf')+' · Seite '+pageNo)}> Tj ET\n`;
  const stream=add(`<< /Length ${commands.length} >>\nstream\n${commands}endstream`),page=add(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /FR ${font} 0 R /FB ${bold} 0 R >> /XObject << ${Object.entries(images).map(([k,v])=>'/'+k+' '+v+' 0 R').join(' ')} >> >> /Contents ${stream} 0 R >>`);pages.push(page);
 }
 function next(){finish();commands='';images={};y=790;pageNo++;write('PROJEKTPASS BAD  /  KUNDENÜBERGABE',9,true);y-=30;}
 function ensure(height){if(y-height<55)next();}
 function lines(s,size=10.5,b=false){
  const result=[];for(const paragraph of String(s??'').split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(!word)continue;if(measure((line?line+' ':'')+word,size,b)<=499){line+=(line?' ':'')+word;continue;}if(line){result.push(line);line='';}let chunk='';for(const char of word){if(measure(chunk+char,size,b)>499){result.push(chunk);chunk='';}chunk+=char;}line=chunk;}result.push(line);}return result;
 }
 function text(s,size=10.5,b=false,gap=7){const xs=lines(s,size,b);for(const line of xs){ensure(size*1.5);write(line,size,b);y-=size*1.45;}y-=gap;}
 function image(data,caption,maxHeight=220){
  const im=jpeg(data);const ratio=Math.min(499/im.width,maxHeight/im.height),w=im.width*ratio,h=im.height*ratio;ensure(h+40);
  const name='IM'+Object.keys(images).length,ref=add(`<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /${im.components===1?'DeviceGray':'DeviceRGB'} /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n${binary(im.bytes)}\nendstream`);images[name]=ref;commands+=`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} 48 ${(y-h).toFixed(2)} cm /${name} Do Q\n`;y-=h+15;text(caption,9,false,10);
 }
 next();if(copy.company?.logo?.startsWith('data:image/jpeg;'))image(copy.company.logo,'Ausführender Betrieb',55);
 text(copy.title,26,true,14);text(copy.company?.name||'Betrieb nicht dokumentiert',15,true);text('Übergabestand: '+(copy.handed_over_at||'Noch nicht veröffentlicht'));text('Passkennung: '+(copy.pass_number??'Nicht dokumentiert'));text([copy.company?.contact,copy.company?.phone,copy.company?.email,copy.company?.website].filter(Boolean).join(' · '));
 text('Alles, was Sie später für Pflege, Reparatur und Nachbestellung brauchen – direkt an der dokumentierten Fläche.',12,false,14);
 text('Die Angaben stammen vom ausführenden Betrieb. Der Projektpass ist keine technische Prüfung, rechtliche Abnahme oder Garantie.',9,false,12);
 for(const a of copy.areas||[]){ensure(110);text(a.name,19,true);for(const q of qualityStatements(a))text(q,9);for(const row of answerRows(a)){ensure(50);text(row.question,12,true,3);text(row.answer);text(row.source+(row.date?' · Dokumentstand '+row.date:''),9);if(row.url)text('Quelle: '+row.url,9);}
  for(const k of bathKinds[a.trade].filter(k=>materialUsed(a,k))){const docs=a.products[k].documents||[];text(bathNames[k]+' – Unterlagen',11,true);if(!docs.length)text('Keine Unterlage dokumentiert.',9);for(const d of docs){text(d.name+' · '+(d.type||'Dokumentart unbekannt'),10,true);text((d.data?'Archivierte Datei im vollständigen Paket':d.url?'Nur extern verlinkt – nicht als Originaldatei enthalten':'Datei fehlt')+'\nQuelle: '+(d.source||'Nicht dokumentiert')+'\nDokumentstand: '+(d.document_date||'Unbekannt'),9);if(d.url)text('Externer Link: '+d.url,9);}}
  if(a.photos.length){text('Fotodokumentation',13,true);a.photos.forEach((data,i)=>image(data,[photoStages[a.photo_notes?.[i]?.stage]||'Arbeitsschritt nicht zugeordnet',a.photo_notes?.[i]?.caption||'Freigegebenes Foto'].join(' · ')));}
 }
 if(copy.general?.photos?.length){text('Allgemeine Fotos ohne Flächenzuordnung',13,true);for(const data of copy.general.photos)image(data,'Allgemeines freigegebenes Foto');}
 ensure(130);text('Ansprechpartner für Fragen, Wartung und Reparatur',13,true);text([copy.company?.name,copy.company?.contact,copy.company?.phone,copy.company?.email,copy.company?.website].filter(Boolean).join('\n'));
 text('Originalunterlagen und Fotos finden Sie im vollständigen ZIP-Paket. Fehlende und nur verlinkte Dateien sind ausdrücklich gekennzeichnet. Diese Zusammenfassung ersetzt keine Herstelleranweisung.',9);finish();
 objects[catalog]=`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`;objects[pagesRef]=`<< /Type /Pages /Kids [${pages.map(p=>p+' 0 R').join(' ')}] /Count ${pages.length} >>`;
 let output='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=output.length;output+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=output.length;output+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`+offsets.slice(1).map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return Uint8Array.from(output,c=>c.charCodeAt(0));
}
export async function pdfWithLogo(copy){
 let source=copy;if(copy.company?.logo?.startsWith('data:image/png;')){
  if(typeof createImageBitmap!=='function'||typeof OffscreenCanvas!=='function')throw Error('Das PNG-Logo konnte nicht für PDF umgewandelt werden. Bitte HTML/ZIP sichern oder JPEG-Logo verwenden.');
  const bitmap=await createImageBitmap(new Blob([decodeData(copy.company.logo,'image/png',550000)],{type:'image/png'})),c=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bitmap,0,0);bitmap.close();const blob=await c.convertToBlob({type:'image/jpeg',quality:.9});const raw=binary(new Uint8Array(await blob.arrayBuffer()));source={...copy,company:{...copy.company,logo:'data:image/jpeg;base64,'+btoa(raw)}};
 }
 return buildPDF(source);
}
