import {readFile} from 'node:fs/promises';
import {createPrivateServer} from '../server/private-test-http.mjs';
// Secrets live outside public/ and are never sent to the client or printed.
let config={};try{config=JSON.parse(await readFile('.private-test/config.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const env={...config,...process.env};const server=await createPrivateServer({env});
const port=Number(env.PP_TEST_PORT||8789);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Ungültiger Testport.');
server.listen(port,'127.0.0.1',()=>console.log('Privater Projektpass-Testserver auf localhost:'+port+' gestartet. Keine Verbindung zur Produktivdatenbank.'));
