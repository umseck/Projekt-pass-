# Projektpass Bad: Abnahmestand des MVP

Stand: 5. Oktober 2026. „Lokal geprüft“ bezeichnet automatisierte UI-/API-/SQL-
Tests und keine echte Kundenfreigabe. Die vollständige lokale Suite ist mit
**75 bestandenen Tests, 0 Fehlern** abgeschlossen. Produktionsmigration, vollständiger
Live-Ablauf und physische Smartphones sind hier nicht als bestanden markiert.

## Lokal ausgeführt

Der neue gezielte Testblock umfasst 25 bestandene Tests ohne Fehler:
`customer-backend.test.mjs`, `customer-ui.test.mjs`, `bath-export.test.mjs` und
`trial-harness.test.mjs`. Die gesamte Suite wird über `npm test` ausgeführt.

| Kriterium | Nachweis / Status |
| --- | --- |
| Vier Schritte, gerenderte Kundenansicht, explizite Freigabe | Lokaler DOM-Durchlauf im Trial bestanden. |
| Gemischtes Bad mit getrennten Flächen/Farben | Trial- und Modelltests bestanden. |
| Standards als Projektkopie ohne projektspezifische Daten | Modell-/Standardtests vorhanden; keine automatische Veränderung anderer Projekte. |
| Notwendige neue Metadaten, bewusste Lücken, gültige Daten | Neue API-/Validierungstests bestanden. |
| Kundenergänzung ändert Original nicht | API/SQL/Trial bestanden. |
| QR allein kann keine Ergänzung schreiben | Getrennte Projektion und Kundenrechte lokal bestanden. |
| Andere Kunden/Betriebe können fremde Projekte nicht verändern | Private Tabellenrechte, RPC- und Mandantentests bestanden. |
| Autor/Erfassungszeit sind serverseitig | API/SQL-Test bestanden; genannter Ausführender bleibt eigene Angabe. |
| Einladung adressgebunden, ablaufend und einmalig | API/SQL-Tests bestanden; unabhängige E-Mail-Verifikation nicht implementiert. |
| Verwalterwechsel entzieht alten Zugang und rotiert QR | SQL-Test einschließlich konkurrierender Annahme bestanden. |
| Übergebenes Projekt gewöhnlich nicht löschbar | API-/SQL-Schutz lokal bestanden. |
| Änderung der Oberfläche macht Pflege historisch | Kunden-UI-/Modelltests bestanden; Silikonwechsel getrennt behandelt. |
| PDF/ZIP/HTML, Anhänge und Dateiprüfsummen | Exporttests einschließlich Wiederöffnen der PDF und ZIP-Prüfung bestanden. |
| Öffentlicher Export enthält keine privaten Kundenergänzungen/Geheimnisse | Export-Whitelist-Test bestanden. |
| Fiktive Daten bleiben nach Neuladen erhalten | Trial bestanden; ausschließlich derselbe Browser-Tab. |

## Noch live bzw. manuell nachzuweisen

- [ ] Vollständige Live-Migrationshistorie/Baseline und Zielprojekt geprüft;
      neue Migration additiv angewandt, kein Reset.
- [ ] Cloudflare-Konfiguration/Preview-Zugriff, Origin, benötigte Bindings und
      ausschließlich serverseitige Secrets des konkreten Deployments geprüft.
- [ ] Unangemeldet: Dashboard/Entwurf verweigert; öffentlicher QR zeigt nur
      freigegebene technische Originalangaben.
- [ ] Zwei unabhängige Betriebs-/Kundenkonten: direkte fremde API-Aufrufe verweigert.
- [ ] Betriebslogin → Speichern → zweites Gerät → Freigabe → Scan durchlaufen.
- [ ] Kunde nimmt persönliche Einladung an und kann eine Wartung/Änderung mit
      Foto/PDF hinzufügen; Originalübergabe bleibt identisch.
- [ ] Verwalterwechsel: bisheriger Zugriff erst bei Annahme entzogen;
      alter QR verweigert, neuer QR lesbar; physische Karte ersetzt/neu beschrieben.
- [ ] iPhone und Android: 390-px-Ansicht, Touchflächen, Upload/Komprimierung,
      HEIC-Verhalten, PDF-Auswahl und Downloads real geprüft.
- [ ] Netzverlust/Versionskonflikt: keine falsche Erfolgsmeldung, Eingaben bleiben
      zur Wiederholung verfügbar, keine doppelte Ergänzung.
- [ ] ZIP/PDF/HTML tatsächlich heruntergeladen, ohne Netz geöffnet und
      archivierte Dateien vorhanden; externe Links als nicht archiviert sichtbar.
- [ ] API-Ratelimits, Auth-Einstellungen und Backup/Restore geprüft.
- [ ] Rechtstexte, Providervereinbarungen, Verantwortlichkeiten und ein
      gesonderter personenbezogener Löschprozess vor echtem Kundenbetrieb geklärt.
- [ ] Konkreter Deployment-Commit, erfolgreicher Check und ausgelieferte Dateien
      abgeglichen; keine Produktionsfreigabe aus bloßem Merge abgeleitet.

## Fiktive Vorschau prüfen

`/bath-preview.html`: gemischtes Beispiel vorbereiten → Schritt 4 → Flächen
bestätigen → Kundenansicht lesen → ausdrücklich freigeben → als Kunde ergänzen
→ exportieren → neu laden. Die QR-Leseansicht enthält weiterhin nur das Original.
Sie simuliert Rollen ohne echte Anmeldung und ist kein Zwei-Geräte-Nachweis.

Nicht Bestandteil dieser Abnahme: KI, Chat, Baustellenmitteilungen,
Aufgabenverwaltung, Originalberichtigungen, Offlinebearbeitung oder eine
Bescheinigung fachgerechter/mängelfreier Ausführung.

## Einzeldatei und Bereitstellung

- Die tatsächliche Datei `public/Projektpass-MVP-Test.html` wurde in einem zusätzlichen DOM-Test vom ersten Bad bis Übergabe, Kundenergänzung und Export ausgeführt. Eingebetteter Katalog, fehlende externe Assets und verweigerte Live-Verbindungen geprüft.
- Die gesamte lokale Suite einschließlich dieses Tests: **75 bestanden, 0 Fehler**.
- Cloudflare-Branch-Vorschau verlangt Cloudflare Access. Keine Online-Oberflächenabnahme aus einem erfolgreichen Login/Deployment abgeleitet. Die direkt öffnbare Datei ersetzt keinen physischen Smartphone- oder Live-Auth-Test.
- Implementierung als separater Draft-PR #6. Kein Merge nach main, keine produktive Migration, keine echten Konten angelegt.
