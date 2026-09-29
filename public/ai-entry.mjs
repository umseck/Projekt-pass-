// Keep the entry visible even when the capability check fails. Authorization stays on the server.
export function attachAIEntry(id,{root,isCurrent=()=>true,fetcher=fetch}){
 if(!root||!isCurrent())return;
 const box=document.createElement('section');box.className='project-capture';box.setAttribute('aria-label','KI-Eingabe');
 const link=document.createElement('a');link.className='btn olive wide';link.href='#ai/'+id;link.textContent='Foto, Sprachnotiz oder Nachricht hinzufügen …';
 const state=document.createElement('p');state.className='hint';state.setAttribute('role','status');state.textContent='KI-Zugang wird geprüft …';box.append(link,state);
 root.prepend(box);
 const check=async()=>{
  try{
   const response=await fetcher('/api/ai/capability',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(12000)});
   if(!isCurrent()||!box.isConnected)return;
   if(response.ok){state.textContent='KI schlägt vor. Du prüfst und übernimmst.';return;}
   state.textContent=response.status===401?'Sitzung abgelaufen. Bitte erneut anmelden.':response.status===403?'KI ist für dieses Konto nicht freigeschaltet. Materialien kannst du unten manuell eintragen.':'KI-Zugang derzeit nicht erreichbar. Eingabe öffnen, um den Status zu prüfen.';
  }catch{if(isCurrent()&&box.isConnected)state.textContent='Verbindung zur KI konnte nicht geprüft werden. Eingabe öffnen und erneut versuchen.';}
 };
 void check();return box;
}
