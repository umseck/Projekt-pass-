# Projektpass – flächenbezogene Bad-Übergabe, Pilot 28.09.2026

## Ergebnis und Abgrenzung

**USP-Hypothese:** „Der Fachbetrieb bestätigt den tatsächlichen Aufbau jeder Badfläche einmal; der Kunde findet dazu passende, belegte Pflegeantworten und kann genau diese Informationen für spätere Arbeiten weitergeben.“

Das ist eine überprüfbare Spezialisierung, keine nachgewiesene Alleinstellung. Die technische Fassung ist eine isolierte Pilotänderung auf `feature/bath-service-pilot`, nicht auf `main`. Keine Änderung an produktiven Datenbanken, Kundenzugängen oder anderen Projekten.

Vorschau: `/bath-preview.html` auf der Branch-Bereitstellung. Nur fiktive Testdaten im Arbeitsspeicher, keine Anmeldung, kein Versand, kein Datenbankzugriff. Neuladen setzt sie zurück. Das Beispiel enthält ausdrücklich keine echte Pflegeempfehlung.

Der echte Editor ist über `#bath/<projekt-id>` angeschlossen; bestehende Anmeldung, Mandantenprüfung, versionierte Speicherung und Übergabe-RPC bleiben erhalten. Auf einer getrennt konfigurierten Testumgebung kann er echte Testprojekte speichern. Preview darf **keine** Produktions-Supabase-Schlüssel verwenden. Die öffentliche Vorschau benötigt diese nicht.

## 1. Bestandskritik

Geprüfte Ausgangsbasis: Commit `670658b1838d8a363e4a755c4817e43636c2c199`. Bereits vorhanden waren Standardaufbauten, Favoriten, automatische Speicherung, Produktunterlagen, geführte Bearbeitung, Übergabeprüfung, gesicherte Übergabe, Baukommunikation, QR/NFC-Zugang, Checkheft, Mailto-Hilfe und JSON-/Druckexport. Diese sind keine neuen Erfindungen.

Lücken: ein globales Produktschema statt konkreter Flächen; allgemeine Pflegehinweise ohne sichere Bindung an den aktuellen Aufbau; nur einfache Mailvorbereitung; externe Dokumentlinks nicht offline gesichert. Der alte Fliesenstandard enthielt weder Fliesenkleber noch Abdichtung. Die alte Handwerkeroberfläche bleibt für Altprojekte vorhanden. Projekte mit dem neuen Flächenschema werden beim Bearbeiten in den neuen Editor gelenkt.

Livegrenze: Produktivcode wurde mit dem Git-Stand abgeglichen. Authentifizierte Abläufe wurden gegen echte lokale API-/SQL-Logik geprüft, **nicht** mit echten Kundendaten im Livekonto. Mailzustellung wurde nicht getestet oder behauptet.

## 2. Wettbewerbsvergleich – Anbieterangaben, keine Produktaudits

Abruf am 28.09.2026. Keine Anmeldung bei Wettbewerbern, keine eigenen Eingabezeitmessungen dort. „Nicht geprüft“ bedeutet nicht „nicht vorhanden“.

| Anbieter | Öffentlich belegte Funktionen | Für unsere Hypothese nicht geprüft |
|---|---|---|
| FDH | Materialien/Fotos/Dokumente/Wartung per QR ohne Kundenlogin; Raum-/Auftragszuordnung, PDF-/ZIP-Export, Vorlagen für Solar/Wärmepumpen und Kundenanfragen laut Änderungsseite. Abrufbarkeit laut FAQ an geführtes Betriebskonto/Akte gebunden. | Produktspezifisch bestätigte Reinigungsantworten für fugenlose Badflächen; tatsächliche Eingabezeit; Wiederverwendung eines kompletten Badaufbaus. |
| Craftnote | Projektablage, Chat, Fotos, PDF-Firmenvorlagen, Projektberichte; ZIP-Export aller projektbezogenen Daten und Dateien. | Produktgebundene Pflegeantworten; Badaufbau-Standards; unabhängiger Kunden-Lesezugriff nach Betriebsende; flächenbezogen vorbereitetes Kunden-Servicepaket. |
| PlanRadar | Projektvorlagen mit Struktur/Formularen/Nutzern, Tickets/Pläne, Projekt-ZIP einschließlich Anhängen und optional Dokumenten. | Enger Drei-Minuten-Badablauf; konkrete Pflegeantworten; unabhängiger Kunden-Lesezugriff; passende Servicepakete für Badkunden. |
| eigenheimverwalter | Eigentümerorientierte Hausdaten, Dokumente, Fotos, Zustand, Maßnahmen, Erinnerungen; Export und Teilen werden beworben. | Vollständigkeit/Formate des Exports; betrieblich bestätigte Produktpflege; wiederverwendbare Badaufbauten; Zugriffsbedingungen nach Ende einer Betriebsbeziehung. |

