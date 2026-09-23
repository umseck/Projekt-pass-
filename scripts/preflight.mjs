import {readFile,access} from 'node:fs/promises';
const blockers=[];let config;
try{config=JSON.parse(await readFile('launch.local.json','utf8'));}catch{blockers.push('launch.local.json mit bestätigten Einrichtungsdaten fehlt.');}
for(const file of ['public/datenschutz.html','public/impressum.html']){try{await access(file);}catch{blockers.push(file+' fehlt.');}}
if(config){
 for(const key of ['dedicatedSupabaseProject','schemaApplied','authSignupDisabled','businessProvisioned','rateLimitsConfigured','legalTextsReviewed','providerAgreementsReviewed','backupRestoreTested','twoDeviceTested','mobile390Tested'])if(config[key]!==true)blockers.push(key+' ist nicht bestätigt.');
 if(config.region!=='eu-central-1')blockers.push('Dedizierte Region Frankfurt (eu-central-1) bestätigen.');
 if(!/^https:\/\/[^/]+$/.test(config.origin||''))blockers.push('Feste HTTPS-Domain fehlt.');
}
if(blockers.length){console.error('Noch nicht für echte Kundendaten freigegeben:\n'+blockers.map(s=>'• '+s).join('\n'));process.exitCode=1;}else console.log('Einrichtung bestätigt. Vor Veröffentlichung Zielprojekt und Domain nochmals vergleichen.');
