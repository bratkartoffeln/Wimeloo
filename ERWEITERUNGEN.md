# Sternenbaby 1.1 erweitern

Die gemeinsame Welt verbindet sechs Lernspiele, vier Pflegeabläufe, eine Galerie und die zentrale Fortschrittsverwaltung. Neue Inhalte werden als lokale Dateien mit einem APK-Update ausgeliefert. Die folgenden Schnittstellen entsprechen Version 1.1.0.

## Lernspiel-Schnittstelle

```js
const difficulty = GameState.data.settings.difficulty;
const session = Minigames.open('shapes', {
  container: document.getElementById('mini-host'),
  difficulty,
  reducedMotion: GameState.data.settings.reduceMotion,
  speak: text => { /* zugeordnete lokale Aufnahme abspielen */ },
  sound: midi => { /* lokalen Ton im passenden Kanal erzeugen */ },
  onComplete: result => { /* Abschluss einmal zentral verbuchen */ },
  onClose: () => { /* ohne Abschluss zur Welt zurückkehren */ }
});

session.setPaused(true);
session.setPaused(false);
const status = session.snapshot();
session.destroy();
```

`close()` beendet die Sitzung über den Schließen-Callback. `destroy()` räumt Oberfläche, Listener, Timer und Animationen auf. Pause muss Eingaben und Fortschritt anhalten und geplante Klangfolgen abbrechen. Die laufende Aufgabe bleibt beim Fortsetzen erhalten.

Ein Abschluss nach drei Aufgaben liefert beispielsweise:

```js
{
  gameId: 'music', assisted: false, score: 3,
  difficulty: 2, mistakes: 1,
  skill: 'Klangfolgen merken und Melodien erfinden',
  creation: {type: 'melody', notes: [60, 64, 67, 64], tempo: 100}
}
```

`app.js/startGame` übernimmt bereits die komplette Verbuchung: `GameState.recordGame`, gegebenenfalls die Konzertmelodie, `GameState.recordCreation`, Erinnerung und Tagesaufgabe, anschließend Speicherung und Rückkehr zur Welt. **Module schreiben diese Abschlüsse nicht zusätzlich selbst.** Nur `recordGame` erhöht Spielzähler und Übungsstand. Hilfe vermindert weder Abschlusszahl noch Freischaltungen.

`Minigames.catalog` liefert Kennung, Titel, Symbol und Lernangebot. Die vorhandenen Kennungen sind `sorting`, `counting`, `music`, `shapes`, `memory` und `patterns`.

## Eigene Werke speichern

`GameState.recordCreation(gameId, creation)` validiert und kopiert die Daten in `GameState.data.creations`. Gespeichert wird das zuletzt abgeschlossene Werk je Spieltyp. Ein ungültiges neues Werk ersetzt kein gültiges vorhandenes Werk. Der Aufruf erhöht keine Spielzähler. `Minigames.creationArt(creation)` erzeugt das passende SVG für Album und Großansicht.

| Kennung | `creation.type` | Validierter Inhalt |
|---|---|---|
| `sorting` | `outfit` | Bis zu 4 `items` mit `type` aus suit/bib/hat/sock, Hex-Farbe und Muster star/dots/stripe |
| `counting` | `picnic` | `guests` von 2 bis 8 |
| `music` | `melody` | Bis zu 16 `notes` aus 60/62/64/67/69, begrenztes `tempo`; der aktuelle Komponist bietet 8 Töne |
| `shapes` | `garden` | Bis zu 5 eindeutige `flowers` aus circle/triangle/square/rectangle/hexagon |
| `memory` | `memory` | Bis zu 8 eindeutige `pictures` aus der Symbol-Positivliste |
| `patterns` | `pattern` | Bis zu 16 `symbols` aus derselben Positivliste; Wiederholungen bleiben erhalten |

Die zulässigen Symbole stehen in `state.js`. Unbekannte Schlüssel, ungeeignete Datentypen und fremde Spielformate werden beim Import ausgefiltert. Neue Werktypen benötigen sowohl `cleanCreation` als auch Albumdarstellung und Tests für Export, Import und Neustart.

## Ein weiteres Spiel ergänzen

1. Eine eindeutige Kennung, Renderer, Aufgaben, Hinweise, Eingaben und Abschluss in `minigames.js` ergänzen; `catalog` und Startauswahl erweitern. Größere Module können eigene lokale Dateien erhalten.
2. Menü und Aktionsverteilung in `app.js` ergänzen. In `world.js` einen erreichbaren Gegenstand mit passender Aktionskennung anlegen. Grafikgrenzen, belegte Gitterfelder und Interaktionsposition müssen übereinstimmen.
3. `GAMES` in `state.js` sowie gegebenenfalls `cleanCreation` erweitern. Fehlende Felder alter Spielstände erhalten Standardwerte; vorhandener Fortschritt bleibt bestehen.
4. Eine Album-Erinnerung in `MEMORY`, bei Bedarf Kapitelaufgaben in `CHAPTERS` und die passende Tagesaufgabe ergänzen.
5. Alle gesprochenen Texte in den Laufzeitlisten registrieren und mit WevoLabs bei 1,00× aufnehmen. Siehe [voice-source/README.md](voice-source/README.md).
6. Alle drei Stufen, falsche Versuche, Hilfe, Drag und Tippalternative, genau einen Abschluss, Pause, Abbruch und Speicherung prüfen.

Spiele sollen ohne Lesen und ohne Zeitdruck bedienbar bleiben. Eine sinnvolle Handlung verändert die Szene sichtbar: Kleidung wird angezogen, Becher werden verteilt, Wasser lässt Pflanzen wachsen. Ziehen erhält eine Tippalternative. Bei Memory bleiben Vorschau und Fehlpaare so lange sichtbar, wie das Kind möchte.

