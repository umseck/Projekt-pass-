"""Independently open actual browser downloads, validate bytes/text/images and render every PDF page."""
from pathlib import Path
import json,hashlib,zipfile
import fitz
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'qa/browser';report=[]
for kind in ['seamless','tile','mixed']:
 path=OUT/(kind+'.pdf');doc=fitz.open(path);assert len(doc)>0 and not doc.is_encrypted
 text='\n'.join(p.get_text() for p in doc)
 for term in ['ÄÖÜ äöü ß','TEST '+kind,'FIKTIVER TESTHINWEIS','test@example.test','Übergabestand']:
  assert term in text,(kind,term)
 assert 'PRIVATE_FILENAME_SENTINEL' not in text
 if kind=='mixed':assert 'Vorher: Foto fehlt.' in text and 'anderen Betrieb' in text
 images=0;thumbnails=[]
 for i,page in enumerate(doc):
  images+=len(page.get_images())
  for block in page.get_text('dict')['blocks']:
   if block['type']!=0:continue
   for line in block['lines']:
    for span in line['spans']:
     rect=fitz.Rect(span['bbox']);assert rect.x0>=0 and rect.y0>=0 and rect.x1<=page.rect.width+1 and rect.y1<=page.rect.height+1,(kind,i,span['text'],span['bbox'])
  pix=page.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);png=OUT/f'{kind}-pdf-page-{i+1}.png';pix.save(png)
  im=Image.open(png);im.thumbnail((300,430));thumb=Image.new('RGB',(320,458),'white');thumb.paste(im,((320-im.width)//2,20));ImageDraw.Draw(thumb).text((10,438),f'{kind} / Seite {i+1}',fill='black');thumbnails.append(thumb)
 assert images>=7,(kind,'6 photos and logo expected',images)
 rows=(len(thumbnails)+2)//3;sheet=Image.new('RGB',(960,rows*458),'#e7e7e7')
 for i,im in enumerate(thumbnails):sheet.paste(im,((i%3)*320,(i//3)*458))
 sheet.save(OUT/(kind+'-pdf-contact-sheet.png'))
 with zipfile.ZipFile(OUT/(kind+'.zip')) as z:
  assert z.testzip() is None
  pdfs=[]
  for name in z.namelist():
   if name.endswith('.pdf'):
    sub=fitz.open(stream=z.read(name),filetype='pdf');assert len(sub)>0;pdfs.append({'path':name,'pages':len(sub)});sub.close()
 report.append({'case':kind,'pages':len(doc),'image_objects':images,'umlauts_readable':True,'text_inside_page':True,'private_sentinel_absent':True,'all_package_pdfs_opened':pdfs,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()});doc.close()
(OUT/'file-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
