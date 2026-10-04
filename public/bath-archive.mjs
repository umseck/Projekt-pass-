import {offlineHTML} from './bath-customer.mjs';
import {pdfWithLogo} from './bath-pdf.mjs';
import {decodeData,pdfBytes,sha256} from './file-integrity.mjs';
const utf8=s=>new TextEncoder().encode(s);
const table=Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
function header(size){const bytes=new Uint8Array(size);return {bytes,v:new DataView(bytes.buffer)};}
function concat(parts){const out=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}
export function zipStore(files){
 const local=[],central=[];let offset=0;for(const f of files){if(!/^[A-Za-z0-9_./-]+$/.test(f.path)||f.path.startsWith('/')||f.path.includes('..'))throw Error('Ungültiger Archivpfad.');const name=utf8(f.path),crc=crc32(f.bytes),l=header(30);l.v.setUint32(0,0x04034b50,true);l.v.setUint16(4,20,true);l.v.setUint16(6,0x800,true);l.v.setUint16(12,33,true);l.v.setUint32(14,crc,true);l.v.setUint32(18,f.bytes.length,true);l.v.setUint32(22,f.bytes.length,true);l.v.setUint16(26,name.length,true);local.push(l.bytes,name,f.bytes);
 const c=header(46);c.v.setUint32(0,0x02014b50,true);c.v.setUint16(4,20,true);c.v.setUint16(6,20,true);c.v.setUint16(8,0x800,true);c.v.setUint16(14,33,true);c.v.setUint32(16,crc,true);c.v.setUint32(20,f.bytes.length,true);c.v.setUint32(24,f.bytes.length,true);c.v.setUint16(28,name.length,true);c.v.setUint32(42,offset,true);central.push(c.bytes,name);offset+=30+name.length+f.bytes.length;}
 const index=concat(central),end=header(22);end.v.setUint32(0,0x06054b50,true);end.v.setUint16(8,files.length,true);end.v.setUint16(10,files.length,true);end.v.setUint32(12,index.length,true);end.v.setUint32(16,offset,true);return concat([...local,index,end.bytes]);
}
export async function buildArchive(copy){
 const files=[],add=(path,bytes,mime,source={})=>files.push({path,bytes,mime,...source});
 add('index.html',utf8(offlineHTML(copy)),'text/html');add('Projektpass.json',utf8(JSON.stringify(copy,null,2)),'application/json');add('Projektpass.pdf',await pdfWithLogo(copy),'application/pdf');
 let n=0,d=0;for(const a of [...copy.areas,{id:'general',photos:copy.general?.photos||[],products:{general:{documents:copy.general?.documents||[]}}}]){
  for(const photo of a.photos||[])add(`Fotos/foto-${String(++n).padStart(3,'0')}.jpg`,decodeData(photo,'image/jpeg',550000),'image/jpeg',{area_id:a.id});
  for(const [role,p] of Object.entries(a.products||{}))for(const doc of p.documents||[])if(doc.data){const raw=pdfBytes(doc.data);if(doc.integrity&&(doc.integrity.size!==raw.length||doc.integrity.sha256!==await sha256(raw)))throw Error('Integritätsprüfung fehlgeschlagen: '+doc.name);add(`Unterlagen/dokument-${String(++d).padStart(3,'0')}.pdf`,pdfBytes(doc.data),'application/pdf',{area_id:a.id,role,document_name:doc.name,document_date:doc.document_date||''});}
 }
 const manifest={format:'projektpass-offline/1',title:copy.title,handed_over_at:copy.handed_over_at,files:await Promise.all(files.map(async({bytes,...f})=>({...f,size:bytes.length,sha256:await sha256(bytes)})))};
 add('Manifest.json',utf8(JSON.stringify(manifest,null,2)),'application/json');return {bytes:zipStore(files),manifest};
}
export function saveBytes(name,bytes,type){const u=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);}
