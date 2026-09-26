import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {company} from '../server/validation.mjs';
test('standards copy only reusable data, stay private, isolate trades and never rewrite existing projects',async()=>{
 const db=new PGlite();
 try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(await readFile(new URL('../database/schema.sql',import.meta.url),'utf8'));
 // Applying the upgrade to an existing installation is repeatable and keeps permissions.
 await db.exec(await readFile(new URL('../database/standards.sql',import.meta.url),'utf8'));
 const actor='11111111-1111-4111-8111-111111111111',cid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const profile=company({name:'Test',trade:'seamless',standards:{seamless:{surface:{manufacturer:'EPI',name:'Quartz R',color:'Projektfarbe',batch:'Geheim',label_photo:''},waterproofing:{manufacturer:'PCI',name:'Seccoral 1K'},photos:['private'],internal:{customer:'private'},documents:[{name:'Produktblatt',type:'Unterlage',url:'https://example.test/tm.pdf'}]}}});
 assert.equal(profile.standards.seamless.surface.color,'');assert.equal(profile.standards.seamless.surface.batch,'');assert.equal(profile.standards.seamless.photos,undefined);assert.equal(profile.standards.seamless.internal,undefined);
 await db.query('insert into pp_private.companies(id,profile) values($1,$2)',[cid,JSON.stringify(profile)]);
 await db.query('insert into pp_private.members(user_id,company_id) values($1,$2)',[actor,cid]);
 const passes=[];for(let n=1;n<=3;n++)passes.push((await db.query('insert into pp_private.passes(company_id,number,token) values($1,$2,$3) returning id,token',[cid,n,String(n).repeat(64)])).rows[0]);
 const rpc=async(op,args={})=>(await db.query('select public.pp_api($1,$2::uuid,$3::jsonb) result',[op,actor,JSON.stringify(args)])).rows[0].result;
 const p=await rpc('activate',{pass_id:passes[0].id,title:'Erstes Bad'});
 assert.equal(p.content.surface.name,'Quartz R');assert.equal(p.content.waterproofing.name,'Seccoral 1K');assert.equal(p.content.documents.length,1);
 profile.standards.seamless.surface.name='Anderes Produkt';
 await rpc('company_save',{profile,version:1});
 assert.equal((await rpc('activate',{pass_id:passes[0].id,title:'Retry'})).content.surface.name,'Quartz R');
 const next=await rpc('activate',{pass_id:passes[1].id,title:'Zweites Bad'});assert.equal(next.content.surface.name,'Anderes Produkt');
 await rpc('handover',{id:p.id,version:p.version});
 const customer=await rpc('scan',{token:passes[0].token});assert.equal(customer.company.standards,undefined);assert.equal(customer.content.surface.name,'Quartz R');
 profile.trade='tile';await rpc('company_save',{profile,version:2});
 const tile=await rpc('activate',{pass_id:passes[2].id,title:'Fliesen'});assert.equal(tile.content.trade,'tile');assert.equal(tile.content.surface,undefined);
 await db.exec('set role anon');await assert.rejects(()=>rpc('bootstrap'),/permission denied/);
 }finally{await db.close();}
});
