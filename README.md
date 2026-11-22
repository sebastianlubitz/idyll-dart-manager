# Idyll Dart-Manager

Turnierverwaltung für das Kneipen-Dartturnier im Idyll: Auslosung (Einzel/Doppel), Spielpläne für 2 Automaten, Live-Tabellen mit Verlierer-Score, Endrunde mit Kreuz- und Platzierungsspielen, Gesamtergebnis und Fun-Stats.

- **Datenbank:** Firebase (Firestore + anonyme Anmeldung), Gratis-Tarif reicht
- **Hosting:** GitHub Pages
- **Kein Build-Schritt:** reine HTML/JS-Dateien, Firebase wird direkt im Browser geladen
- Ohne Firebase-Einrichtung läuft die App weiter **rein lokal** im Browser (Speicherung im `localStorage`, Backup per JSON).

## So funktionieren Turniere

- **Anlegen:** Name und Passwort (mind. 8 Zeichen) vergeben. Das Turnier bekommt einen **Code** und einen Link (`…/#t=AB12CD`).
- **Zuschauen:** Jeder mit dem Link sieht Tabellen, Spielplan und Endrunde **live**, ohne Konto und ohne Passwort.
- **Bearbeiten:** Oben auf **Bearbeiten (Passwort)** tippen und das Turnier-Passwort eingeben. Das Gerät bleibt danach freigeschaltet. Mehrere Geräte/Personen mit dem Passwort können gleichzeitig arbeiten (der zuletzt gespeicherte Stand gewinnt).
- **Endrunde kürzen:** Reicht die Zeit nicht, lässt sich die Endrunde jederzeit (auch mitten im Turnier) auf die Plätze 1–8 oder 1–4 kürzen. Die übrigen Plätze richten sich dann nach der Vorrunden-Tabelle. Geht nur, solange die entfallenden Spiele noch nicht gespielt sind.
- **Mehrere Turniere:** Über **☰ Turniere** zurück zur Startseite, jedes Turnier hat eigenen Code und eigenes Passwort.
- **Sicherheit:** Der Browser rechnet das Passwort in einen Hash um. Nur dieser Hash liegt in der Datenbank, in einem Dokument, das niemand lesen kann. Die Firestore-Regeln lassen nur Geräte schreiben, die den passenden Hash eingereicht haben. Wähle ein Passwort, das niemand erraten kann: Es gibt keine Sperre nach Fehlversuchen.

## Dateien

| Datei | Wofür |
|---|---|
| `index.html` | Die komplette App |
| `config.js` | Firebase-Projektdaten – **musst du ausfüllen** |
| `firestore.rules` | Zugriffsregeln (Turnier-Passwort) |
| `firebase.json` | Nur nötig, falls du die Regeln per Firebase-CLI statt per Konsole einspielst |

## Einrichtung (einmalig, ca. 15 Minuten)

### 1. Firebase-Projekt anlegen
1. Auf <https://console.firebase.google.com> ein neues Projekt anlegen, z. B. `idyll-dart`. Google Analytics brauchst du nicht.
2. Im Projekt auf **Web** (Symbol `</>`) klicken, App registrieren (Name egal, **kein** Firebase Hosting ankreuzen).
3. Den angezeigten `firebaseConfig`-Block in `config.js` übernehmen.

### 2. Anonyme Anmeldung aktivieren
**Build → Authentication → Jetzt starten → Anmeldemethode → Anonym** aktivieren und speichern. (Die Nutzer sehen davon nichts, jedes Gerät bekommt automatisch eine anonyme ID.)

### 3. Datenbank anlegen
**Build → Firestore Database → Datenbank erstellen**, Standort z. B. `europe-west3 (Frankfurt)`, im **Produktionsmodus** starten.

### 4. Regeln einspielen
**Firestore Database → Regeln**: den kompletten Inhalt von `firestore.rules` einfügen und **Veröffentlichen**.

### 5. Domain freigeben
**Authentication → Einstellungen → Autorisierte Domains → Domain hinzufügen** → `sebastianlubitz.github.io`.

### 6. Hochladen
`config.js` mit den Firebase-Daten committen und pushen. Nach ein bis zwei Minuten ist die Seite unter `https://sebastianlubitz.github.io/idyll-dart-manager/` aktualisiert.

## Am Turnierabend
1. Seite öffnen, **Neues Turnier anlegen**, Name und Passwort vergeben.
2. Teilnehmer eintragen, auslosen, starten, Ergebnisse eintragen. Alles wird sofort gespeichert.
3. **🔗 Link** kopieren und teilen, am besten als QR-Code am Tresen. Gäste sehen alles live.
4. **Notfall:** Über **Backup** lässt sich der Stand als Text sichern und über **Import** wieder einspielen.

## Lokal testen
Die Seite braucht einen kleinen Webserver (wegen der JavaScript-Module), z. B. `npx serve`. Ohne Server (Doppelklick auf `index.html`) läuft die App im lokalen Modus ohne Cloud.
