# PROJEKTPASS – privater Gemini-Entwicklungstest

Stand: 29.09.2026. Branch: `feature/gemini-private-test`.

## Ergebnis – und was ausdrücklich noch nicht fertig ist

Implementiert ist ein persistenter, passwortgeschützter Einzelbenutzer-Testserver mit zentraler Eingabe, echtem Gemini-REST-Adapter, bearbeitbaren Vorschlägen und dem vorhandenen flächenbezogenen Badeditor/Kundenexport. Er verwendet **keine** Produktivdatenbank und verändert keine bestehenden Konten, Projekte oder Übergaben. Kein Monatsabo, kein Billing und kein automatischer Bezahl-Fallback wurden eingerichtet.

**Noch kein echter Gemini-Erfolg:** In dieser Arbeitsumgebung ist kein `GEMINI_API_KEY` verfügbar. Kein eigenes Google-Testprojekt wurde erstellt oder dessen Billing-Zustand verifiziert. Die Erkennungsqualität für reale Fotos/Sprache ist daher nicht gemessen. Ebenso wurde kein geschützter öffentlicher HTTPS-Testserver bereitgestellt. Ein reines Cloudflare-Pages-Preview dieses Branches startet den Node-Testserver nicht.

Der gewünschte End-to-End-Erfolg mit echten Gemini-Antworten ist damit noch **nicht abgenommen**. Die ausführbaren, schlüsselunabhängigen Teile sind vorhanden und automatisiert geprüft. Es fehlen nicht nur ein Schlüssel, sondern für einen Handy-Link auch die separat konfigurierte Hostingumgebung.

## Grundlage und Isolation

- Produktives `main`: `670658b1838d8a363e4a755c4817e43636c2c199`. Live-`app.mjs` stimmt am 29.09. bytegenau mit diesem Stand überein (SHA-256 `ed63dec5e05d7f7a9479b1a80097d434f7167b808907a57aae3bcd9f05697a7b`).
- Ausgangspunkt der Erweiterung: vorhandener Badflächen-Pilot `27fe0878a7d6e40095ede249d8c3f116455caa0a`, nicht eine neue konkurrierende Anwendung.
- Wiederverwendet: `bath-editor.mjs`, Flächen-/Materialmodell, Katalog/Favoriten, Betriebsstandards, Validierung, automatische Speicherung, Übergabeprüfung und Kundendarstellung/Export.
- Neue Testdaten werden separat lokal gespeichert. Änderungen am Live-Supabase-Projekt, Cloudflare-Produktionskonfiguration und anderen Produkten: **keine**.
- Supabase-Changelog geprüft; keine neue Supabase-Funktion oder Datenbankmigration in diesem Schritt.

## Sicher starten

Voraussetzung: Node.js mit den vorhandenen Projektabhängigkeiten (getestet mit dem bereitgestellten Node-Runtime). Aus dem Repository-Verzeichnis:

```sh
npm ci
npm run test:setup
npm run test:private
```

1. In Google AI Studio ein **eigenes separates Projekt** für diese Entwicklungstests anlegen/auswählen. Prüfen, dass es Free Tier nutzt und **kein Billing-Konto** verknüpft ist. Keinen „Set up billing“-/Upgrade-/Prepay-Vorgang durchführen. Schlüssel auf die benötigte Gemini API beschränken, soweit die Google-Konfiguration das unterstützt.
2. `npm run test:setup` fragt deine eigene Test-E-Mail, ein neues Testpasswort und den API-Schlüssel **verdeckt im lokalen Terminal** ab. Diese Zugangsdaten gehören nicht in den Chat.
3. Der Schlüssel liegt ausschließlich serverseitig unter `.private-test/config.json` im Feld **`GEMINI_API_KEY`** (Dateimodus 0600, Verzeichnis 0700, Git-ignore). Alternativ den Schlüssel als Prozess-/Hostingsecret **`GEMINI_API_KEY`** setzen; Umgebungsvariablen haben Vorrang. Nicht unter `public/`, nicht als öffentliche Buildvariable.
4. Nach dem Start am selben Rechner **http://localhost:8789/ai-test** öffnen und mit dem eben eingerichteten privaten Testkonto anmelden. Ein neues Testbad erstellen, echte eigene Materialaufnahme oder Sprachnotiz hinzufügen, sichern und Vorschläge prüfen.

Die Konfiguration kann erneut mit `npm run test:setup` eingerichtet werden; ein leerer Schlüssel behält den vorhandenen. Es wird kein Schlüssel ausgegeben oder protokolliert. Das Setup speichert einen gesalzenen scrypt-Passworthash, kein Klartextpasswort.

