/** Structural checks for browser-produced JPEGs and static PDFs.
 * Not a malware scanner or a PDF conformance/technical-content certification.
 */
import {dataBytes} from './model.mjs';
export function jpegInfo(data) {
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(data||''))throw Error('JPEG-Datei erwartet.');
 const b=dataBytes(data);if(b.length<20||b[0]!==255||b[1]!==216||b.at(-2)!==255||b.at(-1)!==217)throw Error('JPEG-Datei ist unvollständig.');
 let p=2,frame=null;
 while(p<b.length-2){if(b[p++]!==255)throw Error('Ungültige JPEG-Struktur.');while(b[p]===255)p++;const marker=b[p++];
  if(marker===218){if(!frame)throw Error('JPEG-Abmessungen fehlen.');return {...frame,bytes:b};}
  if(marker===217)break;const n=(b[p]<<8)|b[p+1];if(n<2||p+n>b.length)throw Error('Beschädigtes JPEG-Segment.');
  // Canvas recompression strips EXIF/GPS, IPTC and comments. Direct API uploads must also be clean.
  if((marker>=225&&marker<=237&&marker!==226)||marker===239||marker===254)throw Error('Bild enthält zusätzliche Metadaten. Bitte über den Foto-Upload neu komprimieren.');
  // Chromium's canvas JPEG encoder includes an ICC colour profile (APP2), not GPS/EXIF.
  if(marker===226){const tag=new TextDecoder('ascii').decode(b.subarray(p+2,p+14));if(n<16||tag!=='ICC_PROFILE\0'||b[p+14]<1||b[p+15]<b[p+14])throw Error('Unbekannte JPEG-Zusatzdaten.');if(b[p+14]===1&&(n<144||new TextDecoder('ascii').decode(b.subarray(p+52,p+56))!=='acsp'))throw Error('Ungültiges JPEG-Farbprofil.');}
  if([192,193,194].includes(marker)){if(n<8)throw Error('Beschädigte Bildabmessungen.');frame={width:(b[p+5]<<8)|b[p+6],height:(b[p+3]<<8)|b[p+4],components:b[p+7]};if(!frame.width||!frame.height||frame.width>4096||frame.height>4096||![1,3].includes(frame.components))throw Error('JPEG-Abmessungen oder Farbraum nicht unterstützt.');}
  p+=n;
 }
 throw Error('JPEG-Bilddaten fehlen.');
}
export function validateStaticPDF(data){
 if(!/^data:application\/pdf;base64,[A-Za-z0-9+/]+={0,2}$/.test(data||''))throw Error('PDF-Datei erwartet.');
 const b=dataBytes(data),t=new TextDecoder('latin1').decode(b);
 if(!/^%PDF-(?:1\.[0-7]|2\.0)/.test(t)||!/[\r\n]%%EOF\s*$/.test(t.slice(-2048))||!/(?:^|\s)\d+\s+\d+\s+obj\b/.test(t)||!t.includes('endobj'))throw Error('PDF-Datei ist unvollständig oder beschädigt.');
 const x=/startxref\s+(\d+)\s+%%EOF\s*$/.exec(t.slice(-2048));if(!x||Number(x[1])>=b.length||Number(x[1])<8)throw Error('PDF-Querverweis fehlt oder ist beschädigt.');
 const start=t.slice(Number(x[1]),Number(x[1])+200);if(!/^(?:xref\b|\d+\s+\d+\s+obj\b)/.test(start))throw Error('PDF-Querverweis ist ungültig.');
 if(/\/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA|Encrypt)\b/.test(t))throw Error('Aktive, eingebettete oder verschlüsselte PDF-Inhalte werden nicht unterstützt. Bitte eine statische PDF hochladen.');
 return b;
}
