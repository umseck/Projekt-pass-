"""Reproducible self-contained trial, with the actual MVP modules and catalog."""
from pathlib import Path
import subprocess,tempfile
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='projektpass-trial-') as temporary:
 bundle=Path(temporary)/'trial.js'
 subprocess.run(['npm','exec','--yes','--package=esbuild@0.25.10','--','esbuild','scripts/offline-trial-entry.mjs','--bundle','--format=iife','--target=es2022','--minify',f'--outfile={bundle}'],cwd=root,check=True)
 html=(root/'public/bath-preview.html').read_text().replace(' data-projectpass-trial="true"','')
 for css in ['style.css','card-theme.css','bath.css','customer-continuation.css']:
  html=html.replace(f'<link rel="stylesheet" href="/{css}">','<style>'+ (root/'public'/css).read_text()+'</style>')
 html=html.replace('<script type="module" src="/bath-preview.mjs"></script>','<script>'+bundle.read_text().replace('</script','<\\/script')+'</script>')
 html=html.replace('PROJEKTPASS · MVP ausprobieren','PROJEKTPASS · MVP offline ausprobieren')
 html=html.replace('Isolierte Testansicht ohne echtes Konto','Direkt öffnbare Offline-Testdatei ohne echtes Konto')
 html=html.replace('Bitte ausschließlich fiktive Angaben','Die QR-Rollenansicht wird in dieser Datei simuliert; sie ist kein NFC-/Zwei-Geräte-Test. Bitte ausschließlich fiktive Angaben')
 licenses='\n\n'.join((root/path).read_text() for path in ['public/vendor/pdf-lib/LICENSE.md','public/vendor/qrcode-LICENSE.txt'])
 html=html.replace('</head>','<!-- Third-party licenses: pdf-lib 1.17.1; qrcode-generator 2.0.4\n'+licenses.replace('--','—')+'\n--></head>')
 target=root/'public/Projektpass-MVP-Test.html'
 target.write_text(html)
 print(f'{target}: {target.stat().st_size} Bytes')
