// Transactional notifications only. Never use a user's personal mailbox as an app service.
export const mailReady=env=>Boolean(env.RESEND_API_KEY&&env.MAIL_FROM&&/^https:\/\//.test(env.APP_ORIGIN||''));
export async function dispatchMail(env,rpc,actor,projectId,fetcher=fetch){
 if(!mailReady(env))return {configured:false,sent:0,failed:0};
 const jobs=await rpc('flow_mail_claim',actor,{project_id:projectId});let sent=0,failed=0;
 for(const [index,job] of jobs.entries()){
  if(index)await new Promise(resolve=>setTimeout(resolve,600));
  let provider_id='';
  try{
   const r=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'projektpass-'+job.id},body:JSON.stringify({from:env.MAIL_FROM,to:[job.email],subject:job.subject,text:job.body})});
   const data=await r.json();if(r.ok&&typeof data.id==='string')provider_id=data.id;
  }catch{}
  await rpc('flow_mail_result',actor,{project_id:projectId,id:job.id,provider_id});
  if(provider_id)sent++;else failed++;
 }
 return {configured:true,sent,failed};
}
