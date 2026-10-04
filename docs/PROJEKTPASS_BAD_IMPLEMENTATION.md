# Projektpass Bad — Implementierungsstand 04.10.2026

## Geprüfter Bestand

Ausgangspunkt: main `da381977eed81ae4d808ac852df11b85f9be6471` im bestehenden Repository umseck/Projekt-pass-. Beibehalten: Vanilla-ES-Module, Cloudflare-Pages-Functions, Supabase/private-schema/RPC, bestehende Authentifizierung, Cookie-/Origin-Schutz, Passkennungen, Betriebsprofile, Autosave-Warteschlange, Foto-Komprimierung, bestehende historische Übergaben und die bisherigen Regressionstests. Der neue Editor wird über die vorhandene #bath-Route geöffnet. Die alte #edit-Route bleibt für historische Abläufe erhalten. Die bestehende bath-preview.html wurde nicht überschrieben; bad-preview.html enthält die neue isolierte Vorschau.

Das ausdrücklich genannte Dokument Projektpass_Funktionskonzept_2026-10-03.html wurde im Repository nicht gefunden. Der detaillierte Arbeitsauftrag und die tatsächlich verfügbare Bad-Vorschau wurden als Grundlage verwendet; keine Behauptung, dieses fehlende Dokument gelesen zu haben.

## Implementiert

- Vier Schritte: Auftrag/Flächen, Standard vorauswählen, tatsächlich verwendete Materialien/Nachweise, Prüfung und ausdrückliche Kundenfreigabe.
- Getrennte flächen- und abschnittsbezogene Leistungsumfänge, Materialverwendungen, Varianten/Farben, Dokumentfassungen/-zuordnungen, Pflege, Wartungsregeln, Fotos und interne Notizen im versionierten Aggregate.
- Standards enthalten keine Kunden, Auftragsfarben, Chargen, Fotos oder Verwendungsbestätigungen. Fremdleistungen werden nicht mit Standardprodukten überschrieben.
- Tatsächliche Materialbestätigung und gezielte Abhängigkeiten statt pauschaler Flächenampel. Änderung einer Versiegelung öffnet nur ihre Bezüge. Farbänderung betrifft keine unabhängig produktgebundene Pflege.
- Pflegetexte stammen ausschließlich aus bewusst zugeordneten Quellen/Betriebshinweisen. Schlussoberfläche und genaue Variante müssen bestätigt sein; keine Text-KI oder Systemkompatibilitätsprüfung.
- Unveränderliche, versionierte Kunden-Snapshots mit expliziter öffentlicher Feldliste, datierten Bestätigungen, kopierten Produktdaten und kopierten Dateibytes/Metadaten/SHA-256.
- Berichtigung mit unverändertem Ausführungsdatum; spätere Arbeit als eigener datierter Teilbereich, keine Überschreibung ursprünglicher Verwendungen oder Leistungsumfänge. Unklarer Reparaturbereich und fehlende Pflege für spätere Abschnitte werden sichtbar.
- Separate, 14 Tage gültige und widerrufbare Mitarbeiterlinks: nur zugeordnete Flächen/Abschnitte, private Foto-/Abweichungs-/Notizbeiträge. Keine Kunden-, Betriebsstandard- oder Freigaberechte.
- Hochwertige helle/olivfarbene Kundenmappe, genaue Quellen, drei getrennte Qualitätsaussagen, ehrliche Foto-/Dokument-/Pflegelücken, Restmaterial und ausführender Betrieb.
- Bewusst geprüfte Kontaktanfrage mit gewählter Fläche/Fassung an den ausführenden Betrieb. Öffnet erst nach Zustimmung einen E-Mail-Entwurf; kein automatischer Versand.
- Echte PDF-Datei plus ZIP mit offlinefähigem HTML, strukturierten Daten, PDF, allen freigegebenen archivierten Dateien und SHA-256-Manifest. Externe Links werden nicht als archivierte Originale ausgegeben.
- 28 aktuell offiziell verifizierte Produktbezeichnungen in bearbeitbarer JSON-Stammdatenbasis; separate Farb- und Artikelvarianten, Quellenstatus/Prüfdatum/Dokumentdatum. Sieben noch ungeklärte Wunschgruppen außerhalb der wählbaren Produktliste.

## Migration / Deployment

`database/bad_v2.sql` ist eine additive Transaktionsmigration. Voraussetzung: bisherige schema-/workflow-/operator-Installation. Sie ergänzt fünf private Tabellen, Indizes, RLS, unveränderliche Freigaben und die service-role-exklusive RPC `pp_bad`. Keine bestehende Projektzeile, kein bestehender Snapshot und kein alter Projektstatus wird umgeschrieben. Fünf Tabellen: bad_drafts, bad_releases, bad_standards, bad_staff_links, bad_contributions. Die Domänenentitäten sind ausdrücklich getrennte Arrays im Entwurfs-/Snapshot-Aggregat, keine vollständig normalisierte relationale Tabelle pro Entität.

Vor Produktivumschaltung: Datenbank-Backup/Export sichern; Migration anwenden; Schema-Cache aktualisieren; anschließend den getesteten App-Commit veröffentlichen. Ohne Migration können neue API-Routen nicht verwendet werden. Ein bloßes Bereitstellen der isolierten Vorschau migriert keine Daten. Bestehende Projekte werden beim Öffnen als unbestätigte Vorauswahl übernommen. Alte öffentliche Übergaben bleiben im bisherigen Lesepfad und werden nicht nachträglich fachlich aufgewertet. Vorhandene nicht flächenzugeordnete Dateien müssen vom Betrieb bewusst neu zugeordnet werden.

