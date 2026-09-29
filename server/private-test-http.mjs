import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {FileStore,createTestService} from './private-test-store.mjs';
import {HttpError} from './validation.mjs';

export const testHeaders={'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow','Permissions-Policy':'camera=(self), microphone=(self), geolocation=()',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
const hash=v=>createHash('sha256').update(v).digest('hex');
export function passwordHash(password,salt=randomBytes(16).toString('hex')){return salt+':'+scryptSync(password,salt,64).toString('hex');}
function passwordMatches(password,expected){if(typeof password!=='string'||password.length>256)return false;const [salt,value]=expected.split(':');const bytes=Buffer.from(value,'hex'),actual=scryptSync(password,salt,64);return bytes.length===actual.length&&timingSafeEqual(bytes,actual);}
export async function createPrivateServer({env,store,fetcher,publicDir=resolve('public')}={}){
 if(!env?.PP_TEST_EMAIL||!env.PP_TEST_PASSWORD_HASH||!env.PP_TEST_ORIGIN)throw Error('Privaten Testzugang zuerst mit npm run test:setup konfigurieren.');
 if(!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.PP_TEST_PASSWORD_HASH))throw Error('Passworthash ungültig.');
 const origin=new URL(env.PP_TEST_ORIGIN);if(origin.origin!==env.PP_TEST_ORIGIN||(!['127.0.0.1','localhost'].includes(origin.hostname)&&origin.protocol!=='https:'))throw Error('Außerhalb von localhost ist HTTPS Pflicht.');
 if(origin.hostname==='projekt-pass.pages.dev')throw Error('Die produktive Projektpass-Adresse darf nicht als KI-Testumgebung verwendet werden.');
 store||=new FileStore(resolve('.private-test/data'));await store.init();const service=createTestService(store,env,{fetcher});
 const sessions=new Map(),attempts=[];const secure=origin.protocol==='https:';
 const cookie=(token,age)=>`pp_private=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure?'; Secure':''}`;
 const allowedFiles=new Set((await readdir(publicDir)).filter(f=>/\.(mjs|css|json)$/.test(f)));
 const server=createServer(async(req,res)=>{
  const send=(status,value,extra={})=>{res.writeHead(status,{...testHeaders,'Content-Type':'application/json; charset=utf-8',...extra});res.end(JSON.stringify(value));};
  try{
   if(req.headers.host!==origin.host)throw new HttpError(403,'Falsche Testadresse.');
   const path=new URL(req.url,origin).pathname;
   const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('pp_private='))?.slice(11)||'';
   const session=sessions.get(hash(token));const authorized=session?.expires>Date.now()&&session.email===env.PP_TEST_EMAIL.toLowerCase();
   if(path.startsWith('/test-api/')){
    if(req.method!=='POST'||req.headers.origin!==origin.origin||!req.headers['content-type']?.startsWith('application/json'))throw new HttpError(403,'Bitte die eigene Testoberfläche verwenden.');
    if(Number(req.headers['content-length']||0)>6000000)throw new HttpError(413,'Eingabe zu groß.');
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>6000000)throw new HttpError(413,'Eingabe zu groß.');chunks.push(chunk);}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new HttpError(400,'Ungültige Eingabe.');}
    const op=path.slice('/test-api/'.length);
    if(op==='login'){
     while(attempts.length&&attempts[0]<Date.now()-900000)attempts.shift();if(attempts.length>=5)throw new HttpError(429,'Zu viele Anmeldeversuche. In 15 Minuten erneut versuchen.');attempts.push(Date.now());
     if(String(body.email||'').toLowerCase()!==env.PP_TEST_EMAIL.toLowerCase()||!passwordMatches(body.password,env.PP_TEST_PASSWORD_HASH))throw new HttpError(401,'Testzugang oder Passwort stimmt nicht.');
     const value=randomBytes(32).toString('hex');sessions.clear();sessions.set(hash(value),{email:env.PP_TEST_EMAIL.toLowerCase(),expires:Date.now()+3600000});return send(200,{ok:true},{'Set-Cookie':cookie(value,3600)});
    }
    if(!authorized)throw new HttpError(401,'Bitte mit deinem privaten Testkonto anmelden.');
    if(op==='logout'){sessions.delete(hash(token));return send(200,{ok:true},{'Set-Cookie':cookie('',0)});}
    if(!['status','create','company_save','project','inputs','customer','save','handover','submit','process','reject','accept'].includes(op))throw new HttpError(404,'Nicht gefunden.');
    return send(200,await service(op,body));
   }
   if(req.method!=='GET')throw new HttpError(405,'Nicht unterstützt.');
   // Only explicitly public code assets; never traverse or serve server/secret/data files.
   if(path==='/'||path==='/ai-test'){res.writeHead(200,{...testHeaders,'Content-Type':'text/html; charset=utf-8'});return res.end(await readFile(join(publicDir,'ai-test.html')));}
   const name=path.slice(1);if(name.includes('/')||!allowedFiles.has(name))throw new HttpError(404,'Nicht gefunden.');
   res.writeHead(200,{...testHeaders,'Content-Type':({'.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[extname(name)]});res.end(await readFile(join(publicDir,name)));
  }catch(e){send(e instanceof HttpError?e.status:503,{error:e instanceof HttpError?e.message:'Testserver konnte die Aktion nicht abschließen. Eingabe aufbewahren und erneut versuchen.'});}
 });
 server.requestTimeout=65000;server.headersTimeout=10000;return server;
}
