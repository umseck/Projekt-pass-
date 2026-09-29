import {mkdir,open,readFile,rename,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {HttpError,company as cleanCompany} from './validation.mjs';
export {createTestService,cleanInput,customerProject} from './private-test-service.mjs';
export class FileStore{
 constructor(dir){this.dir=dir;this.tail=Promise.resolve();}
 async init(){await mkdir(this.dir,{recursive:true,mode:0o700});await chmod(this.dir,0o700);}
 async read(){try{return JSON.parse(await readFile(join(this.dir,'state.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return {schema:1,projects:{},inputs:{},requests:[],audit:[],company:cleanCompany({name:'Eigener Entwicklungstest',email:'test@example.invalid',trade:'seamless',standards:{},favorites:{}}),company_version:1};}}
 async transaction(fn){const previous=this.tail;let release;this.tail=new Promise(r=>release=r);await previous;
  try{const state=await this.read(),result=await fn(state),encoded=JSON.stringify(state);if(Buffer.byteLength(encoded)>80000000)throw new HttpError(413,'Der private Testspeicher ist voll (80 MB). Originaldatei bitte lokal aufbewahren.');
   const temp=join(this.dir,randomUUID()+'.tmp'),file=await open(temp,'wx',0o600);try{await file.writeFile(encoded);await file.sync();}finally{await file.close();}await rename(temp,join(this.dir,'state.json'));return result;
  }finally{release();}}
}
