"""Small explicit read-only production probe. No login, real IDs, writes or crawling."""
import urllib.request,urllib.error,hashlib,json,time,datetime,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'qa/evidence';OUT.mkdir(parents=True,exist_ok=True)
base='https://projekt-pass.pages.dev';old='da381977eed81ae4d808ac852df11b85f9be6471'
report={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base_commit':old,'read_only':True,'files':[]}
for name in ['index.html','app.mjs','bath-model.mjs','bath-customer.mjs']:
 start=time.monotonic()
 try:
  req=urllib.request.Request(base+'/'+name,headers={'User-Agent':'Projektpass-authorized-QA-readonly/1'})
  with urllib.request.urlopen(req,timeout=20) as response:
   data=response.read(2000000);item={'path':'/'+name,'status':response.status,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'content_type':response.headers.get('Content-Type'),'elapsed_seconds':round(time.monotonic()-start,3)}
  try:previous=subprocess.check_output(['git','show',old+':public/'+name],cwd=ROOT,stderr=subprocess.DEVNULL);item['matches_base_commit']=hashlib.sha256(previous).hexdigest()==item['sha256']
  except subprocess.CalledProcessError:item['matches_base_commit']=None
  report['files'].append(item)
 except Exception as error:report['files'].append({'path':'/'+name,'error':str(error)[:200]})
req=urllib.request.Request(base+'/api/project',method='POST',headers={'Content-Type':'application/json','Origin':base,'User-Agent':'Projektpass-authorized-QA-readonly/1'},data=json.dumps({'id':'11111111-1111-4111-8111-111111111111'}).encode())
try:
 with urllib.request.urlopen(req,timeout=20) as response:report['anonymous_project']={'status':response.status,'unexpected_success':True}
except urllib.error.HTTPError as error:report['anonymous_project']={'status':error.code,'denied':error.code in [401,403],'cache_control':error.headers.get('Cache-Control')}
except Exception as error:report['anonymous_project']={'error':str(error)[:200]}
(OUT/'live-readonly.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