### Für einen geschützten Handy-Link

Der Testserver bindet absichtlich nur an `127.0.0.1`. Für ein Smartphone ist eine **eigene HTTPS-Testadresse** mit Reverse Proxy zu genau diesem Node-Prozess erforderlich. Persistentes Volume ausschließlich für `.private-test/data`, keine öffentliche Dateifreigabe. Den Host unverändert weiterreichen; `PP_TEST_ORIGIN` muss exakt der HTTPS-Adresse entsprechen. Keine Produktionsadresse verwenden. Nur eine Prozessinstanz pro Datenverzeichnis starten, keine horizontalen Replikate.

Das ist noch nicht eingerichtet. Cloudflare Pages allein führt `server/private-test-http.mjs` nicht aus. Dafür wäre ein eigener Node-Host oder ein separat implementierter Cloudflare-Speicher-/Laufzeitadapter nötig; bloßes Einfügen des Schlüssels bei Pages reicht **nicht**.

## Zentrale Serverkonfiguration

| Variable | Zweck |
|---|---|
| `GEMINI_API_KEY` | Ausschließlich serverseitiges Secret |
| `GEMINI_MODEL` | Standard `gemini-3.5-flash-lite`, zentral austauschbar; kein automatischer Modellwechsel |
| `PP_AI_ENABLED` | Nur `true` aktiviert echte Aufrufe |
| `PP_FREE_PROJECT_CONFIRMED` | Manuell geprüfter separater Free-Tier-Projektstatus; keine automatische Billing-Verifikation |
| `PP_TEST_EMAIL` | Genau ein zulässiges eigenes Testkonto |
| `PP_TEST_PASSWORD_HASH` | Gesalzener scrypt-Hash, vom Setup erzeugt |
| `PP_TEST_ORIGIN` | Exakte Testadresse; HTTPS außer localhost |
| `PP_TEST_PORT` | Lokaler Port, Standard 8789 |

Ein späterer Bezahlbetrieb kann denselben UI-/Vorschlagsvertrag nutzen, benötigt aber eine ausdrücklich neue Konfiguration, EWR-konforme Vertrags-/Datenschutzprüfung und produktionsfähigen Speicher/Mandantenbetrieb. Diese Testfreigabe ist dafür nicht ausreichend.

## Google-Prüfung vom 29.09.2026

Google beschreibt kostenlose Entwicklerquoten auch für EWR/UK/CH. Die Nutzungsbedingungen verlangen Paid Services, wenn API-Clients Nutzern dort bereitgestellt werden. Hier ist ausschließlich der eigene geschlossene Entwicklungstest vorgesehen, **nicht** eine kostenlose Freigabe an Pilotbetriebe oder Kunden. „Testversion“ ist kein Ausnahmetatbestand. Die konkrete eigene Kontoverfügbarkeit bleibt ohne Schlüssel ungeprüft.

Für EWR/UK/CH verweist Google bei der Datenverwendung auch für kostenlose Kontingente auf den entsprechenden Paid-Services-Abschnitt. Trotzdem bleiben die Testeingaben vorsorglich auf eigene, nicht vertrauliche Materialaufnahmen und erfundene Projektdaten beschränkt. Keine Kundendaten, Stimmen Dritter oder vertraulichen Dokumente hochladen.

Das aktuelle Modellblatt empfiehlt für neue Projekte neuere Modelle; 2.5-Zugriff wird auf bisher aktive Nutzer beschränkt. `gemini-3.5-flash-lite` ist als multimodales Modell für Text/Bild/Audio/PDF und mit kostenlosem Standardtarif dokumentiert. Tatsächliche Projektquoten sind in AI Studio zu prüfen, nicht aus alten pauschalen RPM-Angaben abzuleiten. Der Testserver setzt zusätzlich eigene strengere Grenzen. Es gibt keine garantierte dauerhafte Gratisverfügbarkeit.

Offizielle Quellen:

- Bedingungen: https://ai.google.dev/gemini-api/terms
- Free Tier / Billing: https://ai.google.dev/gemini-api/docs/billing
- Modell: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite
- Älteres Modell/Zugriff: https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash
- Preise: https://ai.google.dev/gemini-api/docs/pricing
- Quoten: https://ai.google.dev/gemini-api/docs/rate-limits
- REST, Inline-Dateien, Ausgabe-Schema: https://ai.google.dev/api/generate-content
- Audioformate: https://ai.google.dev/gemini-api/docs/audio

