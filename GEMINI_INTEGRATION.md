# Gemini im bestehenden Projektpass – 29.09.2026

Die neue Eingabe liegt unter `/#ai/PROJEKT-ID` innerhalb der bestehenden Anwendung. Sie verwendet den normalen Login, die bestehenden Projekte und die vorhandene Kundenansicht. Erreichbar über „Foto, Sprachnotiz oder Nachricht hinzufügen …“ im Projekt und im Flächeneditor. Favoriten und Standards bleiben im manuellen Aufbau verfügbar.

## Bereitstellungsstatus

Nach ausdrücklicher Nutzerfreigabe am 29.09.2026: Migration `projectpass_private_ai_integration` im Projekt PROJEKTPASS Pilot erfolgreich ausgeführt. Ausschließlich der verifizierte Klement-Account wurde freigeschaltet. Datenbankprüfung bestätigt: anderer Account nicht freigeschaltet; anon und authenticated können die RPC nicht aufrufen. Die beiden privaten Tabellen haben bewusst keine Browser-RLS-Policies; nur der serverseitige service_role-Zugang darf darauf zugreifen. Der Advisor nennt außerdem die bereits bestehende deaktivierte Prüfung kompromittierter Passwörter.

Der geprüfte Codecommit `5eae2ab30113097cdc4a509d04a69e29efbc5712` wurde ohne Force auf main veröffentlicht. Die Liveadresse liefert die neue HTML-Version mit `ai-project.css` aus. Ein echter Gemini-Aufruf und der angemeldete Liveablauf sind noch nicht nachgewiesen; dafür fehlt weiterhin das serverseitige Secret GEMINI_API_KEY.

## Zugang und Einrichtung

Nur der ausdrücklich freigegebene Klement-Entwickleraccount erhält Zugriff über `pp_private.ai_access`. Der andere Handwerker ist kein Entwickler und erhält keinen kostenlosen Gemini-Zugang. Alle KI-Endpunkte prüfen die bestehende Sitzung bei Supabase Auth, den Origin, die Entwicklerfreigabe und die Projektzugehörigkeit serverseitig. Die Freigabe ist keine vom Browser steuerbare Rolle. Die Tabellen liegen im privaten Schema mit RLS und ohne Rechte für anon/authenticated. Die RPC ist SECURITY INVOKER, nur service_role darf sie aufrufen.

In Cloudflare: Workers & Pages → projekt-pass → Settings → Variables and secrets → Add. **Type: Secret**, **Name: GEMINI_API_KEY**, Value: Schlüssel des eigenen separaten Google-Testprojekts ohne Billing. Im aktuellen Auftrag wird bewusst die bestehende Anwendung verwendet; das Secret gehört zum Production-Betrieb dieses Projektpasses, bleibt aber durch die serverseitige Accountfreigabe nur für den eigenen Entwicklertest nutzbar. Danach unter Deployments das aktuelle Production-Deployment erneut bereitstellen (Retry deployment), damit das Secret wirksam wird. Schlüssel niemals in Chat, Git oder Browsercode ablegen.

Optionale serverseitige Konfiguration: `PP_AI_ENABLED=false` sperrt Verarbeitung; ohne diesen Override ist sie für das explizit freigeschaltete Entwicklerkonto vorbereitet. `GEMINI_MODEL` überschreibt den Standard `gemini-3.5-flash-lite`. Es gibt keinen Modellfallback und keine Billing-Aktivierung. Vor dem Aufruf muss der Entwickler in der Oberfläche bestätigen, dass sein separates Google-Projekt kein Billing hat und er den Test ausschließlich selbst ausführt. Das ist eine Erklärung des Nutzers, keine technische Billing-Prüfung.

## Verhalten

Original zuerst in IndexedDB sichern, anschließend serverseitig speichern; erst danach Gemini aufrufen. Bei fehlgeschlagenem Upload bleibt die lokale Kopie erneut hochladbar. Dubletten werden per Inhaltsfingerabdruck erkannt. Originale, Vorschläge, Bestätigungen und Änderungshistorie bleiben getrennt. Nur ausdrücklich bestätigte Änderungen werden atomar mit dem privaten Zustand in den bestehenden Projektinhalt übernommen. Übergabe-Snapshots bleiben gesperrt. Kundenaufrufe benötigen keine KI.

Maximal 3 Dateien, 2 MB je Datei, 4 MB insgesamt; Sprache maximal 60 Sekunden. Interner Testspeicher 20 MB pro freigegebenem Konto, maximal 60 Eingaben je Bad. Maximal 20 Aufrufe pro UTC-Tag, mindestens 15 Sekunden Abstand und höchstens 3 manuell ausgelöste Versuche je Original. Google kann niedrigere, projektabhängige Limits setzen. Bei Fehlern wird kein Ersatzmodell gestartet. Eingaben bleiben gespeichert; bei vollem serverseitigem Speicher bleibt die noch nicht hochgeladene Eingabe lokal erhalten.

Bestandsprojekte werden beim Lesen nicht umgeschrieben. Alte, noch nicht flächenbezogene Aufbauten erhalten eine deterministische Arbeitszuordnung; die neue Struktur wird erst mit einer bestätigten Änderung gespeichert. Alle ursprünglichen Inhaltsfelder bleiben erhalten. Ein KI-Vorschlag auf Basis eines inzwischen geänderten Aufbaus wird abgewiesen. Interne Notizen werden weder an Google gesendet noch in die Kundenansicht exportiert.

## Durchgeführte Prüfung

64 automatisierte Tests bestanden, einschließlich des bisherigen Funktionsumfangs. Neu: HTTP-Adapter mit bestehender Sitzung gegen eine lokale PostgreSQL-kompatible PGlite-Datenbank; private Rollenrechte; Abweisung des anderen Accounts und fremder Projekte; Dubletten; Verarbeitung und Bestätigung im Bestandsprojekt; normale Kundenansicht; interne Notizen; veraltete Vorschläge; parallele Schreibversionen; Kontingentfehler; geschützte Übergaben. Zusätzlicher integrierter DOM-Test bei 390×844: Text, bearbeitbarer Vorschlag, Bestätigung, Kundenprojektion, interner PDF-Upload.

**Gemini-Antworten in diesen Tests sind kontrollierte Transport-Testantworten. Es wurde kein erfolgreicher echter Gemini-Aufruf nachgewiesen.** Echte Erkennungsqualität, iPhone-Kamera/Mikrofon, visuelles Layout und Download auf einem echten Handy sind noch offen. Die DOM-Simulation beweist kein echtes Smartphone-Verhalten.

## Google-Grundlagen (erneut geprüft 29.09.2026)

- https://ai.google.dev/gemini-api/terms : Bereitstellung für EWR-Nutzer erfordert Paid Services; nur der eigene Entwicklungstest ist freigeschaltet. Ein Handwerker wird nicht als Mitentwickler behandelt.
- https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite : zentral konfigurierbares multimodales Modell.
- https://ai.google.dev/gemini-api/docs/pricing : kostenloser Standardtarif für das ausgewählte Modell.
- https://ai.google.dev/gemini-api/docs/rate-limits : Quoten im eigenen Google-Projekt prüfen.

Verbrauchsmetadaten umfassen Modell, Anfragezahl, Laufzeit und verfügbare Tokenzahlen. `billed_cost` bleibt null: Es werden weder tatsächliche Rechnungsdaten behauptet noch Hochrechnungen als Kosten ausgegeben. Kundendaten gehören nicht in diese eigenen Entwicklungstests.