## Pflege und Figuren

`CarePlay.open(container, options)` erhält `id`, `role`, `stage`, `outfit`, `reducedMotion`, `steps`, `speak`, `sound`, `melody` und `onComplete`. Gültige Tätigkeiten sind `feed`, `fresh`, `play` und `sleep`, jeweils mit drei Schritten.

Die Rückgabe bietet `setPaused(boolean)`, `destroy()` und den Getter `snapshot` mit Schritt, Fortschritt, Abschlussstatus, Pause und Outfit. Im Unterschied zum Minispiel wird der Pflegestatus als `session.snapshot` gelesen. `app.js` verbucht eine Pflege erst nach allen Schritten und verhindert einen mehrfachen Abschluss. Abbrechen erzeugt keinen Pflegeabschluss.

`Art.drawCareScene(ctx, options)` zeichnet den tatsächlichen Handlungsstand. Wichtige Optionen sind `type`, `step`, `progress`, `time`, `role`, `stage`, `blanket`, `outfit`, `active`, `reducedMotion` und `completed`. Figur und Baby werden über das gemeinsame Rigg gezeichnet. Neue Posen müssen die bestehenden beiden Arme umstellen; keine zusätzlichen kompletten Arme über eine Grundfigur malen.

## Weltgesten und Kamera

Weltobjekt und zugehöriges Bildsymbol verwenden denselben Weg zum Interaktionsziel. Die Pointer-Verarbeitung unterscheidet Tippen, Verschieben und Pinch; abgebrochene Gesten lösen keine Aktion aus. Die Symbole werden in Weltkoordinaten verankert und gemeinsam mit dem Canvas aktualisiert. Nachträgliches Verschieben durch Bildschirm-Kollisionslayout oder eine zusätzliche CSS-Transformation würde diese Verankerung aufheben.

```js
world.setZoom(scale, {x: 600, y: 300}); // Anker in Canvas-Bildschirmpixeln
world.zoomBy(1.25);                   // Standardanker im sichtbaren Spielbereich
world.resetCamera();                 // Gesamtübersicht
```

Die Grenzen stehen in `world.minZoom` und `world.maxZoom`. Der maximale Maßstab ist `Math.max(3.2, world.fit * 4.5)`. `Art.bounds` beschreibt die anklickbaren Gegenstandsgrenzen. Neue Objekte müssen bei Wegeplanung, Tiefensortierung und Symbolhöhe berücksichtigt werden.

## Animation, Audio und Lebenszyklus

`reducedMotion` reduziert dekorative Bewegung; notwendige Zustandswechsel bleiben erkennbar. Minispiele verwenden `mg-reduced-motion` und `mg-is-paused`. JavaScript-Timer, laufende Gesten und Web-Animationen benötigen zusätzlich Pause und Aufräumlogik. Nach `destroy()` darf kein verspäteter Ton, DOM-Zugriff oder Abschluss erfolgen.

`world.react(action)` und `world.celebrate()` lösen Weltreaktionen aus. `Art.drawCharacter` verarbeitet unter anderem `action`, `actionProgress`, `time` und `reducedMotion`. `GameAudio.note` und `GameAudio.playMelody` erzeugen Klänge lokal. Neue Audioaktionen beachten den gemeinsamen Tonschalter, den richtigen Lautstärkekanal und `nativepause`.

Der begrenzte gesprochene Wortschatz besteht aus `AppVoiceLines` einschließlich `CarePlay.voiceLines` sowie `Minigames.voiceLines`. Zusammen müssen diese exakt von `tests/voice-lines.json`, `www/voices.js` und den lokalen MP3-Dateien abgedeckt sein.

## Spielstand und weitere Inhalte

Version 1.1.0 behält **Schema 2**, die Origin und die Schlüssel `sternenbaby.state.v1` / `sternenbaby.state.backup.v1`. Schema 1 und 2 werden übernommen; fehlende `creations` werden `{}`. Die Sicherung verwendet `format: 'sternenbaby-save'`, `formatVersion: 1`, App-Version, Exportdatum und bereinigten Spielstand. `inspectImport` prüft vorab, `importSave` ersetzt erst nach erfolgreichem Schreiben. Grenze: 1 MiB.

Dekorationen benötigen Kennung, Freischaltschwelle und Zeichnung; die vorhandenen Schwellen sind 0, 2, 4, 7, 10 und 14 vollständige Spielabschlüsse. Neue Kapitel benötigen Erzähltext, Erinnerung, Aufgaben und eine passende Obergrenze in der Validierung. Alte Kennungen bleiben erhalten. Abwesenheit verändert keine Pflegewerte, entfernt keinen Fortschritt und erzeugt keine Pflicht zur täglichen Rückkehr.

## Prüfen und bauen

```sh
npm test
npm run test:world
npm run test:minigames
npm run test:care
npm run test:art
npm run test:release
npm run test:audio
npm run test:mix
python3 android/tests/run-save-transfer.py
python3 android/tests/run-byte-range.py
python3 android/build.py
```

Für Browserprüfungen werden Playwright und Chromium benötigt. `PLAYWRIGHT_MODULE` und `BROWSER_EXECUTABLE` erlauben vorhandene Installationen. Zusätzliche direkte Pflegeszene-Touchtests: `node tests/care-hotspots-v11.cjs`. Ergebnisse und Prüfgrenzen: [verification/TESTERGEBNISSE.md](verification/TESTERGEBNISSE.md).

Für ein APK-Update Paketname und Signierschlüssel beibehalten, `versionCode` erhöhen und Manifest, Buildversion, sichtbare Version sowie Exportmetadaten gemeinsam aktualisieren. Der reale Android-Gerätetest bleibt ein eigener Freigabeschritt.
