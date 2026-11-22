// Firebase-Projektdaten: in der Firebase-Konsole unter
// Projekteinstellungen → Allgemein → Meine Apps → Web-App → „SDK-Einrichtung und -Konfiguration“ (Config).
// Diese Werte sind nicht geheim: Sie stehen in jeder Firebase-Web-App öffentlich im Code.
// Geschützt wird die Datenbank über die Regeln in firestore.rules.
//
// Solange hier „DEIN…“ steht, läuft der Dart-Manager rein lokal im Browser (ohne Cloud).
export const firebaseConfig = {
  apiKey: "DEIN_API_KEY",
  authDomain: "DEIN-PROJEKT.firebaseapp.com",
  projectId: "DEIN-PROJEKT",
  storageBucket: "DEIN-PROJEKT.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

// Deine Nutzer-ID. Nach der ersten Anmeldung zeigt die Seite sie dir an.
// Nur dieses Konto darf Turnierdaten ändern, alle anderen sehen die Live-Ansicht.
export const OWNER_UID = "";
