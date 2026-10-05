// Portable, fictional trial only. The deployed app retains its real server/Auth path.
import {bootTrial} from '../public/bath-preview.mjs';
import catalog from '../public/catalog.json';
globalThis.fetch=async input=>{
 if(String(input)==='/catalog.json')return Response.json(catalog);
 throw Error('Die Offline-Testdatei verwendet keine Live-Verbindung.');
};
let storage;
try {storage=window.sessionStorage;storage.setItem('pp-offline-check','1');storage.removeItem('pp-offline-check');}
catch {const data=new Map();storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};}
bootTrial({storage,offline:true}).catch(error=>{document.querySelector('#trial-notice').textContent=error.message;});