## Umgesetzter Ablauf

1. Im geöffneten Testbad Text, Foto, PDF oder Sprachnotiz hinzufügen. Projektzuordnung ist bereits bekannt. Fotos werden komprimiert und EXIF-Metadaten entfernt; die gespeicherte Eingabekopie ist deshalb nicht byteidentisch mit der Kameraoriginaldatei.
2. Beim Sichern zunächst persistente lokale Outbox in IndexedDB, dann Testserver. Erst nach Serverbestätigung wird die lokale Outbox entfernt. Bei Uploadabbruch ist „Erneut hochladen“ verfügbar. Noch nicht gesicherte Formulare bleiben sichtbar; Ansichtswechsel wird verhindert.
3. Nur nicht-interne Eingaben nach ausdrücklichem Sichern verarbeiten. Interne Notizen verlassen den Testserver nicht in Richtung Gemini.
4. Gemini erhält Originaltext/-dateien, Aufnahmezeit und nur die notwendigen Flächen-/Produktangaben. Keine Kundenadresse, Kontaktdaten, Projekttitel, internen Notizen oder gesamte Datenbank. Keine Tools/externen URLs/Schreibrechte.
5. Enges JSON-Schema und erneute Serverprüfung. Unterstützte Vorschläge: Material, Reserve/Lagerort, Sachnotiz, Foto, Produkt-PDF. Keine erzeugten Pflegevorgaben oder technischen Freigaben. Unlesbares bleibt leer und muss geprüft werden.
6. Editierbare Karten, mehrere Flächen oder benannte neue Teilfläche, Auswahl einzelner Karten, Übernehmen/Verwerfen. Alte Werte sind vor Materialänderung einsehbar; bei zwischenzeitlicher Änderung erscheint ein Warnhinweis. Optimistische Versionierung verhindert Rennen beim Bestätigen.
7. Bestätigung schreibt nur erlaubte Felder in den Badaufbau. Original, KI-Ergebnis, menschlich geänderte Bestätigung und vorheriger Stand bleiben getrennt in internem Eingabe-/Änderungsprotokoll. Produktwechsel entfernt bisherige Produktunterlagen; Systemwechsel leert die alte Versiegelung; Pflege muss erneut geprüft werden.
8. Kundenansicht und Offline-Export werden aus dem bestätigten Aufbau erzeugt. Keine neue KI-Anfrage beim Lesen. Eingabeoriginale, Vorschläge und interne Änderungshistorie bleiben draußen. Ausgewählte Fotos/PDFs werden erst nach ausdrücklicher Zuordnung veröffentlicht.
9. Vor Übergabe kann die Kundenansicht geprüft werden. Vorhandene flächenweise Verwendungsbestätigung und Übergabeprüfung schützen den Übergabestand. Danach ist die Testübergabe schreibgeschützt.

Direkter manueller Aufbau/Katalog/Standards bleiben verfügbar. Neue Bäder übernehmen **keine Standardfliese automatisch**. Ein Standard wird nur nach Auswahl als Projektkopie übernommen. Bestehende Live-Standards/Favoriten werden nicht in die Testumgebung kopiert; dort lassen sich eigene Teststandards mit dem bestehenden Editor anlegen.

## Grenzen und Schutz

