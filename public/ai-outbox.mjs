// Durable device outbox: save first, clear only after a server acknowledgement.
let opening;
function db(){return opening||=new Promise((resolve,reject)=>{const r=indexedDB.open('projektpass-private-inputs',1);r.onupgradeneeded=()=>r.result.createObjectStore('outbox',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Lokales Sichern nicht möglich. Eingabe nicht schließen.'));});}
async function operation(mode,fn){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('outbox',mode),request=fn(tx.objectStore('outbox'));let result;request.onsuccess=()=>result=request.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(Error('Lokaler Speicher ist nicht verfügbar oder voll. Eingabe bleibt im Formular.'));});}
export const putDraft=value=>operation('readwrite',s=>s.put(value));
export const removeDraft=id=>operation('readwrite',s=>s.delete(id));
export const listDrafts=()=>operation('readonly',s=>s.getAll());
