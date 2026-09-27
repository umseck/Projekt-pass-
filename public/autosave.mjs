// Serialize writes so a slow response cannot acknowledge newer, unsaved edits.
export function createAutosave({read,write,onState=()=>{},delay=900,initial,ready=()=>true}){
 let saved=initial===undefined?JSON.stringify(read()):initial,timer,flight,disposed=false,blocked=null;
 const state=(name,error)=>{if(!disposed)onState(name,error);};
 function changed(){
  if(disposed)return;clearTimeout(timer);
  if(blocked){state('error',blocked);return;}
  state('pending');timer=setTimeout(()=>flush().catch(()=>{}),delay);
 }
 async function flush(){
  clearTimeout(timer);if(disposed)return;
  if(blocked)throw blocked;
  if(flight){await flight;return flush();}
  flight=(async()=>{
   while(!disposed){
    if(!ready())throw Error('Fotos werden vorbereitet. Bitte kurz warten.');
    const data=read(),snapshot=JSON.stringify(data);
    if(snapshot===saved){state('saved');return;}
    state('saving');await write(data);saved=snapshot;
    // Read again after the response, including changes made during the request.
   }
  })();
  try{await flight;}catch(error){if(error.status===409)blocked=error;state('error',error);throw error;}finally{flight=null;}
 }
 return {changed,flush,dispose(){disposed=true;clearTimeout(timer);}};
}
