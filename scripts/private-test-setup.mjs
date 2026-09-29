import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {passwordHash} from '../server/private-test-http.mjs';
let hidden=false;const output=new Writable({write(chunk,encoding,done){if(!hidden)process.stdout.write(chunk,encoding);done();}});
const rl=createInterface({input:process.stdin,output,terminal:true});
const ask=async(prompt,secret=false)=>{process.stdout.write(prompt);hidden=secret;const value=await rl.question('');hidden=false;if(secret)process.stdout.write('\n');return value.trim();};
try{
 let previous={};try{previous=JSON.parse(await readFile('.private-test/config.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 console.log('Nur dein eigener Entwicklungstest. Keine Kundeninformationen. Kein Billing aktivieren. Schlüssel nie in Chat oder Repository einfügen.');
 const email=await ask('Deine Testkonto-E-Mail: ');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Gültige E-Mail nötig.');
 const password=await ask('Neues privates Testpasswort (mindestens 16 Zeichen, verdeckt): ',true);if(password.length<16)throw Error('Passwort zu kurz.');
 const key=await ask('Gemini API-Schlüssel (verdeckt, leer = vorhandenen behalten / später): ',true);
 const confirmed=await ask('Eigenes separates Google-Projekt OHNE Billing geprüft? [ja/nein]: ');
 await mkdir('.private-test',{recursive:true,mode:0o700});
 await writeFile('.private-test/config.json',JSON.stringify({...previous,PP_TEST_EMAIL:email.toLowerCase(),PP_TEST_PASSWORD_HASH:passwordHash(password),PP_TEST_ORIGIN:'http://localhost:8789',PP_TEST_PORT:'8789',PP_AI_ENABLED:confirmed==='ja'?'true':'false',PP_FREE_PROJECT_CONFIRMED:confirmed==='ja'?'true':'false',GEMINI_MODEL:'gemini-3.5-flash-lite',GEMINI_API_KEY:key||previous.GEMINI_API_KEY||''},null,2),{mode:0o600});
 console.log('Konfiguration gespeichert. Start: npm run test:private');
}finally{rl.close();}
