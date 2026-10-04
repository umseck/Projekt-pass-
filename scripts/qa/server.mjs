// LOCAL TEST HARNESS ONLY. Loopback, fake Auth upstream, real API + PostgreSQL.
// Never deploy this server and never point it at a live database.
import https from 'node:https';
import {readFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {createProductionHandler as createHandler} from '../../server/entry.mjs';
import {fixture,company,actor,foreign} from './fixtures.mjs';
import {standard} from '../../server/validation.mjs';
const root=path.resolve(import.meta.dirname,'../..'),tmp=path.join(root,'qa/generated');await mkdir(tmp,{recursive:true});
const key=path.join(tmp,'local-key.pem'),cert=path.join(tmp,'local-cert.pem');
if(!existsSync(key))execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
for(const file of ['schema.sql','operator.sql','workflow.sql'])await db.exec(await readFile(path.join(root,'database',file),'utf8'));
const cid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',cid2='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
await db.query('insert into pp_private.companies(id,profile) values($1,$2),($3,$4)',[cid,JSON.stringify(company),cid2,JSON.stringify({...company,name:'FOREIGN TEST COMPANY'})]);
await db.query('insert into pp_private.members(user_id,company_id) values($1,$2),($3,$4)',[actor,cid,foreign,cid2]);
const passes=Array.from({length:6},(_,i)=>({id:crypto.randomUUID(),token:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex'),number:i+1}));
for(const p of passes)await db.query('insert into pp_private.passes(id,company_id,number,token) values($1,$2,$3,$4)',[p.id,cid,p.number,p.token]);
let origin;
const upstream=async(url,opts={})=>{
 const b=opts.body?JSON.parse(opts.body):{};
 if(url.endsWith('/user')){const id=opts.headers.Authorization?.slice(7);return [actor,foreign].includes(id)?Response.json({id}):Response.json({error:'expired'},{status:401});}
 if(url.includes('/token')){if(b.password!=='LOCAL-TEST-ONLY')return Response.json({error:'invalid'},{status:401});const id=b.email==='foreign@example.test'?foreign:actor;return Response.json({access_token:id,user:{id},expires_in:3600});}
 if(url.endsWith('/logout'))return Response.json({ok:true});
 const fn=url.endsWith('/pp_control')?'pp_control':'pp_api';
 try{return Response.json((await db.query(`select public.${fn}($1,$2::uuid,$3::jsonb) result`,[b.op,b.actor,JSON.stringify(b.args)])).rows[0].result);}catch(e){return Response.json({message:e.message},{status:400});}
};
const handle=createHandler(upstream),mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const server=https.createServer({key:await readFile(key),cert:await readFile(cert)},async(req,res)=>{
 try{
 const url=new URL(req.url,origin);if(url.pathname.startsWith('/api/')){const body=[];for await(const c of req)body.push(c);const r=await handle(new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(body)}),{APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'LOCAL-TEST-ONLY',SUPABASE_PUBLISHABLE_KEY:'LOCAL-TEST-ONLY'});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
 if(url.pathname==='/__qa/config'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({passes,actor,foreign,company,standards:Object.fromEntries(['seamless','tile','mixed'].map(k=>{const c=fixture(k);return [k,{trade:c.trade,value:standard({...c.areas[0].products,area_templates:c.areas},c.trade)}];}))}));return;}
 const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\//,'');const file=path.resolve(root,'public',name);if(!file.startsWith(path.join(root,'public')+path.sep)){res.writeHead(403);res.end();return;}
 const data=await readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.end(data);
 }catch(e){res.writeHead(404);res.end('Not found');}
});
server.listen(0,'127.0.0.1',()=>{origin='https://127.0.0.1:'+server.address().port;console.log(JSON.stringify({origin}));});
const stop=async()=>{server.close();await db.close();process.exit(0);};process.on('SIGTERM',stop);process.on('SIGINT',stop);