- Einzelkonto, passwortgeschützte Server-API, HttpOnly/SameSite-Strict-Sitzung, bei HTTPS Secure-Cookie, exakte Origin-/Host-Prüfung, Abmeldung und eine Stunde Sitzungsdauer. Fünf Loginversuche je 15 Minuten; Neustart beendet Sitzungen.
- 20 Testbäder, 60 Eingaben je Bad, 80 MB Testdaten insgesamt. Bis drei Dateien, 2 MB je Datei, 4 MB je Eingabe; veröffentlichte PDFs max. 1 MB. Bestehende Grenzen des Kundenexports bleiben bestehen.
- Aufnahmen höchstens 60 Sekunden. Mikrofon erfordert unterstützten Browser und HTTPS (localhost ausgenommen). Datei-Upload/Text bleiben als Alternative.
- Maximal 20 Gemini-Versuche je UTC-Tag, mindestens 15 Sekunden Abstand, maximal drei manuelle Versuche je Original. Keine automatischen Wiederholungen. 45 Sekunden Provider-Timeout.
- Dubletten anhand Inhalt/Projekt/Internstatus, nicht Dateiname. Ein abweichendes/comprimiertes Foto kann technisch ein neuer Inhalt sein; semantische Dublettenerkennung ist nicht versprochen.
- Bei 429/Timeout/ungültiger Ausgabe bleibt das Original gespeichert. Absturz während Verarbeitung: nach einer Minute manuell erneut versuchen; die bereits gezählte Anfrage bleibt im Kontingent.
- Metadaten: Anfrage-ID, Modell, Status, Laufzeit und von Google gemeldete Tokenwerte. Keine Eingabeinhalte im Betriebslog. `billed_cost=null`: Es liegen keine Rechnungsdaten vor; keine erfundene Null-Euro-Abrechnung.
- Lokale Dateipersistenz mit atomarem Umbenennen, Flush vor Bestätigung und In-Prozess-Serialisierung. Kein Clusterbetrieb, keine Backup-/Langzeitarchivgarantie. Betreiber muss Backups und Zugriffsschutz des Servers gewährleisten.
- Ein PDF kann nur nachvollziehbar einem Produkt zugeordnet werden. Die KI prüft weder technische Gültigkeit noch Produkttauglichkeit. Bestehende belegte Pflegefunktionen bleiben manuell bestätigt.
- Noch nicht fertig: Onlinehosting, Konto-/Billing-Verifikation bei Google, echter Gemini-Qualitätstest, realer iPhone-Test, separate produktive Mandanten-/Speicherintegration.

## Tatsächlich durchgeführte Tests

Abschließender Gesamtlauf: **60/60 Tests bestanden** (17,16 Sekunden), einschließlich zehn neuer Server-/Oberflächenprüfungen und aller bisherigen Tests. Syntaxprüfung und `git diff --check` ebenfalls bestanden. Diese Laufzeit misst den automatisierten Testsatz, nicht die Eingabezeit eines Handwerkers.

| Anforderung | Nachweis / Grenze |
|---|---|
| Zwei Fliesen Wand/Boden | Serverpersistenz, verschiedene Produkte und Mehrfachzuordnung automatisiert geprüft |
| Teilweise unlesbares Etikett | Kontrollierte Antwort mit unbekannten Feldern geprüft; **keine echte Bilderkennung** |
| Sprachnotiz mit mehreren Angaben | WAV-Transport und mehrere strukturierte Vorschläge mit kontrollierter Antwort geprüft; **keine echte Transkription** |
| Korrektur bestätigter Daten | Vorheriger Stand im Änderungsprotokoll, Farbanpassung, Pflegeentwertung, Versionskonflikt geprüft |
| Doppelte Eingabe | Zeitgleiche gleiche Eingaben ergeben eine gespeicherte Original-ID |
| Interne Notiz | Verarbeitung und Übernahme abgelehnt; nicht in Kunden-HTML oder Kunden-JSON |
| KI-Kontingent erschöpft | Simulierter HTTP 429, keine Wiederholung/Fallback, Original bleibt gespeichert |
| Bestehende Projekte | Gesamte bisherige Testreihe inkl. API/SQL/Anmeldung/Übergabe grün; Livecode unverändert, kein Live-Kundentest |
| Zugriffsschutz | HTTP-Test mit falschem Konto, ohne Sitzung, Fremd-Origin, falschem Host, geschützter Secret-Datei und Logout |
| Kleiner Bildschirm / Upload | HappyDOM mit 390×844, Text → Vorschlag → editierte Bestätigung → Kundenansicht, PDF intern, manueller Editor. **Kein Layout-/Kamera-/Mikrofonnachweis auf echtem Gerät** |

Lokales Chromium war nicht installiert. Der Installationsversuch lieferte ungültige Downloadarchive; deshalb keine visuelle Smartphone-Abnahme oder Screenshots als Beleg behauptet. IndexedDB im DOM-Test ist ein ausdrücklich simuliertes In-Memory-Objekt; dauerhafte Serverseite wurde dagegen mit Dateispeicher und erneut geöffneter Instanz geprüft.

## Nächster echter Abnahmetest

Nach sicherer Schlüsselhinterlegung mit separat geprüftem Google-Free-Projekt: eigenes lesbares Etikett, teilweise verdecktes Etikett und eigene Sprachnotiz erfassen. Modell, Tokenwerte und Fehlerstatus sind in der Testübersicht sichtbar. Original mit Vorschlag vergleichen, korrigieren, bestätigen und Kundenübersicht öffnen. Kein Test gilt als bestanden, nur weil der API-Aufruf HTTP 200 liefert. Anschließend auf einem echten iPhone Foto-/Mikrofonfreigabe, Uploadunterbrechung, Rückkehr und Offline-Export prüfen.
