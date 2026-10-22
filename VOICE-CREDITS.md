# Deutsche Sprachausgabe — Sternenbaby 1.1.0

Alle **144 aktuell benötigten deutschen Ansagen** wurden für Version 1.1 im [deutschen WevoLabs-Studio](https://wevolabs.com/de) neu mit **normaler Sprechgeschwindigkeit** erzeugt. Die eigenen Spieltexte werden über `www/voices.js` ihren MP3-Dateien in `www/audio/` zugeordnet und vollständig offline abgespielt.

## Aufnahme und Format

| Einstellung | Wert |
|---|---|
| Anbieter | WevoLabs |
| Stimme im Studio | Seraphina Multi, Deutsch / Deutschland |
| Stimmkennung | `de-DE-SeraphinaMultilingualNeural` |
| Sprechgeschwindigkeit | **1,00×**, Regler 0 |
| Tonhöhe | 0 Hz |
| Lautstärke bei Erzeugung | 100 % |
| Hintergrundmusik bei Erzeugung | Keine |
| Datum der Neuaufnahme | 22. Oktober 2026 |
| Neue unveränderte Studio-Downloads | 4 Dateien, `studio-normal-01.mp3` bis `studio-normal-04.mp3` |
| In diesen Quellen enthaltene Ansagen | 159 |
| Tatsächlich eingebettete Ansagen | 144 |
| Format der fertigen Clips | MP3, 24.000 Hz, mono, 64 kbit/s |
| Gesamtgröße der fertigen Clips | **6.001.680 Bytes** / rund 5,72 MiB |
| Gesamtdauer der fertigen Clips | **745,94 Sekunden** / rund 12 Minuten 26 Sekunden |

Die 15 zusätzlichen Ansagen der neuen Studioaufnahmen bleiben im Quellenarchiv. Die Laufzeit benötigt genau die 144 ausgewählten Texte. Die älteren Aufnahmen mit 0,90× bleiben ebenfalls als historische Quellen erhalten und werden in Version 1.1 nicht als Laufzeitpaket verwendet.

## Herkunft und lokale Verarbeitung

Die Aufnahmen wurden über die normale sichtbare Studiooberfläche erstellt. Unveränderte Downloads und Textblöcke liegen unter `voice-source/`. Die eigenen Texte enthalten weder Originaldialoge noch Songs aus einem Film. Die Erzählerstimme ist keine Stimme der Filmfiguren oder ihrer Sprecherinnen.

`voice-source/studio-blocks.json` dokumentiert Einstellungen, Reihenfolge und alle 159 Ansagen der Neuaufnahme. Lange Trennpausen mit der Studiomarkierung `[[p3000]]` ermöglichen die lokale Aufteilung. Das Skript prüft die Anzahl dieser Grenzen gegen jeden Aufnahmeblock und bricht bei Abweichungen ab. Es entfernt die Trennpausen, behält etwa 120 ms Vorlauf und 180 ms Nachlauf sowie innere Satzpausen und wählt die 144 Laufzeittexte aus.

`voice-source/voice-manifest.json` enthält Originaldateien, Text- und Audiohashes sowie Schnittpositionen jedes ausgelieferten Clips. Die Textzuordnung verwendet Unicode NFC, zusammengefasste Leerzeichen und getrimmte Ränder; Großschreibung und Satzzeichen bleiben erhalten. Die Aufbereitungsprogramme arbeiten ausschließlich mit lokalen Dateien. Anleitung: [voice-source/README.md](voice-source/README.md).

## Wiedergabe und Musik

Beim Spielen wird kein Sprachdienst aufgerufen. Die APK enthält keine WevoLabs-Zugangsdaten. Eine bereits installierte lokale deutsche Android-Stimme ist lediglich ein technischer Ersatz; die aktuellen benötigten Texte sind vollständig mit WevoLabs vertont. Auch der technische Sprachfallback verwendet normale Geschwindigkeit.

Musik und Effekte entstehen separat in `www/audio.js` aus eigenen synthetisierten Tönen. Sie sind kein Teil der Sprachaufnahmen. Im Elternbereich sind Musik, Sprache und Effekte getrennt einstellbar; Standardwerte: 75 %, 100 % und 65 %. Während einer Ansage wird Musik vorübergehend abgesenkt. Digitale 100 % bezeichnen keinen bestimmten Schalldruck am Tablet; dessen Medienlautstärke und Lautsprecher wirken zusätzlich.

## Quellen und Prüfung

Anbieter: [WevoLabs](https://wevolabs.com/de), [Nutzungsbedingungen](https://wevolabs.com/terms-service). Die Herkunftsdateien bewahren den dokumentierten Stand der Erzeugung.

Die aktuelle Prüfung bestätigt 144 benötigte Texte, 144 Indexeinträge, 144 eindeutige Dateien und 144 gültige MP3-Streams mit ffprobe. Die tatsächliche Laufzeit meldet ebenfalls 144 Texte ohne fehlende Zuordnung. Nachweise: [Audio-Prüfung](verification/audio-pack-v11.txt) und [Laufzeit-Abdeckung](verification/voice-runtime-v11.json). Ein vollständiger Hörtest auf dem Zieltablet und ein echter Android-Geräte- oder Emulatorlauf stehen aus.
