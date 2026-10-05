# Projektpass Bad: erstellen, übergeben, weiterführen

Der MVP dokumentiert ein Badezimmer mit Fliesen, fugenlosen Oberflächen oder
unterschiedlichen Aufbauten je Fläche. Er ist keine Hausverwaltung, kein Chat
und keine tägliche Aufgaben- oder Bautagebuchsoftware.

## Fachbetrieb: vier Schritte

1. **Bad & Leistung:** Projektname, Objekt/Bad, Fertigstellungsdatum und
   dokumentierten Leistungsumfang erfassen. Interne Kundenangaben bleiben intern.
2. **Aufbau:** Flächen öffnen, Produkte aus dem Katalog, frei oder aus dem
   Betriebsstandard übernehmen. Farben und Abweichungen je Fläche ergänzen.
   Eigene Leistung, Fremdleistung und Bestand werden getrennt gekennzeichnet.
3. **Fotos & Pflege:** ausgewählte Fotos, Produktunterlagen, belegte Pflege,
   Besonderheiten und Restmaterial/Lagerort den passenden Flächen zuordnen.
4. **Prüfen & übergeben:** notwendige Angaben und bekannte Lücken prüfen,
   tatsächlichen dokumentierten Flächenstand bestätigen, gerenderte
   Kundenansicht ansehen und den datierten Stand ausdrücklich freigeben.

Ein Betriebsstandard wird als Projektkopie übernommen. Projektspezifische
Farben, Chargen, Fotos und Bestätigungen werden nicht in künftige Projekte
kopiert. Der erste Pass funktioniert auch ohne vorbereiteten Standard.

Der neue Ablauf prüft serverseitig notwendige Projektdaten und die bewusste
Bestätigung bekannter Material-/Pflegelücken. Fehlende Angaben und „nicht
zutreffend“ sind unterschiedliche Zustände. Es gibt keinen Qualitätsprozentsatz.
Ein Foto oder eine digitale Freigabe bescheinigt keine fachgerechte Ausführung,
Mängelfreiheit oder rechtsgeschäftliche Bauabnahme.

## Kunde: sofort lesen, bei Bedarf ergänzen

Die ursprüngliche Übergabe lässt sich über QR/NFC ohne Anmeldung lesen. Der
Link ist ein Leseschlüssel: Wer ihn besitzt, kann die freigegebenen technischen
Angaben sehen. Interne Kundendaten und private Kundenergänzungen erscheinen
nicht im öffentlichen Scan.

Der Fachbetrieb kann anschließend einen persönlichen Kundenzugang erstellen.
Der Kunde führt das Bad nach Annahme mit Wartung, Reparatur, Änderung, Foto
oder Unterlage weiter. Jede Ergänzung hat einen Bereich, ein Ausführungsdatum,
Erfassungszeit und erfassendes Kundenkonto. Der dort genannte ausführende Betrieb
ist eine Kundenangabe und bestätigt den Eintrag nicht automatisch.

Die Originalübergabe bleibt unverändert. Neue Einträge werden separat angehängt,
nicht in ursprüngliche Produktfelder geschrieben. Der Kunde muss nichts
hinzufügen. Die ursprüngliche Übergabe liefert allein bereits ihren Nutzen.

Nach einer gemeldeten Änderung der Hauptoberfläche, Versiegelung oder bei
unbekanntem Änderungsumfang zeigt die Kundenansicht die ursprüngliche Pflege
als historischen Stand. Eine reine Silikonreparatur macht den ursprünglichen
Oberflächenhinweis nicht automatisch zu einer neuen Pflegefreigabe.

## Unabhängige Kundenkopie

PDF, ZIP und HTML sind echte Downloads. Das ZIP enthält lesbare PDF/HTML,
strukturierte Daten, archivierte Fotos/PDFs und ein Manifest mit Dateiprüfsummen.
Originalübergabe und Kundenergänzungen stehen getrennt darin. Nur verlinkte oder
fehlende Unterlagen werden ausdrücklich genannt und nicht automatisch nachgeladen.
Die gespeicherte Kopie funktioniert ohne Projektpass-Server; sie ist nicht
online widerrufbar und ermöglicht keine Offlinebearbeitung.

## Weitergabe und Grenzen

Ein neuer Verwalter nimmt einen persönlichen Übergabelink an. Bis dahin bleibt
der bisherige Zugang aktiv. Mit Annahme endet sein Onlinezugriff und der
QR-Leseschlüssel wird rotiert. Damit muss eine vorhandene physische QR-/NFC-Karte
ersetzt bzw. neu beschrieben werden. Bereits heruntergeladene Kopien bleiben
beim jeweiligen Empfänger.

Die Einladung ist an die eingetragene E-Mail gebunden, wird aber nicht durch
eine separate E-Mail-Bestätigung verifiziert. Der vertrauliche Einladungslink
muss persönlich an den richtigen Empfänger weitergegeben werden. Der MVP
versendet keine Einladungs-E-Mail.

Noch nicht umgesetzt: Berichtigungen der Originalübergabe als neue Freigabeversion,
ein gesonderter personenbezogener Löschprozess, Offlinebearbeitung und
beschränkte Mitarbeiterkonten. Übergebene Projekte sind deshalb gegen die
gewöhnliche Projektlöschung geschützt. Entwürfe lassen sich weiterhin löschen.

## Umsetzung und Testzugänge

- Anwendung: `/#bath/PROJECT_ID`, QR/NFC: `/#p/READ_TOKEN`.
- Persönliche Annahme: `/#customer-access/INVITE_TOKEN`; Kundenprojekt:
  `/#customer/PROJECT_ID`.
- Vollständig fiktive Testansicht: `/bath-preview.html`, siehe [TRIAL_MVP.md](TRIAL_MVP.md).
- Implementierung, API-Vertrag und Live-Runbook:
  [MVP_IMPLEMENTATION.md](MVP_IMPLEMENTATION.md).
- Konkrete lokale Nachweise und offene Live-Abnahme: [ACCEPTANCE.md](ACCEPTANCE.md).

Die früheren KI-, Mitteilungs-, Teilnehmer-, Journal- und `owner_additions`-
Tabellen bleiben aus Kompatibilitätsgründen bestehen. Die aktive Weiterführung
verwendet eigene Tabellen und eine eigene RPC. `database/workflow.sql` enthält
den weiter benötigten Übergabe-Trigger und darf nicht pauschal entfernt werden.
Es gibt keinen Produktionsreset und keinen automatischen Import alter
Kundenangaben.
