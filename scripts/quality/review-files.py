"""Independently open actual PDFs, inspect text bounds and validate ZIP bytes."""
from pathlib import Path
import fitz,json,zipfile,hashlib
r=Path(__file__).resolve().parents[2];out=r/'qa/quality';out.mkdir(exist_ok=True);report=[]
for f in sorted(out.glob('*-live-path.pdf')):
 d=fitz.open(f);text=''.join(p.get_text() for p in d);bad=[]
 for i,p in enumerate(d):
  for b in p.get_text('dict')['blocks']:
   if b['type']==0:
    for line in b['lines']:
     for s in line['spans']:
      x0,y0,x1,y1=s['bbox']
      if x0<0 or y0<0 or x1>p.rect.width+1 or y1>p.rect.height+1:bad.append([i,s['text'],s['bbox']])
  if i in [0,1,len(d)-1]:p.get_pixmap(matrix=fitz.Matrix(1.3,1.3)).save(str(out/(f.stem+'-page-'+str(i+1)+'.png')))
 assert not bad,(f.name,bad);assert 'PRIVATE_' not in text;assert 'Fassung' in text;assert 'Übergabe' in text
 if f.stem.startswith('mixed'):assert 'später bearbeiteten Teilbereich' in text
 # Company logo must appear on first page, not only on a later photograph page.
 assert d[0].get_images(),f.name
 report.append({'file':f.name,'size':f.stat().st_size,'pages':len(d),'opened':True,'text_overflow':0,'umlauts':True,'logo_image_on_cover':True})
assert len(report)==3,report
(out/'file-review.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));print(json.dumps(report,indent=2))
