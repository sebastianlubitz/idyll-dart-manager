# Idyll Dart-Manager

Turnierverwaltung für das Kneipen-Dartturnier im Idyll: Auslosung (Einzel/Doppel), Spielpläne für 2 Automaten, Live-Tabellen mit Verlierer-Score, Endrunde mit Kreuz- und Platzierungsspielen, Gesamtergebnis und Fun-Stats.

- **Datenbank & Login:** Firebase (Firestore + Authentication mit Google)
- **Hosting:** GitHub Pages
- **Kein Build-Schritt:** reine HTML/JS-Dateien, Firebase wird direkt im Browser geladen
- **Du** meldest dich mit Google an und trägst Ergebnisse ein. **Gäste** öffnen denselben Link und sehen Tabellen, Spielplan und Endrunde **live**, ohne etwas ändern zu können.
- Ohne Firebase-Einrichtung läuft die App weiter **rein lokal** im Browser (Speicherung im `localStorage`, Backup per JSON).

## Dateien

| Datei | Wofür |
|---|---|
| `index.html` | Die komplette App |
| `config.js` | Firebase-Projektdaten und deine Nutzer-ID – **musst du ausfüllen** |
| `firestore.rules` | Zugriffsregeln: alle lesen, nur du schreibst |
| `firebase.json` | Nur nötig, falls du die Regeln per Firebase-CLI statt per Konsole einspielst |

## Einrichtung (einmalig, ca. 20 Minuten)

### 1. Firebase-Projekt anlegen
1. Auf <https://console.firebase.google.com> ein neues Projekt anlegen, z. B. `idyll-dart`. Google Analytics brauchst du nicht.
2. Im Projekt auf **Web** (Symbol `</>`) klicken, App registrieren (Name egal, **kein** Firebase Hosting ankreuzen).
3. Den angezeigten `firebaseConfig`-Block in `config.js` übernehmen.

### 2. Login aktivieren
**Build → Authentication → Jetzt starten → Anmeldemethode → Google** aktivieren und speichern.

### 3. Datenbank anlegen
**Build → Firestore Database → Datenbank erstellen**, Standort z. B. `europe-west3 (Frankfurt)`, im **Produktionsmodus** starten.

### 4. Auf GitHub Pages hochladen
1. Auf GitHub ein neues **öffentliches** Repository anlegen, z. B. `idyll-dart-manager`.
2. Den Inhalt dieses Ordners ins Repository pushen (oder **Add file → Upload files**).
3. **Settings → Pages → Build and deployment**: Source „Deploy from a branch“, Branch `main`, Ordner `/ (root)`, speichern.
4. Nach ein bis zwei Minuten läuft die Seite unter `https://DEIN-GITHUB-NAME.github.io/idyll-dart-manager/`.

### 5. Domain für den Login freigeben
In Firebase: **Authentication → Einstellungen → Autorisierte Domains → Domain hinzufügen** → `DEIN-GITHUB-NAME.github.io`.

### 6. Dich als Besitzer eintragen
1. Seite öffnen, oben auf **Anmelden** tippen, mit Google anmelden.
2. Es erscheint ein Fenster mit deiner **Nutzer-ID**. Kopieren.
3. In `config.js` bei `OWNER_UID` eintragen und hochladen.
4. In Firebase: **Firestore Database → Regeln** – den Inhalt von `firestore.rules` einfügen, `DEINE_UID` durch deine ID ersetzen, **Veröffentlichen**.

## Am Turnierabend
- **Du:** Link öffnen, anmelden, Turnier einrichten und starten. Ergebnisse trägst du ein, alles wird sofort in der Datenbank gespeichert. Du kannst auch mit zwei Geräten (z. B. Laptop und Tablet am Automaten) gleichzeitig arbeiten.
- **Gäste:** Link teilen, am besten als QR-Code am Tresen. Ohne Anmeldung sehen sie die Live-Ansicht.
- **Offline-Notfall:** Der Stand liegt zusätzlich im Browser des angemeldeten Geräts. Über **Backup** lässt sich der gesamte Stand als Text sichern und wieder einspielen.

## Änderungen am Code
Geänderte Datei ins Repository pushen, nach ein bis zwei Minuten ist sie live.

## Lokal testen
Die Seite braucht einen kleinen Webserver (wegen der JavaScript-Module), z. B. `npx serve` oder `node -e "require('http')…"`. Ohne Server (Doppelklick auf `index.html`) läuft die App im lokalen Modus ohne Cloud.
