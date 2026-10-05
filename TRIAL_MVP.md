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
