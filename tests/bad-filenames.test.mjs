import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zipFiles} from '../public/bad/export.mjs';
test('QA13 ZIP permits legitimate consecutive-dot basenames but rejects traversal and control paths',()=>{
 assert.ok(zipFiles([{name:'Unterlagen/Lieferschein..pdf',bytes:new Uint8Array([1,2,3])}]).length>0);
 for(const name of ['../private','Unterlagen/../private','/absolute','C:/private','Unterlagen\\private','Unterlagen/./private','Unterlagen/\0private'])assert.throws(()=>zipFiles([{name,bytes:new Uint8Array([1])}]),/Archivpfad/);
});

import {readFile} from 'node:fs/promises';
import {verifyAttachment} from '../server/bad/validation.mjs';
test('QA14 browser ICC colour profiles are allowed, unknown APP2 and EXIF remain blocked',async()=>{
 const assets=JSON.parse(await readFile(new URL('../public/bad/test-assets.json',import.meta.url)));const original=Buffer.from(assets.photos[0].split(',')[1],'base64');const app2=Buffer.alloc(146);app2[0]=255;app2[1]=226;app2.writeUInt16BE(144,2);app2.write('ICC_PROFILE\0',4,'ascii');app2[16]=1;app2[17]=1;app2.write('acsp',54,'ascii');
 const data=()=> 'data:image/jpeg;base64,'+Buffer.concat([original.subarray(0,2),app2,original.subarray(2)]).toString('base64');
 assert.ok((await verifyAttachment({name:'canvas.jpg',data:data()},true)).sha256);app2[4]=0;await assert.rejects(()=>verifyAttachment({name:'other.jpg',data:data()},true));app2[1]=225;await assert.rejects(()=>verifyAttachment({name:'gps.jpg',data:data()},true));
});