Quellen:

- FDH: https://fdh-digital.de/ und https://fdh-digital.de/neuerungen
- Craftnote: https://craftnote.de/funktionen/ und https://craftnote.de/pakete/
- PlanRadar: https://help.planradar.com/de/exportieren-eines-projekts-in-der-webapp/ und https://help.planradar.com/de/projektvorlagen-in-der-webapp-verwenden/
- eigenheimverwalter: https://www.eigenheimverwalter.de/funktionen/

**Schlussfolgerung:** QR, Akte, Export, Vorlagen oder Anfrage allein sind kein USP. Zu testen ist ein enger Arbeitsablauf: unterschiedliche Badflächen ohne doppelte Eingabe bestätigen; bei Änderungen keine alte Pflege ausgeben; nur die betroffene Fläche für Service weitergeben. Die Recherche belegt keine Konkurrenzfreiheit und keine allgemeine Überlegenheit.

## 3. Umgesetzt und priorisiert

1. **Flächen als Grundlage:** je Fläche Name, Lage, Gewerk, System/Fliese, Versiegelung bzw. Kleber/Fuge, Silikon, Abdichtung; optional Untergrund/Vorbereitung, Farbe, Charge, Besonderheiten, Ersatzmaterial, Fotos. Bis zu acht Flächen. Der Boden bietet keine Wand-Untergründe an.
2. **Drei Arbeitsschritte:** Projekt → Aufbau prüfen → Übergabe. Eine gewählte Fläche bearbeiten, Produktzeilen statt zusätzlicher Kartenübersicht, bekannte Farbpalette plus Sonderfarbe, seltene Angaben eingeklappt.
3. **Bestätigung:** Vorbelegung bleibt Vorschlag. Übergabe wird serverseitig verweigert, solange Oberfläche/Flächenname/Verwendungsbestätigung fehlen. Änderungen entwerten die Bestätigung. Keine fachliche Ausführungs- oder Normbestätigung.
4. **Pflege und Quellen:** Fachbetrieb hinterlegt Kurzantwort, Quelle, optional Link und Dokumentstand und bestätigt fachliche Prüfung. Fehlende/alte Bestätigung führt zu „Noch nicht dokumentiert“. Ein Produktwechsel ersetzt dessen Unterlagen, entwertet Pflege und schlägt eine bekannte Systemversiegelung neu vor. Keine KI und keine selbst erfundenen Pflegevorgaben.
5. **Standards:** mehrere Flächenaufbauten wiederverwendbar. Keine Kundenangaben, Farben, Chargen, Fotos, Notizen, Ausführungsdaten oder Bestätigungen übernehmen. Eine geprüfte Pflegevorlage kann als **unbestätigter Vorschlag** mitkommen; bestehende Projekte bleiben Kopien. Eindeutig passende Katalogunterlagen werden beim ersten Flächenaufbau gesucht; Altlinks werden nicht geraten.
6. **Kundenbereich behutsam ergänzen:** Flächenauswahl und direkte Fragen/Antworten; bestehende Kundenfunktionen bleiben. Allgemeine alte Dokumente werden als nicht flächenzugeordnet gekennzeichnet. Betrieb bleibt sichtbar.
7. **Service:** Fläche wählen, Anliegen und optional Foto, frei wählbarer Empfänger, Vorschau vor Weitergabe. Selektiver HTML-Download und vorbereitete E-Mail. Kein automatischer Versand, keine Zustellbehauptung, Anhänge müssen im Mailprogramm selbst angehängt werden. Kein vollständiger NFC-Link im Servicepaket.
8. **Offlinekopie:** eigenständig lesbare HTML-Datei mit strukturierten übergebenen Daten, eingebetteten Fotos und hochgeladenen PDFs. Nicht archivierte Links werden ausdrücklich ausgewiesen. PDF-Upload max. 1 MB/Datei, sechs Dokumente je Produkt, acht Flächenfotos; bestehende 6-MB-Requestgrenze bleibt. Vollständige Generaldaten inklusive Checkheft/Ergänzungen zusätzlich im lesbaren Datenabschnitt. Private Betriebsnotizen/Schlüssel gehören nicht hinein.

Keine neuen allgemeinen Gewerke, Chats, KI-Bots, CRM- oder ERP-Integrationen. Baukommunikation wurde nicht umgebaut.

## 4. Aufbewahrung und Eigentümerwechsel – ehrlicher Iststand

Geprüfte Logik in `database/schema.sql` und `database/workflow.sql`:

