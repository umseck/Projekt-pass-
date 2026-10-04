// Byte validation and SHA-256. This does NOT certify malware safety or technical content.
export const documentTypes=['Technisches Merkblatt','Sicherheitsdatenblatt','Produktinformation','Systemaufbau','Prüfzeugnis','Farbkarte','Pflegehinweis','Wartungshinweis','Verarbeitungshinweis','Rechnung / Lieferschein','Betriebshinweis','Sonstiges'];
export function decodeData(data,mime,maxBytes=1000000){
 const prefix=`data:${mime};base64,`;if(typeof data!=='string'||!data.startsWith(prefix))throw Error('Dateityp stimmt nicht mit dem Inhalt überein.');
 const encoded=data.slice(prefix.length);if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)||encoded.length%4===1)throw Error('Beschädigte Dateikodierung.');
 let raw;try{raw=atob(encoded);}catch{throw Error('Beschädigte Dateikodierung.');}
 if(raw.length>maxBytes)throw Error('Datei überschreitet die zulässige Größe.');
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export function pdfBytes(data){
 const bytes=decodeData(data,'application/pdf');const text=new TextDecoder('latin1').decode(bytes);
 if(!/^%PDF-1\.[0-9]|^%PDF-2\.0/.test(text)||!/^%%EOF\s*$/m.test(text.slice(-1024))||!text.includes('startxref')||!text.includes('endobj'))throw Error('PDF unvollständig oder beschädigt. Bitte die Originaldatei neu wählen.');
 if(/\/(?:JavaScript|JS|Launch|EmbeddedFile)\b/.test(text))throw Error('PDF enthält aktive oder eingebettete Inhalte. Bitte eine statische PDF wählen.');
 return bytes;
}
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function fileInfo(data,name,mime){
 const bytes=mime==='application/pdf'?pdfBytes(data):decodeData(data,mime,550000);
 return {filename:name,size:bytes.length,mime,sha256:await sha256(bytes)};
}
