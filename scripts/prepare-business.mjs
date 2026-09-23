// Creates a reviewable setup file, NEVER connects to or modifies a database.
// node scripts/prepare-business.mjs <auth-user-uuid> <https://domain> <profile.json>
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,extname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {uuid,company} from '../server/validation.mjs';
import {randomToken} from '../server/api.mjs';
const [userId,origin,profilePath]=process.argv.slice(2);
if(!userId||!origin||!profilePath)throw Error('Benötigt: Auth-User-ID, HTTPS-Domain und Betriebsprofil als JSON.');
uuid(userId);const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password)throw Error('Bitte eine reine HTTPS-Origin ohne Pfad verwenden.');
const profileFile=resolve(profilePath);
const rawProfile=JSON.parse(await readFile(profileFile,'utf8'));
if(rawProfile.logo_file){
 const logoPath=resolve(dirname(profileFile),rawProfile.logo_file);
 const bytes=await readFile(logoPath);
 const extension=extname(logoPath).toLowerCase();
 const mime=extension==='.png'?'image/png':extension==='.jpg'||extension==='.jpeg'?'image/jpeg':'';
 if(!mime)throw Error('Das Betriebslogo muss eine PNG- oder JPEG-Datei sein.');
 rawProfile.logo=`data:${mime};base64,${bytes.toString('base64')}`;
 delete rawProfile.logo_file;
}
const profile=company(rawProfile);
const companyId=randomUUID(),passes=Array.from({length:20},(_,i)=>({id:randomUUID(),number:i+1,token:randomToken()}));
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const sql=`-- Only run in the NEW PROJEKTPASS project after schema.sql.\n-- No real customer data. Auth user must already exist.\nbegin;\ndo $$ begin\n if not exists(select 1 from auth.users where id=${quote(userId)}::uuid) then raise exception 'Betriebszugang fehlt'; end if;\nend $$;\ninsert into pp_private.companies(id,profile) values (${quote(companyId)},${quote(JSON.stringify(profile))}::jsonb);\ninsert into pp_private.members(user_id,company_id) values(${quote(userId)},${quote(companyId)});\ninsert into pp_private.passes(id,company_id,number,token) values\n${passes.map(p=>`(${quote(p.id)},${quote(companyId)},${p.number},${quote(p.token)})`).join(',\n')};\ncommit;\n`;
const directory=resolve('generated',companyId);await mkdir(directory,{recursive:true,mode:0o700});
await writeFile(resolve(directory,'business.sql'),sql,{mode:0o600});
await writeFile(resolve(directory,'nfc-links.csv'),'Nummer,Pass-ID,NFC-Link\n'+passes.map(p=>`${String(p.number).padStart(2,'0')},${p.id},${origin}/#p/${p.token}`).join('\n')+'\n',{mode:0o600});
console.log('Vorbereitung erstellt: '+directory+'\nSQL prüfen; NFC-Links nur an den Kartenhersteller geben. Nichts wurde online angelegt.');