Rollback: Frontend/Functions auf vorherigen Commit zurücksetzen, additive Tabellen beibehalten. Keine Freigabetabellen löschen oder zurückmigrieren. Die ursprüngliche freeze_handover-Logik bleibt unverändert. Neue Freigaben werden über eine additive Statusübersicht angezeigt statt durch Änderung des alten Projektstatus.

## Testnachweise

Lokal tatsächlich ausgeführt: 64 Node-Tests, alle erfolgreich; davon 16 neue Bad-Fach-/SQL-Integrationstests auf isoliertem PGlite/PostgreSQL. Die vorhandenen UI-Tests behalten ihre Assertions und laden zusätzlich die neue Migration/RPC im Testadapter. Kein Produktivkonto wurde für Tests verändert.

Alle drei Beispiele durchlaufen SQL-Speicherung, Bestätigung, Veröffentlichung, öffentlichen Abruf und echte Dateierzeugung. Geprüft: geplante Produkte, Fremdleistung, unbekannte Varianten, selektive Invalidierung, private Daten, RLS/Mitarbeiterrechte, Idempotenz, konkurrierendes Speichern, unveränderliche alte Stände, Teilreparatur, Zustimmung zur Anfrage, beschädigte Prüfsumme und Legacy-Migration.

Die erzeugten ZIP-Dateien wurden unabhängig geöffnet; archivierte Bytes, Größen und SHA-256 wurden abgeglichen. PDF-Titelseite und statische Kundenansicht wurden gerendert. 390/1440-Pixel-Layout ohne horizontalen Überlauf in der statischen Darstellung. Browserinteraktion und echtes file://-Öffnen sind zusätzlich als `scripts/bad/browser-check.py` implementiert; ein erfolgreicher Test darf erst anhand des erzeugten `qa/bad/browser/report.json` behauptet werden. In der lokalen Arbeitsumgebung blockiert eine Browserrichtlinie URL-Navigation; daraus wird kein bestandener Klicktest abgeleitet.

Alle Beispieldaten, Fotos, Prüfversiegelungen, Betriebshinweise und archivierten Test-PDFs sind klar als fiktiv gekennzeichnet. Keine reale Baustellendokumentation, keine Herstellerfreigabe und keine nutzbare Pflegeempfehlung.

## Verifizierte Hersteller / Grenzen

Wählbare Produkte: PCI (11), Sopro (5), ARDEX (5), OTTO (3), Lamurista (2), EPI (2). Quellen stehen vollständig in public/bad/catalog.json. „No.1 400“ heißt auf der geprüften aktuellen Sopro-Seite „super light“; kein stilles Gleichsetzen mit historischen Gebinden. Lamurista führt „HardRock ULTRA 2K“. ARDEX-Abdichtung als „S 7 PLUS W“, nicht pauschal alte S-7-Fassung. EPI Quartz R wird nicht automatisch mit einem angenommenen Corestone-Sealer kombiniert.

28 Hersteller-Produktseiten nur verlinkt. Null Hersteller-Originaldateien archiviert; keine ungeprüften PDF-Versionen als geprüft markiert. Farben sind nur für einzeln verifizierte Listen vollständig übernommen; sonst ausdrücklich teilweise oder nicht verifiziert. 32 bekannte Artikel-/Gebindevarianten als getrennte Datensätze, davon 30 Sopro-SSI-Farbartikel. OTTO-Farben/Artikel noch offen. Technische Merkblätter, konkrete Schlussversiegelungen und passende Pflegequellen müssen vor realen Übergaben ergänzt und bestätigt werden.

Weitere bewusste Pilotgrenzen:

- Maximal 12 komprimierte JPEG-Fotos, 1 MB pro PDF und bestehendes 6-MB-API-Limit; Dateibytes liegen im Snapshot, noch kein skalierbarer Object-Storage.
- Erinnerungsstatus/Verschieben/Deaktivieren gilt lokal im Browser. Keine geräteübergreifende Synchronisierung, automatische E-Mail- oder Push-Erinnerung. „Erledigt“ ersetzt keinen vom Betrieb dokumentierten Wartungsabschnitt.
- Anfragen werden als E-Mail-Entwurf vorbereitet, nicht als Nachrichtendienst/CRM gespeichert. Kunde entscheidet über den Versand im Mailprogramm.
- Standards speichern Produkte/Rollen/erwartete Fotos. Eine vollständig portable Bibliothek mit bestätigten Dokument-/Pflege-/Wartungsvorlagen und eine Stammdaten-Verwaltungsoberfläche sind noch nicht fertig.
- Kunde, Objekt und Raum sind derzeit Projektmetadaten, keine unabhängigen, wiederverwendbaren Datensätze. Keine weitergehenden Gewerke sichtbar.
- PDF nutzt Standardfonts und westeuropäische Zeichencodierung; keine PDF/A-Zertifizierung, keine vollständige Unicode-/Tagged-PDF-Unterstützung. HTML/JSON behalten Unicode vollständig.
- Kein Virenscanner, keine automatische technische Bewertung hochgeladener PDFs; Größen-/Typ-/Struktur-/Prüfsummenprüfung ist keine Malwarefreigabe.
- Mitarbeiterlinks sind eng begrenzte Bearer-Links, keine vollständige personenbezogene Mitarbeiter-Kontenverwaltung. Original-Link wird für erneutes Öffnen benötigt.
- Kein Nachweis auf echten iOS-/Android-Geräten; Chromium-Emulation ist getrennt zu benennen.

Dieser Stand ist eine substanzielle, prüfbare Implementierung im bestehenden Projekt, aber keine Behauptung, dass sämtliche Anforderungen produktionsfertig und sämtliche Herstellerunterlagen vollständig abgedeckt seien.
