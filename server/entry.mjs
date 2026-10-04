// Production boundary. Legacy compatibility tests still exercise the underlying handler.
// New previews/releases never turn project-wide defaults into actual material statements.
import {createHandler,securityHeaders} from './api.mjs';
import {publicCustomerProject} from '../public/customer-projection.mjs';
const reject=(status,error)=>Response.json({error},{status,headers:securityHeaders});
export function createProductionHandler(fetcher=fetch){
 const base=createHandler(fetcher);
 return async(request,env,ctx)=>{
  const op=new URL(request.url).pathname.split('/').pop();
  if(op==='preview'){
   const response=await base(request,env,ctx);if(!response.ok)return response;const data=await response.json();
   if(!data.handed_over_at&&!Array.isArray(data.content?.areas)){data.content={...data.content,areas:[]};return Response.json(publicCustomerProject(data),{status:response.status,headers:response.headers});}
   return Response.json(data,{status:response.status,headers:response.headers});
  }
  if(op!=='handover'||request.method!=='POST')return base(request,env,ctx);
  if(!env.APP_ORIGIN||new URL(request.url).origin!==env.APP_ORIGIN||request.headers.get('origin')!==env.APP_ORIGIN)return base(request,env,ctx);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return base(request,env,ctx);
  let data;try{
   const reader=request.clone().body?.getReader();if(!reader)return reject(400,'JSON erwartet.');let size=0,parts=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>6000000){reader.cancel().catch(()=>{});return reject(413,'Anfrage ist zu groß.');}parts.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}data=JSON.parse(new TextDecoder().decode(bytes));
  }catch{return reject(400,'Bitte die Angaben prüfen.');}
  const headers=new Headers(request.headers);headers.delete('content-length');
  const lookup=new Request(env.APP_ORIGIN+'/api/project',{method:'POST',headers,body:JSON.stringify({id:data?.id})});
  const response=await base(lookup,env,ctx);if(!response.ok)return response;
  const current=await response.json();
  if(current.version!==data.version)return reject(409,'Es gibt einen neueren Stand. Bitte das Projekt neu öffnen.');
  const areas=current.content?.areas;
  if(!Array.isArray(areas)||!areas.length||areas.some(a=>!a.records))return reject(409,'Vor der Freigabe bitte das Projekt über „Meine Projekte“ im Bad-Editor öffnen und die tatsächlichen Materialien je Fläche einzeln bestätigen. Vorauswahlen werden nicht automatisch übernommen.');
  // The base handler repeats area review checks; SQL checks the same version atomically.
  return base(request,env,ctx);
 };
}
export const handle=createProductionHandler();
