# Deutsche Spielansagen — Quellen und Aufbereitung für 1.1

Dieser Ordner bewahrt die unveränderten WevoLabs-Studioaufnahmen und ihre Textzuordnung. Version 1.1 verwendet **vier neue Aufnahmen mit Seraphina Multi bei 1,00×**. Ihre 159 archivierten Ansagen ergeben 144 benötigte Laufzeitclips. In die APK gelangen nur die fertigen Dateien aus `www/audio/`, keine vollständigen Studioaufnahmen.

## Dateien

| Datei bzw. Verzeichnis | Inhalt |
|---|---|
| `studio-normal-01.txt` bis `studio-normal-04.txt` | Vier neue Studiotexte mit insgesamt 159 Ansagen |
| `downloads/studio-normal-01.mp3` bis `studio-normal-04.mp3` | Unveränderte neue Studio-Downloads vom 22. Oktober 2026 |
| `studio-blocks.json` | Aktive, vollständige Quellenzuordnung und Einstellungen der normalen Neuaufnahme |
| `studio-normal-blocks.json` | Zusätzlich erhaltene Zuordnung der neuen Aufnahmeblöcke |
| `voice-manifest.json` | Herkunft, Hashes und Schnittpositionen der 144 eingebetteten Ansagen |
| `studio-blocks-v1.json`, `studio-block-*.txt`, `studio-v1-01.txt` und zugehörige Downloads | Historische Quellen der früheren Aufnahmen mit 0,90× |
| `prepare_blocks.py` | Bereitet Aufnahmeblöcke aus einer Sprachliste vor |
| `split_studio_audio.py` | Prüft und schneidet vorhandene Aufnahmen lokal |

**159 Archivtexte und 144 Laufzeittexte sind beabsichtigt.** Nicht mehr benötigte Sätze bleiben in den unveränderten Originalaufnahmen erhalten. Die aktive Zuordnung in `studio-blocks.json` darf nicht mit den älteren Downloads kombiniert werden.

## Vorhandene Aufnahmen erneut aufbereiten

Benötigt werden Python 3, FFmpeg und ffprobe. Aus dem Projektverzeichnis:

```sh
python3 voice-source/split_studio_audio.py --analyze-only
python3 voice-source/split_studio_audio.py
npm run test:audio
```

Der erste Aufruf kontrolliert alle Schnittgrenzen. Der zweite schreibt die benötigten MP3-Dateien, `www/voices.js` und `voice-source/voice-manifest.json`. Standardmäßig bestimmt `tests/voice-lines.json`, welche Sätze gebraucht werden; `--required-lines` erlaubt eine andere Liste.

Zunächst werden sämtliche 159 archivierten Texte und ihre Grenzen geprüft. Danach werden die 144 aktuell benötigten Clips ausgewählt und bekannte veraltete Laufzeitclips anhand der vorherigen Quellenzuordnung entfernt. Die Originaldownloads bleiben unverändert. Bei einer unpassenden Zahl langer Trennpausen bricht das Skript ab, statt Textpositionen zu schätzen.

## Neue Ansagen aufnehmen

1. Den begrenzten Wortschatz im Spiel und in `AppVoiceLines` einschließlich `CarePlay.voiceLines` sowie `Minigames.voiceLines` aktualisieren. `tests/voice-lines.json` enthält exakt die tatsächlich benötigten vollständigen Texte.
2. Für zusätzliche Sätze einen eindeutig benannten neuen Aufnahmeblock und die zugehörige Ergänzung in `studio-blocks.json` anlegen. Vorhandene Quellen erhalten.
3. Im [deutschen WevoLabs-Studio](https://wevolabs.com/de) aufnehmen: **Seraphina Multi, 1,00× / Regler 0, Tonhöhe 0 Hz, Lautstärke 100 %, keine Hintergrundmusik**.
4. Den unveränderten Download unter dem vermerkten Namen in `downloads/` ablegen. Wortlaut und Reihenfolge müssen genau zur Quellenzuordnung passen.
5. Zuerst `--analyze-only`, danach Aufbereitung und Audioprüfung ausführen. Zusätzlich die tatsächlich gesprochenen Laufzeitlisten mit dem fertigen Index abgleichen.

`[[p3000]]` trennt Ansagen durch drei Sekunden Studiopause. Jeder Aufnahmeblock bleibt unter 5.000 Zeichen. Die Spieltexte benötigen keine persönlichen Angaben oder Zugangsdaten.

`prepare_blocks.py` kann die gesamte Sprachliste neu aufteilen. Das erfordert eine passende vollständige Neuaufnahme; bereits vorhandene Audios passen anschließend nicht automatisch zur neuen Reihenfolge.

## Technische Eigenschaften

Die fertigen 144 MP3-Clips enthalten 24.000 Hz, einen Kanal und 64 kbit/s; zusammen **6.001.680 Bytes und 745,94 Sekunden**. Lange Trennpausen werden entfernt; etwa 120 ms Vorlauf und 180 ms Nachlauf sowie innere Satzpausen bleiben erhalten.

Die Textnormalisierung verwendet Unicode NFC und vereinheitlichte Leerzeichen, ohne Satzzeichen oder Großschreibung zu verändern. Text- und Audiohashes machen die Herkunft nachvollziehbar. Die Python-Programme senden keine Anfragen an den Sprachdienst. Einstellungen und Quellen sind in [VOICE-CREDITS.md](../VOICE-CREDITS.md) zusammengefasst.
