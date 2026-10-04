"""Generate six explicitly fictitious JPEG fixtures, never evidence of actual work."""
from PIL import Image, ImageDraw
from pathlib import Path
from io import BytesIO
import json,base64
root=Path(__file__).resolve().parents[2]
photos=[]
for i in range(6):
 image=Image.new('RGB',(640,400),'#ece7d7');draw=ImageDraw.Draw(image)
 draw.rectangle((28,28,612,372),outline='#6e7555',width=3)
 draw.text((48,65),'PROJEKTPASS BAD / TEST '+str(i+1),fill='#343d30')
 draw.text((48,125),'FIKTIVES MUSTERFOTO - KEINE REALE BAUSTELLE',fill='#343d30')
 draw.text((48,270),'Nur zum Testen der Fotozuordnung und des Exports.',fill='#343d30')
 draw.text((48,305),'Kein Ausfuehrungsnachweis und keine Pflegeempfehlung.',fill='#343d30')
 f=BytesIO();image.save(f,format='JPEG',quality=80,optimize=True)
 photos.append('data:image/jpeg;base64,'+base64.b64encode(f.getvalue()).decode('ascii'))
(root/'public/bad/test-assets.json').write_text(json.dumps({'photos':photos},separators=(',',':'))+'\n')
