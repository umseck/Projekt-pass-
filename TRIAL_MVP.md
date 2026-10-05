# Fiktives Testbad: MVP vollständig ausprobieren

`/bath-preview.html` ist eine bewusst isolierte Testansicht für den neuen Ablauf.
Sie verwendet dieselben Material-, Prüf-, Kundenweiterführungs- und Exportmodule
wie die Anwendung. Die Daten und Rollen werden lokal simuliert. Es werden keine
Betriebs- oder Kundenkonten angelegt und keine Live-API-Aufrufe durchgeführt.

## Ein vollständiger Durchlauf

1. Unter **Neues Testbad starten** ein leeres Fliesenbad oder ein leeres fugenloses
   Bad anlegen. Alternativ das vorbereitete gemischte Beispiel wählen.
2. In **Fachbetrieb** Projekt, Flächen und Materialien bearbeiten. Fotos und PDFs
   bitte ausschließlich als fiktive Testdateien verwenden.
3. Die Kundenansicht in der Abschlussprüfung lesen. Tatsächliche Materialangaben
   bestätigen, Wissenslücken bewusst prüfen und den datierten Stand freigeben.
4. In **Kunde · eigene Ergänzungen** eine Wartung oder Reparatur zu einem Bereich
   hinzufügen. Die Originalübergabe bleibt erhalten.
5. Den Farbton, die Pflege und Reparaturangaben erneut öffnen. Eine gemeldete
   Oberflächenänderung muss die ursprüngliche Pflege als historischen Stand zeigen.
6. PDF und Datenpaket herunterladen und die darin enthaltenen Dateien prüfen.
7. Die Seite neu laden: Das Testbad und seine Ergänzungen bleiben in diesem Tab
   gespeichert. In **QR-Leseansicht** erscheinen ausschließlich die Originalangaben.
8. Unter **Fachbetrieb** ist die abgeschlossene Originalübergabe nicht mehr
   bearbeitbar. Neue Angaben kommen ausschließlich als Kundenergänzung hinzu.

Die lokale Speicherung verwendet `sessionStorage` mit dem separaten Schlüssel
`projektpass-fiktives-testbad-v3`. Sie überlebt Neuladen dieses Tabs, ist kein
serverseitiges Backup und kann durch Browser-/Tabschließen verloren gehen.
Große Foto-/PDF-Sammlungen können das Browserlimit überschreiten. In diesem Fall
zeigt der Ablauf einen Speicherfehler; er meldet keinen erfolgreichen Save.
**Testdaten zurücksetzen** löscht nur diese fiktiven Daten.

## Persönliche Zugänge und Übernahme im Test

Die Rollenwahl simuliert Geschäfts-/Kunden-/Leseansichten ohne Authentifizierung.
Optional lässt sich über die tatsächliche Kundenoberfläche ein fiktiver
Einladungs- oder Übernahmelink erstellen. Er gilt nur in diesem Browser-Tab.
Ein Testpasswort wird weder gespeichert noch an einen Dienst gesendet. Keine
realen Passwörter verwenden. Nach simulierter Übernahme rotiert der QR-Leseschlüssel.

Die lokalen Harness-Tests prüfen Persistenz, Rollenwechsel, Originalschutz,
getrennte Ergänzungen, fremde Bereichs-IDs und Übernahme/Linkrotation.
Sie ersetzen nicht die API-/SQL-Tests der echten Kundenzugänge, die Live-Anmeldung
oder einen Test auf zwei Geräten. Sie behaupten keine produktive Authentifizierung.

## Direkt öffnbare Offline-Testdatei

`public/Projektpass-MVP-Test.html` herunterladen und im aktuellen Desktop-Browser öffnen. Sie enthält dieselben Editor-, Kunden- und Exportmodule sowie den eingebetteten Katalog. Es werden keine Live-API oder externen Bibliotheken geladen. Ein gemischtes Beispiel lässt sich über „Neues Testbad starten“ vorbereiten. Danach Schritt 4 prüfen, die Flächen und bekannten Lücken bestätigen, freigeben, eine Kundenergänzung erfassen und PDF/ZIP speichern.

Die Datei simuliert die Konten und Rollen. Sie legt kein echtes Konto an und ist kein NFC-/Zwei-Geräte-Nachweis. Ihre Daten bleiben nur im lokalen Browser-Tab; bei blockiertem Browserspeicher nur bis zum Schließen/Neuladen. Physische QR-Links werden in der Offline-Datei nicht angeboten. Fiktive Einladungen lassen sich über den Teststeuerungsbutton im selben Tab annehmen.

Reproduzierbar mit `python scripts/build-offline-trial.py` (esbuild 0.25.10 aus dem npm-Registry). Der Test `tests/offline-trial.test.mjs` führt die tatsächlich ausgelieferte Datei aus und prüft den kompletten Übergabe-/Ergänzungs-/Exportablauf ohne externe Assets.

Am 5. Oktober 2026 führte der Aufruf der Cloudflare-Branch-Vorschau zu Cloudflare Access mit E-Mail-Anmeldung. Keine Zugangsdaten eingegeben, kein Schutz geändert. Der ausgelieferte Online-Stand konnte deshalb nicht im Browser abgenommen werden. Die Offline-Testdatei ist unabhängig davon direkt testbar. Quellcode und Migration stehen im Draft-PR https://github.com/umseck/Projekt-pass-/pull/6; main und die Produktionsdatenbank sind unverändert.
