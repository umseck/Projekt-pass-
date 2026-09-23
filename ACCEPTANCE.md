# Pilotabnahme – erst mit den echten Konten abhaken

## Ein Bad in 60–90 Sekunden
- [ ] Auf Smartphone A als Betrieb anmelden, Pass 07, Titel „Bad Maier“.
- [ ] Fliese/Fuge/Silikon aus den echten Favoriten wählen; keine Fotos/Unterlagen.
- [ ] Speichern, Kundenvorschau, übergeben. Dauer messen; Ziel maximal 90 Sekunden.
- [ ] Auf Smartphone B ohne Login denselben NFC-Link öffnen. Name, Betrieb, Material, Pflege, Hilfe verständlich.
- [ ] Keine leeren Bild-, Unterlagen- oder Ersatzmaterialbereiche.

## Vollständiges Beispiel
- [ ] Fotos, Etikett, Lagerort, Nutzungstermin, Pflege, Unterlagenlink ergänzen.
- [ ] Auf 390 px und auf iPhone/Android prüfen: keine horizontale Scrollleiste, bedienbare Inputs/Touchflächen.
- [ ] Foto-Galerie, HEIC/JPEG-Verhalten und Komprimierung prüfen; keine EXIF-Standortdaten im Ergebnis.
- [ ] Seite neu laden, anderes Gerät öffnen: identischer gespeicherter Stand.
- [ ] Export herunterladen und offline prüfen: Fotos vorhanden, interne Kundendaten fehlen.

## Berechtigungen und Fehlerfälle
- [ ] Unangemeldeter Nutzer kann weder Dashboard noch Projektentwurf lesen.
- [ ] Zweiter Testbetrieb kann Projekte des ersten weder sehen noch ändern (auch direkte API-Aufrufe).
- [ ] Kundenansicht/Export enthält keine interne Adresse, Kundennamenfelder, Sitzung oder Ergänzungsschlüssel.
- [ ] Kunde ergänzt Sanitär mit separatem Schlüssel, bearbeitet/löscht nur eigene Angaben.
- [ ] Mit bloßem Scan-Token keine Änderungen möglich; alter Ergänzungsschlüssel nach Rotation unwirksam.
- [ ] Kundenlink sperren: Smartphone B kann auch nach Neuladen nichts mehr abrufen.
- [ ] Zwei Bearbeiter: alter Stand wird abgelehnt, Eingaben bleiben sichtbar.
- [ ] Netz trennen beim Speichern: keine Erfolgsmeldung, kein falscher Übergabestatus, Wiederholung möglich.
- [ ] Projekt löschen: Kundenlink ungültig, physischer Pass bleibt stillgelegt.
- [ ] Cross-Origin-Aufruf abgewiesen; keine Browser-Schlüssel, kein öffentlicher Tabellenzugriff.
- [ ] Serviceanfrage: E-Mail-Entwurf mit Kontext, Foto dort anhängen, tatsächlichen Empfang selbst prüfen.

## Betrieb
- [ ] Domain und 20 physische NFC/QR-Links stabil und korrekt zugeordnet.
- [ ] Datenschutzhinweise, Impressum, Provider-Vereinbarungen und Zuständigkeiten geklärt.
- [ ] Zugänge/Quellcode im Konto des Nutzers, Wiederherstellung getestet, Verlust einer Karte bedacht.
- [ ] Ansprechpartner für Pilotfeedback; erst drei Bäder, danach gemeinsam nachschärfen.
