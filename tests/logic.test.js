// Logik-Tests für den Idyll Dart-Manager.  Aufruf:  node tests/logic.test.js
// Lädt das Skript aus index.html mit minimalem DOM-Ersatz und spielt viele Turniere zufällig durch.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const store = {};
global.window = { __TEST__: true, scrollY: 0, scrollTo() {} };
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
const el = () => ({ innerHTML: '', textContent: '', hidden: false, className: '', value: '', classList: { add() {}, remove() {}, toggle() {} }, focus() {}, select() {} });
global.document = { body: el(), getElementById: () => el(), addEventListener() {}, querySelector: () => null };
const m = { exports: {} };
new Function('module', 'window', 'document', 'localStorage', js)(m, window, document, localStorage);
const L = m.exports;

// ---- kleine Test-Infrastruktur ----
let pass = 0, fail = 0; const failures = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; if (failures.length < 40) failures.push(msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: erwartet ${JSON.stringify(b)}, bekommen ${JSON.stringify(a)}`); }
function section(t) { console.log('\n== ' + t); }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const C2 = n => n * (n - 1) / 2;

function setup({ n, mode = 'single', format = 'kurz', lastPlace = 'freilos', endCut = 0, seed = 1 }) {
  Math.random = rng(seed);
  const S = L.defaultState(); L.setS(S);
  for (let i = 0; i < n; i++) S.players.push({ id: L.uid(), name: 'P' + (i + 1) });
  S.mode = mode; S.format = format; S.lastPlace = lastPlace; S.endCut = endCut;
  if (mode === 'double') L.drawTeams();
  if (format === 'kurz') L.drawGroups();
  const c = L.canStart();
  if (!c.ok) return { S, startable: false, msgs: c.msgs };
  L.startTournament();
  return { S, startable: true };
}

function checkVorrunde(S, label) {
  const units = L.getUnits(), nU = units.length;
  const gAll = S.vor;
  const expected = S.format === 'kurz' ? C2(S.groups.A.length) + C2(S.groups.B.length) : C2(nU);
  eq(gAll.length, expected, `${label}: Anzahl Vorrundenspiele`);
  // jedes Paar genau einmal, nur innerhalb der Gruppe
  const seen = new Set();
  gAll.forEach(g => { const k = [g.a, g.b].sort().join('|'); ok(!seen.has(k), `${label}: Paarung doppelt ${k}`); seen.add(k); ok(g.a !== g.b, `${label}: Spieler gegen sich selbst`); });
  if (S.format === 'kurz') {
    const inG = (grp, id) => S.groups[grp].includes(id);
    gAll.forEach(g => { ok(inG(g.group, g.a) && inG(g.group, g.b), `${label}: Gruppenspiel mit fremdem Spieler`); ok(g.machine === (g.group === 'A' ? 1 : 2), `${label}: falscher Automat in Gruppe ${g.group}`); });
  } else gAll.forEach(g => ok(g.group === 'X' && (g.machine === 1 || g.machine === 2), `${label}: Automat/Gruppe`));
  // kein Spieler doppelt im selben Zeitslot, kein Automat doppelt belegt
  const bySlot = {};
  gAll.forEach(g => { (bySlot[g.slot] ||= []).push(g); });
  Object.entries(bySlot).forEach(([t, gs]) => {
    const ids = gs.flatMap(g => [g.a, g.b]); ok(new Set(ids).size === ids.length, `${label}: Spieler doppelt in Slot ${t}`);
    const ms = gs.map(g => g.machine + g.group); ok(new Set(ms).size === ms.length, `${label}: Automat doppelt in Slot ${t}`);
    if (S.format === 'lang') ok(gs.length <= 2, `${label}: mehr als 2 Spiele in Slot ${t}`);
  });
  // Anwurf gleichmäßig verteilt (max. 1 Unterschied je Gruppe)
  const groups = S.format === 'kurz' ? ['A', 'B'] : ['X'];
  groups.forEach(grp => {
    const gs = gAll.filter(g => g.group === grp), ids = new Set(gs.flatMap(g => [g.a, g.b]));
    const cnt = {}; ids.forEach(i => cnt[i] = 0); gs.forEach(g => cnt[g.a]++);
    const v = Object.values(cnt); ok(Math.max(...v) - Math.min(...v) <= 1, `${label}: Anwurf Gruppe ${grp} ungleich (${Math.min(...v)}–${Math.max(...v)})`);
  });
  // Doppelspiele direkt hintereinander (nur Metrik)
  let b2b = 0;
  groups.forEach(grp => { const gs = gAll.filter(g => g.group === grp).sort((x, y) => x.slot - y.slot); for (let i = 1; i < gs.length; i++) { const p = new Set([gs[i - 1].a, gs[i - 1].b]); if (p.has(gs[i].a) || p.has(gs[i].b)) b2b++; } });
  return b2b;
}

function playVorrunde(S, r) { S.vor.forEach(v => { v.winner = r() < 0.5 ? 1 : 2; v.ls = 1 + Math.floor(r() * 150); }); }

// unabhängige Neuberechnung der Tabelle
function refRank(ids, games, bull) {
  const st = {}; ids.forEach((id, i) => st[id] = { id, pts: 0, ls: 0, beat: new Set(), sn: i, bull: bull[id] || 999 });
  games.forEach(g => { if (!g.winner) return; const w = g.winner === 1 ? g.a : g.b, l = g.winner === 1 ? g.b : g.a; st[w].pts += 2; st[l].ls += g.ls; st[w].beat.add(l); });
  const arr = Object.values(st);
  arr.forEach(x => { const tied = arr.filter(o => o !== x && o.pts === x.pts && o.ls === x.ls); x.h = tied.length === 1 && x.beat.has(tied[0].id) ? 1 : 0; });
  return arr.sort((a, b) => b.pts - a.pts || a.ls - b.ls || b.h - a.h || a.bull - b.bull || a.sn - b.sn).map(x => x.id);
}

function playEndrunde(S, r, label) {
  let ctx = L.buildCtx(), guard = 0;
  ok(ctx.vorDone, `${label}: Vorrunde nicht fertig`);
  const total = ctx.end.length;
  // Slots/Automaten prüfen
  const bySlot = {};
  ctx.end.forEach(g => { ok(g.machine === 1 || g.machine === 2, `${label}: Endrunden-Automat`); (bySlot[g.slot] ||= []).push(g); });
  Object.entries(bySlot).forEach(([t, gs]) => { const ms = gs.map(g => g.machine); ok(new Set(ms).size === ms.length, `${label}: Endrunde Automat doppelt Slot ${t}`); ok(gs.length <= 2, `${label}: >2 Spiele Slot ${t}`); });
  // Abhängigkeiten: Folge-Spiele erst nach ihren Quellen
  const slotOf = Object.fromEntries(ctx.end.map(g => [g.key, g.slot]));
  ctx.end.forEach(g => [g.def.a, g.def.b].forEach(ref => { if (ref.t !== 'seed') ok(slotOf[ref.k] < g.slot, `${label}: ${g.key} vor seiner Quelle ${ref.k}`); }));
  while (!ctx.allDone && guard++ < total + 5) {
    const g = ctx.end.find(x => x.a && x.b && !(x.res && x.res.winner));
    if (!g) { ok(false, `${label}: Endrunde hängt (kein spielbares Spiel)`); break; }
    ok(g.a !== g.b, `${label}: ${g.key} Spieler gegen sich selbst`);
    S.end[g.key] = { winner: r() < 0.5 ? 1 : 2, ls: 1 + Math.floor(r() * 100), a: g.a, b: g.b };
    ctx = L.buildCtx();
  }
  ok(ctx.allDone, `${label}: Turnier wird nicht fertig`);
  return ctx;
}

function checkPlaces(ctx, S, label) {
  const N = ctx.units.length, ps = Object.keys(ctx.places).map(Number).sort((a, b) => a - b);
  eq(ps, Array.from({ length: N }, (_, i) => i + 1), `${label}: Plätze 1..${N} lückenlos`);
  ok(new Set(Object.values(ctx.places)).size === N, `${label}: Spieler mehrfach platziert`);
  // Finale-Sieger = Platz 1
  const fin = ctx.end.find(g => g.def.rule === 'finale');
  if (fin && fin.res) { const w = fin.res.winner === 1 ? fin.a : fin.b; ok(ctx.places[1] === w, `${label}: Finalsieger ist nicht Platz 1`); }
}

// ---------------------------------------------------------------------------------
section('1. Komplette Turniere: Einzel, alle Größen 6–20, Kurz & Lang, Freilos/Playoff, Kürzen');
let b2bTotal = 0, runs = 0, b2bWorst = 0;
for (let n = 6; n <= 20; n++) {
  for (const format of ['kurz', 'lang']) {
    if (format === 'lang' && n > 14) continue;             // Lang ist für große Felder unrealistisch (95+ Spiele), aber logisch trotzdem prüfen:
    for (const lastPlace of ['freilos', 'playoff']) {
      for (const endCut of [0, 8, 4]) {
        if (endCut >= n) continue;
        const label = `n=${n} ${format} ${lastPlace} cut=${endCut}`;
        try {
          const { S, startable, msgs } = setup({ n, format, lastPlace, endCut, seed: n * 100 + endCut });
          ok(startable, `${label}: nicht startbar ${msgs}`); if (!startable) continue;
          const b = checkVorrunde(S, label); b2bTotal += b; b2bWorst = Math.max(b2bWorst, b); runs++;
          const r = rng(n * 7 + endCut + 3); playVorrunde(S, r);
          // Tabelle gegen unabhängige Berechnung
          const ctx0 = L.buildCtx();
          Object.keys(ctx0.groups).forEach(g => eq(ctx0.stand[g].map(x => x.id), refRank(ctx0.groups[g], S.vor.filter(v => v.group === g), {}), `${label}: Tabelle Gruppe ${g}`));
          const ctx = playEndrunde(S, r, label);
          checkPlaces(ctx, S, label);
          // Zeitprognose passt zur tatsächlichen Anzahl Endrunden-Slots
          const e = L.estimate(format, n, S.rules, S.times, 0, lastPlace, endCut);
          eq(e.endSlots, new Set(ctx.end.map(g => g.slot)).size, `${label}: Prognose Endrunden-Slots`);
        } catch (err) { ok(false, `${label}: Ausnahme ${err.stack.split('\n').slice(0, 2).join(' ')}`); }
      }
    }
  }
}
console.log(`   ${runs} Turnierläufe, Vorrunde: Doppelspiele direkt hintereinander gesamt ${b2bTotal}, schlimmster Lauf ${b2bWorst}`);

section('2. Doppel-Modus (Teams), auch ungerade Spielerzahl');
for (let p = 6; p <= 20; p++) {
  for (const format of ['kurz', 'lang']) {
    const label = `Doppel p=${p} ${format}`;
    const { S, startable, msgs } = setup({ n: p, mode: 'double', format, seed: p });
    const nTeams = Math.floor(p / 2);
    if (format === 'kurz' && nTeams < 4) { ok(!startable, `${label}: Kurz mit ${nTeams} Teams müsste abgelehnt werden`); continue; }
    ok(startable, `${label}: nicht startbar ${msgs}`); if (!startable) continue;
    eq(S.teams.length, nTeams, `${label}: Teamanzahl`);
    const members = S.teams.flatMap(t => t.members); ok(new Set(members).size === p, `${label}: jeder Spieler genau in einem Team`);
    eq(S.teams.filter(t => t.members.length === 3).length, p % 2, `${label}: Dreierteam bei ungerader Zahl`);
    ok(S.teams.every(t => t.members.length >= 2 && t.name.includes(' & ')), `${label}: Teamnamen`);
    checkVorrunde(S, label);
    const r = rng(p + 11); playVorrunde(S, r); const ctx = playEndrunde(S, r, label); checkPlaces(ctx, S, label);
  }
}

section('3. Startbedingungen');
{
  let { startable } = setup({ n: 5, format: 'lang' }); ok(!startable, '5 Spieler müssen abgelehnt werden');
  ({ startable } = setup({ n: 21, format: 'lang' })); ok(!startable, '21 Spieler müssen abgelehnt werden');
  const S = L.defaultState(); L.setS(S); for (let i = 0; i < 8; i++) S.players.push({ id: L.uid(), name: 'X' + i }); S.mode = 'double'; S.format = 'lang';
  ok(!L.canStart().ok, 'Doppel ohne ausgeloste Teams darf nicht starten');
  S.mode = 'single'; S.format = 'kurz'; ok(!L.canStart().ok, 'Kurz ohne Gruppen darf nicht starten');
  L.drawGroups(); ok(L.canStart().ok, 'Mit Gruppen startbar');
  S.groups.A = S.groups.A.concat(S.groups.B.splice(0, 3)); ok(!L.canStart().ok, 'Zu ungleiche Gruppen müssen abgelehnt werden');
}

section('4. Tabelle & Tie-Breaker (handgebaute Fälle)');
{
  const ids = ['a', 'b', 'c', 'd'], U = Object.fromEntries(ids.map((id, i) => [id, { name: id.toUpperCase(), sn: i + 1 }]));
  const G = (a, b, w, ls) => ({ a, b, winner: w, ls });
  // Punkte vor Score
  // a schlägt b und c (4 Pkt.), b und c haben je 1 Sieg + 1 Niederlage: b verlor mit 20 Rest, c mit 50 → b vor c
  let st = L.standings(ids, [G('a', 'b', 1, 20), G('c', 'd', 1, 20), G('b', 'd', 1, 5), G('a', 'c', 1, 50)], U, {});
  eq(st.map(x => x.id), ['a', 'b', 'c', 'd'], 'gleiche Punkte: niedrigerer Verlierer-Score (b 20 < c 50) steht vorn');
  // mehr Punkte schlägt immer besseren Score
  st = L.standings(['a', 'b', 'c'], [G('a', 'b', 1, 150), G('b', 'c', 1, 150), G('c', 'a', 1, 1)], { a: U.a, b: U.b, c: U.c }, {});
  ok(st.every(x => x.pts === 2), 'Dreierkreis: alle 2 Punkte');
  eq(st.map(x => x.id), ['a', 'b', 'c'], 'Dreierkreis ungleicher Score: a (1) vor b und c (150), b schlug c direkt');
  // Dreierkreis mit exakt gleichem Score: nicht auflösbar → tie-Flag
  st = L.standings(['a', 'b', 'c'], [G('a', 'b', 1, 50), G('b', 'c', 1, 50), G('c', 'a', 1, 50)], { a: U.a, b: U.b, c: U.c }, {});
  ok(st.every(x => x.tie), 'Dreierkreis mit gleichem Score kann ohne Ausbullen nicht aufgelöst werden → tie-Flag');
  // Dreierkreis mit Ausbullen
  st = L.standings(['a', 'b', 'c'], [G('a', 'b', 1, 50), G('b', 'c', 1, 50), G('c', 'a', 1, 50)], { a: U.a, b: U.b, c: U.c }, { c: 1, a: 2 });
  eq(st.map(x => x.id), ['c', 'a', 'b'], 'Ausbullen-Rang 1 vor 2 vor ohne Rang');
  ok(st.every(x => !x.tie), 'nach Ausbullen keine offene Gleichheit');
  // genau 2 Gleichstand → direkter Vergleich
  st = L.standings(['a', 'b', 'c', 'd'], [G('a', 'b', 2, 30), G('a', 'c', 1, 10), G('a', 'd', 2, 10), G('b', 'c', 1, 10), G('b', 'd', 1, 20), G('c', 'd', 1, 40)], U, {});
  // a: 1 Sieg (c), b: 3 Siege, c: 1 Sieg+? -> prüfe nur: b zuerst; bei Gleichstand zweier Spieler entscheidet das direkte Duell
  eq(st[0].id, 'b', 'Spieler mit den meisten Punkten ist vorn');
  // Startnummer als letzte Instanz
  st = L.standings(['a', 'b'], [], { a: U.a, b: U.b }, {});
  eq(st.map(x => x.id), ['a', 'b'], 'ganz ohne Ergebnisse gilt die Startnummer');
}

section('5. Auto-Speichern (commitGame) und Kürzen (setEndCut) mit Blockade');
{
  const { S } = setup({ n: 14, format: 'kurz', seed: 5 });
  playVorrunde(S, rng(5)); let ctx = L.buildCtx(); ok(ctx.end.length === 13, 'Demo-Größe: 13 Endrunden-Spiele');
  const k2a = ctx.end.find(g => g.key === 'K2a');
  // Ergebnis eines Kreuzspiels via commitGame
  L.UI.edit = { K2a: { w: 1, ls: '12' } }; ok(L.commitGame('K2a'), 'commitGame speichert gültiges Ergebnis');
  ok(S.end.K2a && S.end.K2a.winner === 1 && S.end.K2a.ls === 12, 'Ergebnis steht im Zustand');
  L.UI.edit = { K2a: { w: 2, ls: '99999' } }; ok(!L.commitGame('K2a'), 'ungültiger Rest (> Punktzahl) wird abgelehnt');
  L.UI.edit = { K3a: { w: 2 } }; ok(!L.commitGame('K3a') && !S.end.K3a, 'Sieger ohne Rest wird (noch) nicht gespeichert');
  L.UI.edit = { K2a: { w: 2 } }; ok(L.commitGame('K2a') && S.end.K2a.winner === 2 && S.end.K2a.ls === 12, 'Sieger nachträglich ändern behält den Rest');
  L.UI.edit = {};
  // Kürzen auf 4 muss blockiert werden (K2a im unteren Block gespielt), auf 8 darf es
  S.endCut = 0; L.setEndCut(4); eq(S.endCut, 0, 'Kürzen auf 4 wird blockiert, wenn entfallendes Spiel gespielt ist');
  L.setEndCut(8); eq(S.endCut, 8, 'Kürzen auf 8 erlaubt (K2a bleibt)');
  L.setEndCut(0); eq(S.endCut, 0, 'zurück auf komplett');
}

section('6. Nachträgliche Korrektur in der Vorrunde (Endrunde schon gespielt)');
{
  const { S } = setup({ n: 14, format: 'kurz', seed: 9 }); const r = rng(9);
  playVorrunde(S, r); let ctx = playEndrunde(S, r, 'Korrektur');
  const before = JSON.stringify(ctx.places);
  // Ein Ergebnis im Spitzenspiel der Gruppe A umdrehen
  const top = S.vor.filter(v => v.group === 'A').slice(0, 6); top.forEach(v => { v.winner = v.winner === 1 ? 2 : 1; });
  let threw = false, c2; try { c2 = L.buildCtx(); } catch (e) { threw = true; }
  ok(!threw, 'Korrektur wirft keinen Fehler');
  if (c2) { const stale = c2.end.filter(g => g.stale).length; ok(stale > 0 || JSON.stringify(c2.places) !== before, 'Änderung wird erkannt (veraltete Spiele oder neue Plätze)'); console.log(`   nach Korrektur: ${stale} Spiele als „Paarung geändert“ markiert`); }
}

section('7. Speichern/Laden (JSON-Backup) und alte Spielstände');
{
  const { S } = setup({ n: 12, format: 'kurz', seed: 3 }); const r = rng(3); playVorrunde(S, r); const ctx = playEndrunde(S, r, 'Backup');
  const json = JSON.stringify(S); const back = Object.assign(L.defaultState(), JSON.parse(json)); L.setS(back);
  eq(L.buildCtx().places, ctx.places, 'Plätze nach JSON-Roundtrip identisch');
  // Alter Stand ohne neue Felder (endCut, start, rules.in)
  const old = JSON.parse(json); delete old.endCut; delete old.start; delete old.startRule; Object.values(old.rules).forEach(x => delete x.in);
  const o = Object.assign(L.defaultState(), old); L.setS(o);
  let threw = false; try { L.buildCtx(); L.render(); } catch (e) { threw = true; console.log(e.stack); }
  ok(!threw, 'Alter Spielstand ohne neue Felder lässt sich laden und anzeigen');
  // Render aller Tabs ohne Ausnahme
  for (const tab of ['setup', 'vor', 'end', 'result']) { o.tab = tab; let t = false; try { L.render(); } catch (e) { t = true; console.log(tab, e.stack); } ok(!t, `Render Tab ${tab} fehlerfrei`); }
}

section('8. Zufallstest: 300 Turniere mit zufälligen Einstellungen');
{
  let bad = 0;
  for (let i = 0; i < 300; i++) {
    const r = rng(1000 + i), n = 6 + Math.floor(r() * 15), mode = r() < 0.3 ? 'double' : 'single';
    const format = r() < 0.75 ? 'kurz' : 'lang', lastPlace = r() < 0.5 ? 'freilos' : 'playoff', endCut = [0, 0, 8, 4][Math.floor(r() * 4)];
    if (format === 'lang' && n > 14) continue;
    const label = `Zufall#${i} n=${n} ${mode} ${format} ${lastPlace} cut=${endCut}`;
    try {
      const { S, startable } = setup({ n, mode, format, lastPlace, endCut, seed: i + 1 });
      if (!startable) continue;
      const units = L.getUnits().length; if (endCut >= units) continue;
      checkVorrunde(S, label); playVorrunde(S, r); const ctx = playEndrunde(S, r, label); checkPlaces(ctx, S, label);
      [ 'setup', 'vor', 'end', 'result' ].forEach(t => { S.tab = t; L.render(); });
    } catch (e) { bad++; ok(false, `${label}: Ausnahme ${e.stack.split('\n').slice(0, 2).join(' ')}`); }
  }
  ok(bad === 0, 'Zufallsläufe ohne Ausnahmen');
}

// ---------------------------------------------------------------------------------
console.log(`\nErgebnis: ${pass} Prüfungen bestanden, ${fail} fehlgeschlagen`);
if (fail) { console.log('\nFehlschläge:\n - ' + failures.join('\n - ')); process.exit(1); }