- `scan` verlangt einen nicht gesperrten Pass und ein übergebenes Projekt.
- `visibility` sperrt den Pass. `delete` entfernt das Projekt und legt den Pass still; der Übergabestand hängt am Projekt.
- Die Mitglieder werden bei Firmenlöschung kaskadierend entfernt; Pass-/Projekt-Fremdschlüssel verhindern eine beiläufige Firmenlöschung. Das ist **keine** eigenständige Kundenarchiv-Lösung.
- Übergabestand wird gesichert und gegen nachträgliche Materialänderungen geschützt; das schützt nicht vor administrativer Projektlöschung oder Passsperre.
- Bestehende persönliche Ergänzungsschlüssel sind kein geregelter Eigentümerwechsel.

**Jetzt nutzbar:** Eine vorher heruntergeladene Kundenkopie funktioniert nach Sperre, Löschung oder Ende der Betriebsbeziehung offline weiter. Externe Links können trotzdem ausfallen. Die Kopie kann bewusst an einen neuen Eigentümer übergeben werden; lokale Kopien sind nicht widerrufbar.

**Noch nicht umgesetzt / Freigabesperre für entsprechende Werbeversprechen:** vom Betrieb unabhängiger Onlinezugang, kontrollierter zeitlich begrenzter Service-Freigabelink, verifizierter Online-Eigentümertransfer, automatisches Archivieren fremder Hersteller-PDFs und automatisierte Aufbewahrungs-/Löschprozesse.

Zielarchitektur für einen nächsten geprüften Schritt:

1. Separates unveränderliches Kundenarchiv mit eigener ID; kein löschkaskadierender FK zum Betrieb/Projekt. Nur ausdrücklich freigegebene Übergabedaten, keine internen Daten. Eingebettete/gespeicherte Dateien inklusive Manifest und Inhalts-Prüfsummen.
2. Eigener hochentropischer Lesezugang und separater verifizierter Verwaltungsschlüssel. Betriebssperre beendet Schreibrechte des Betriebs, nicht die zugesagte Archivlaufzeit des Kunden. Missbrauchs-/Datenschutzsperren getrennt dokumentieren.
3. Servicefreigabe als ausgewählte Kopie mit Ablaufdatum, Widerruf, Abrufbegrenzung und serverseitiger Inhaltsprojektion. Nicht einfach den Vollzugriffslink teilen.
4. Eigentümertransfer: bisheriger verifizierter Eigentümer startet; neuer Eigentümer bestätigt; neue Schlüssel, alte Bearbeitungs-/Serviceberechtigungen widerrufen; Ereignis protokollieren. Offlinekopien bleiben außerhalb der Kontrolle.
5. Laufzeit und Speicher vor Übergabe ausdrücklich nennen, Erinnerungen vor Ablauf, Export, Verlängerungsoption. Nicht stillschweigend „lebenslang“ zusagen. Eine externe Abschaltung kann auch diese Architektur nicht verhindern; Export bleibt nötig.

## 5. Prüfungen und Messwerte

Automatisierte Regression: initial 50/50 Tests bestanden, einschließlich bestehender UI, API, SQL, Mandanten, Einladungen, Baukommunikation und QR. Neue Tests in `tests/bath.test.mjs`:

- Zwei Flächen: Quartz R und HardRock bleiben getrennt.
- Pflegequelle fehlt → keine geratenen Empfehlungen.
- Produktwechsel / manipulierte veraltete Bestätigung → Pflege und Übergabe nicht mehr bestätigt.
- Standardänderung → übergebenes Projekt bleibt unverändert; projektspezifische Angaben gehen nicht in den Standard.
- Fliesenbad mit Kleber, Fugenmasse, Silikon und Abdichtung wird validiert.
- Zugriff aus anderem Betrieb → verweigert.
- Gesicherter Stand unveränderlich; nach Passsperre ist Onlineabruf gesperrt, vorher erzeugte Offlinekopie weiterhin lesbar.
- Selektives Servicepaket enthält keine andere Fläche, interne Adresse, Bearbeitungsschlüssel oder NFC-Token; HTML-Texte werden escaped.

Gemessene **Simulationen**, nicht menschliche Nutzungsnachweise:

| Ablauf | Messung | Aussagegrenze |
|---|---|---|
| Vorgefülltes Zwei-Flächen-Musterbad, Farbauswahl/Sonderfarbe, Bestätigung, Übergabe | Ein Lauf 81 ms, 10 UI-Aktionen, 0 Rücksprünge; HappyDOM + lokale API/SQL inklusive Sicherheitsprüfungen | Keine Lese-/Denk-/Tippzeit, keine Aufnahme von Fotos, kein Mobilfunk. Belegt nicht das 3-Minuten-Ziel. |
| Kundenfrage zur Pflege einer anderen Fläche | Browserlauf 288 ms, 2 Aktionen, 0 Rücksprünge | Automatisierte Auswahl mit bereits bekanntem Ziel. Belegt nicht menschliche Auffindbarkeit in 20 Sekunden. |

