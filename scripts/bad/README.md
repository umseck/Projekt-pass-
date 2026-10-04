# Reproduzierbare Bad-Abnahme

1. `npm ci --ignore-scripts`
2. `python scripts/bad/generate-test-assets.py` (Pillow; synthetische JPEG-Fixtures)
3. `npm test` (inklusive PGlite/SQL- und Altbestandsregression)
4. `python -m pip install playwright==1.55.0`
5. `python -m playwright install --with-deps chromium`
6. `python scripts/bad/browser-check.py`

Ergebnisse unter qa/bad/. Keine Produktivdaten, keine Nachrichten, keine realen Pflegeanweisungen. Veröffentlichen erst nach Sichtprüfung der erzeugten Screenshots und Testberichte. Die Datenbankmigration ist ein separater autorisierter Schritt.
