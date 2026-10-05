import {HttpError,validate,text,email,fail} from './validation.mjs';
import {areaIssues,projectIssues,documentationGaps} from '../public/bath-model.mjs';

const COOKIE='__Host-pp_session';
const publicOps=new Set(['scan','access_info','access_activate','customer_access_info','customer_access_activate']);
const customerOps=new Set(['customer_invite','customer_access_info','customer_access_begin','customer_access_redeem','customer_bootstrap','customer_project','customer_add','customer_transfer']);
const controlOps=new Set(['bootstrap','passes_add','operator_list','operator_company','operator_create','operator_save','operator_invite','access_info','access_begin','access_redeem']);
const operations=new Set(['company_save','activate','project','preview','save','handover','visibility','delete',...controlOps,...publicOps,...customerOps]);
export function randomToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export const securityHeaders={
 'Cache-Control':'no-store, private','Pragma':'no-cache','Content-Type':'application/json; charset=utf-8',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow',
 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"
};
function cookie(value,maxAge){return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;}
function session(request){return (request.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);}
async function readBody(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'JSON erwartet.');
 const max=6000000;const reader=request.body?.getReader();if(!reader)fail();
 let total=0,parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;
   if(total>max){await reader.cancel();throw new HttpError(413,'Zu viele Fotos. Bitte weniger oder kleinere Bilder wählen.');}parts.push(value);}
 const bytes=new Uint8Array(total);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail();}
}
export function createHandler(fetcher=fetch){const upstream=(url,options={})=>fetcher(url,{...options,signal:AbortSignal.timeout(15000)});return async function handle(request,env,ctx){
 let extra={};
 try{
   const endpoint=new URL(request.url);const op=endpoint.pathname.split('/').pop();
   if(request.method!=='POST')throw new HttpError(405,'Bitte die Projektpass-Oberfläche verwenden.');
   // Reject cross-origin writes AND reads; no tokens in URLs or access logs.
   if(!env.APP_ORIGIN||endpoint.origin!==env.APP_ORIGIN||request.headers.get('origin')!==env.APP_ORIGIN)
     throw new HttpError(403,'Bitte PROJEKTPASS über seine eigene Adresse öffnen.');
   if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY||!env.SUPABASE_PUBLISHABLE_KEY)
     throw new HttpError(503,'Der Betriebszugang wird noch eingerichtet.');
   const base=env.SUPABASE_URL.replace(/\/$/,'');
   if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base))throw new HttpError(503,'Die Verbindung ist noch nicht eingerichtet.');
   const b=await readBody(request);
   const authHeaders={'apikey':env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};
   let result;
   if(op==='login'){
     const email=text(b.email,254),password=b.password;if(!email||typeof password!=='string'||!password||password.length>256)fail();
     const r=await upstream(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:authHeaders,body:JSON.stringify({email,password})});
     const data=await r.json();
     if(!r.ok||!data.access_token)throw new HttpError(401,'Anmeldung nicht möglich. Bitte E-Mail und Passwort prüfen.');
     // Check the database-backed business membership or operator role before issuing a session.
     const check=await bootstrap(data.user.id);
     extra['Set-Cookie']=cookie(data.access_token,Math.min(data.expires_in||3600,3600));
     result=check;
   }else if(['access_info','customer_access_info'].includes(op)){
     const args=validate(op,b);
     result=await rpc(op,null,{token_hash:await hash(args.token)});
   }else if(['access_activate','customer_access_activate'].includes(op)){
     const args=validate(op,b),token_hash=await hash(args.token);
     // Validate and rate-limit the invitation before touching Supabase Auth.
     const customer=op==='customer_access_activate';
     const invite=await rpc(customer?'customer_access_begin':'access_begin',null,{token_hash});
     const address=email(invite.email||args.email);
     const created=await upstream(base+'/auth/v1/admin/users',{method:'POST',
       headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},
       body:JSON.stringify({email:address,password:args.password,email_confirm:true})});
     const createdData=await created.json();
     const alreadyExists=['email_exists','user_already_exists'].includes(createdData.code||createdData.error_code);
     if(!created.ok&&!alreadyExists){
       if(created.status===429)throw new HttpError(429,'Zu viele Versuche. Bitte in einigen Minuten erneut versuchen.');
       if(createdData.code==='weak_password'||createdData.error_code==='weak_password')
         throw new HttpError(400,'Bitte ein stärkeres Passwort wählen.');
       throw new HttpError(503,'Der Zugang konnte noch nicht eingerichtet werden. Bitte erneut versuchen.');
     }
     // Existing users must prove ownership with their password. Never reset it here.
     const signed=await upstream(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:authHeaders,
       body:JSON.stringify({email:address,password:args.password})});
     const auth=await signed.json();
     if(!signed.ok||!auth.access_token||!auth.user?.id||String(auth.user.email||'').toLowerCase()!==address)
       throw new HttpError(401,'Anmeldung nicht möglich. Falls diese E-Mail bereits einen Zugang hat, verwenden Sie dessen Passwort.');
     const redeemed=await rpc(customer?'customer_access_redeem':'access_redeem',auth.user.id,{token_hash,email:address,...(customer?{pass_token:randomToken()}:{})});
     result=customer?{...await rpc('customer_bootstrap',auth.user.id,{}),project_id:redeemed.project_id}:await bootstrap(auth.user.id);
     extra['Set-Cookie']=cookie(auth.access_token,Math.min(auth.expires_in||3600,3600));
   }else if(op==='logout'){
     const access=session(request);
     extra['Set-Cookie']=cookie('',0);
     if(access)try{await upstream(base+'/auth/v1/logout',{method:'POST',headers:{...authHeaders,Authorization:'Bearer '+access}});}catch{}
     result={ok:true};
   }else{
     if(!operations.has(op)||['access_begin','access_redeem','customer_access_begin','customer_access_redeem'].includes(op))throw new HttpError(404,'Nicht gefunden.');
     const args=validate(op,b);let actor=null;
     if(!publicOps.has(op)){
       const access=session(request);if(!access)throw new HttpError(401,'Bitte melden Sie sich an.');
       const r=await upstream(base+'/auth/v1/user',{headers:{...authHeaders,Authorization:'Bearer '+access}});
       if(!r.ok){extra['Set-Cookie']=cookie('',0);throw new HttpError(401,'Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.');}
       actor=(await r.json()).id;
       if(!actor)throw new HttpError(401,'Bitte erneut anmelden.');
     }
     if(op==='operator_create')args.tokens=Array.from({length:20},()=>randomToken());
     if(op==='passes_add')args.tokens=Array.from({length:args.quantity},()=>randomToken());
     let accessToken;
     if(['operator_invite','customer_invite','customer_transfer'].includes(op)){accessToken=randomToken();args.token_hash=await hash(accessToken);}
     if(op==='delete'){const current=await rpc('project',actor,{id:args.id});if(current.status==='handed_over'||current.handover_snapshot)throw new HttpError(409,'Die Originalübergabe bleibt erhalten und kann hier nicht gelöscht werden.');}
     if(op==='handover'){
      const current=await rpc('project',actor,{id:args.id});
      const required=projectIssues(current);if(required.length)fail(required.map(i=>i.label).join(' · '));
      if(current.content?.project&&documentationGaps(current.content?.areas||[]).length&&!current.content.project.gaps_acknowledged)fail('Bitte die offenen Angaben für die Übergabe ausdrücklich bestätigen.');
      if(current.content?.areas){
       if(!current.content.areas.length)fail('Bitte mindestens eine Fläche dokumentieren.');
       const missing=current.content.areas.flatMap(a=>areaIssues(a).map(message=>(a.name||'Fläche')+': '+message));
       if(missing.length)fail(missing.join(' · '));
      }
     }
     result=op==='bootstrap'?await bootstrap(actor):await rpc(op,actor,args);
     if(op==='project'&&result.status==='handed_over'){const customer=await rpc('customer_project',actor,{id:args.id});result.additions=customer.additions;result.permissions=customer.permissions;result.current_owner_email=customer.current_owner_email;}
     // Legacy journal, participant and customer-extension fields remain in the database
     // for compatibility, but are never exposed by the MVP server.
     if(['scan','preview','project','customer_project','customer_add'].includes(op)){for(const field of ['owner_additions','owner_version','owner_key_hash','journal','participants','messages','mail_outbox'])delete result[field];}

     if(accessToken){const link=env.APP_ORIGIN+(op==='operator_invite'?'/#access/':'/#customer-access/')+accessToken;result={...result,access_link:link,link};}
   }
   return new Response(JSON.stringify(result),{headers:{...securityHeaders,...extra}});

   async function bootstrap(actor){
     try{return await rpc('bootstrap',actor,{});}catch(error){if(error instanceof HttpError&&error.status===403)return rpc('customer_bootstrap',actor,{});throw error;}
   }
   async function rpc(operation,actor,args){
     const r=await upstream(base+'/rest/v1/rpc/'+(customerOps.has(operation)?'pp_customer':controlOps.has(operation)?'pp_control':'pp_api'),{method:'POST',headers:{apikey:env.SUPABASE_SECRET_KEY,
       'Content-Type':'application/json'},body:JSON.stringify({op:operation,actor,args})});
     const data=await r.json();
     if(!r.ok){
       const code=String(data.message||'');
       if(code.includes('PP_INVITE_INVALID')||code.includes('PP_SETUP_COMPLETE'))throw new HttpError(410,'Dieser Einrichtungslink ist abgelaufen oder bereits verwendet. Bitte melden Sie sich an oder lassen Sie einen neuen Link erstellen.');
       if(code.includes('PP_RATE_LIMIT'))throw new HttpError(429,'Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.');
       if(code.includes('PP_ACCOUNT_IN_USE'))throw new HttpError(409,'Dieser Zugang gehört bereits zu einem anderen Betrieb. Bitte eine andere E-Mail-Adresse verwenden.');
       if(code.includes('PP_ALREADY_OWNER'))throw new HttpError(409,'Dieser Projektpass hat bereits einen Kunden. Ein Wechsel wird vom aktuellen Kunden gestartet.');
       if(code.includes('PP_SAME_OWNER'))throw new HttpError(400,'Bitte die E-Mail-Adresse des neuen Kunden eingeben.');
       if(code.includes('PP_INVALID_AREA'))throw new HttpError(400,'Bitte einen Bereich aus der Originalübergabe wählen.');
       if(code.includes('PP_INVALID'))throw new HttpError(400,'Bitte die Angaben zur Ergänzung prüfen.');
       if(code.includes('PP_ALREADY_ACTIVE'))throw new HttpError(409,'Für diesen Betrieb ist bereits ein Zugang eingerichtet.');
       if(code.includes('PP_HANDOVER_LOCKED'))throw new HttpError(409,'Die Übergabe ist abgeschlossen. Der Kundenpass bleibt unverändert.');
       if(code.includes('PP_LIMIT'))throw new HttpError(400,'Das Limit für diesen Projektbereich ist erreicht.');
       if(code.includes('PP_CONFLICT'))throw new HttpError(409,'Es gibt einen neueren Stand. Ihre Eingaben sind noch hier. Kopieren Sie Änderungen und laden Sie das Projekt neu.');
       if(code.includes('PP_NOT_FOUND'))throw new HttpError(404,controlOps.has(operation)?'Dieser Betrieb wurde nicht gefunden.':'Dieser Projektpass ist noch nicht übergeben oder derzeit nicht freigegeben.');
       if(code.includes('PP_FORBIDDEN'))throw new HttpError(403,'Für diesen Bereich fehlt die Berechtigung.');
       if(code.includes('PP_UNAUTHORIZED'))throw new HttpError(401,'Bitte erneut anmelden.');
       throw new HttpError(502,'Speichern derzeit nicht möglich. Ihre Eingaben bleiben hier. Bitte erneut versuchen.');
     }
     return data;
   }
 }catch(error){
   // Never log bodies, tokens, photos, passwords or upstream error details.
   return new Response(JSON.stringify({error:error instanceof HttpError?error.message:'Verbindung unterbrochen. Bitte erneut versuchen.'}),
     {status:error instanceof HttpError?error.status:503,headers:{...securityHeaders,...extra}});
 }
};}
export const handle=createHandler();