Die öffentliche Browserprüfung zeigte korrekte flächenabhängige Antworten und eine selektive Empfängervorschau. Der Browser-Downloadversuch konnte nicht abgeschlossen werden; Exportinhalte wurden im automatisierten Test geprüft. Echter iPhone-Download/PDF-Ausdruck und menschliche Eingabezeit bleiben Pilottests, keine behaupteten Erfolge.

## 6. Preismodell als Hypothese, nicht zugesagter Tarif

**19 € netto pro Betrieb/Monat**, vier neue Bad-Übergaben pro Monat inklusive; weitere Übergabe **5 € netto**, physischer gebrandeter Pass separat. Online-Kundenarchiv als geplantes Leistungspaket: **fünf Jahre und ein begrenztes Datenvolumen je Bad**, erst anbieten, wenn unabhängiges Archiv und Kalkulation tatsächlich umgesetzt sind. Export ohne Zusatzentgelt. Keine unbegrenzte Speicherung; Folgelaufzeit gesondert und transparent anbieten. Keine Preise in der Software abgerechnet.

Kalkulationsmodell prüfen: 19 € minus Supportzeit × interner Vollkostensatz minus Hosting/Backups/Transfer/Abrechnung minus Archivreserve. Beispielannahmen, keine gemessenen Kosten: 10 Supportminuten × 30 €/h = 5 €, 3 € laufende Infrastruktur/Abrechnung, 4 € Archivreserve → 7 € vor Entwicklung/Vertrieb/Steuern. Bei 30 Supportminuten wäre dieses Modell nicht tragfähig. Passproduktion/Versand separat kalkulieren, keine „Centkosten“ unterstellen. Nutzung und echte Kosten pro Projekt messen, dann Paketumfang entscheiden.

## 7. Pilotentscheidung und langfristiger Vorsprung

Fünf kleine Fachbetriebe, je drei reale Bäder (mit freigegebenen Testdaten), mindestens fünf unabhängige Kundenaufgaben. Erstes und drittes Projekt getrennt messen. Timer vom Benennen bis erfolgreicher Übergabe; Zeit für fehlende Fotos/Produktrecherche separat, nicht unterschlagen. Rücksprünge, Hilfeaufrufe, Korrekturen und fehlende Quellen zählen.

Vorläufige Erfolgskriterien:

- Mindestens 4/5 Betriebe übergeben ihr drittes vorbereitetes Standardprojekt ohne Hilfe in ≤3 Minuten.
- Mindestens 4/5 Kunden finden Material **und** passende Pflegeauskunft jeweils in ≤20 Sekunden; „nicht dokumentiert“ muss verständlich sein, zählt aber nicht als fachlich beantwortete Pflegefrage.
- Ein fremder Fachbetrieb kann aus dem selektiven Paket Fläche, Produkt, Farbe, Quellen und fehlende Angaben korrekt erkennen, ohne weitere Rückfrage nach diesen Daten.
- Kein ungeprüfter Altpflegehinweis nach Produktwechsel, keine falsch kopierte Charge, keine internen Daten im Kundenpaket.
- Mindestens drei Pilotbetriebe nutzen es im nächsten echten Projekt erneut und mindestens zwei akzeptieren den getesteten Preis verbindlich; Lob allein ist kein Kaufnachweis.
- Supportaufwand, Datei-/Speichervolumen, Abbruchquote und Exporterfolg bleiben innerhalb der tatsächlich kalkulierten Grenzen.

Der mögliche Vorsprung entsteht aus gepflegten, versionierten Produkt-/Pflegezuordnungen, erprobten Betriebsstandards, niedriger Fehlerrate und Vertrieb durch Fachbetriebe. Die Funktionsliste und ein NFC-Anhänger sind kopierbar. Erst wiederholte Nutzung, gute Quellen und zufriedene zahlende Betriebe machen die Position belastbar.

## Freigabe vor Produktivübernahme

1. Separate Testumgebung für authentifizierten Pilotlauf; keine Produktionsschlüssel in Preview.
2. Menschlicher Handytest inklusive PDF-/HTML-Download, Rückkehr bei Netzwerkfehler und zwei verschiedenen Flächen.
3. Fachliche Bestätigung echter Pflegeinhalte durch Betrieb/Hersteller; keine Mustertexte übernehmen.
4. Unabhängiges Onlinearchiv/Transfer erst nach eigener Implementierung und Sicherheitstest bewerben.
5. Branch prüfen, dann gezielt zusammenführen. `main`, bestehende Daten und Zugänge sind bis dahin unverändert.
