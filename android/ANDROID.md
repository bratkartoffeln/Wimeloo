# Wimeloo 1.2.0 — native Android-Hülle

**Paket:** `de.sternenbaby.app` · **Version:** `1.2.0` · **versionCode:** `4` · **Minimum:** Android 8.0 / API 26 · **Target:** API 35.

Die APK enthält das vollständige Spiel und 144 deutsche Sprachclips als lokale Dateien. Eine native Java-Activity stellt die Inhalte in der Android-System-WebView dar. Es wird kein externes Browserfenster geöffnet. Die APK enthält keine nativen ABI-Bibliotheken; der Build ist universal. Das Manifest setzt kein `maxSdkVersion`. Die Funktionsbestätigung auf konkreten Android-Versionen erfordert weiterhin einen Gerätetest.

## Build unter Linux

Voraussetzungen: Java 17 mit `jdk.compiler`, `jdk.jartool` und `keytool`, Python 3 sowie Android Platform API 35 Revision 2 und Build Tools 35.0.0. Der Build verwendet aapt2, D8, zipalign und apksigner, Java-8-Bytecode und keine Gradle-, AndroidX- oder Maven-Laufzeitabhängigkeiten.

Aus dem Projektverzeichnis:

```sh
python3 android/fetch-toolchain.py
python3 android/build.py --check-native
python3 android/build.py
```

`fetch-toolchain.py` lädt bei Bedarf die festgelegten offiziellen Google-SDK-Archive, prüft ihre SHA-256 und legt die benötigten Werkzeuge neben dem Projekt unter `toolchain/` ab. `--check-native` prüft die native Hülle. Der vollständige Build übernimmt die Dateien aus `www/` und erzeugt:

**`android/build/outputs/Wimeloo-1.2.0.apk`**

Mit `--web-dir` und `--toolchain-dir` können andere Quell- und Werkzeugverzeichnisse angegeben werden. Signatur, ZIP-Ausrichtung, Paketidentität, SDK-Stufen, vollständige Web-Assets und das Fehlen sämtlicher Android-Berechtigungen werden abschließend geprüft. Buildberichte entstehen neben der APK; die Release-Nachweise liegen zusätzlich unter `verification/`.

## Update und Signierung

Version 1.1 verwendet dasselbe Paket und denselben Signierschlüssel wie die bisherigen Veröffentlichungen; der Code steigt auf 3. Die neue APK über die vorhandene Installation installieren. Eine vorherige Deinstallation oder das Löschen der App-Daten entfernt den privaten Spielstand.

Beim ersten vollständigen Build ohne vorhandenen Schlüssel erzeugt `build.py` einen RSA-3072-Schlüssel im PKCS#12-Format. Schlüssel und Passwort liegen unter `toolchain/build-state/`, außerhalb des App-Quellcodes. Verzeichnisrechte: `0700`, Dateirechte: `0600`. Ein vorhandener Schlüssel wird wiederverwendet und nicht automatisch ersetzt.

Dieses Verzeichnis privat und dauerhaft sichern. Es gehört weder in das Quellenpaket noch in ein öffentliches Repository. Ein anderer Schlüssel kann eine bestehende Installation nicht aktualisieren. Die APK enthält weder Schlüssel noch Passwort; der öffentliche Zertifikatsexport darf dem Release beiliegen.

Die aktuelle Paketprüfung bestätigt **156 byteidentische Web-Assets gegenüber dem getesteten Quellstand**, darunter 144 MP3-Dateien, und dieselbe Zertifikatsidentität wie die vorherige Veröffentlichung: [APK-Audit](../verification/apk-v11-audit.json).

## Lokale Origin und Daten

Startadresse:

```text
https://appassets.androidplatform.net/assets/www/index.html
```

Diese Adresse wird innerhalb der WebView aus APK-Assets beantwortet. Sie benötigt keinen Server. Die feste Origin erhält `localStorage` über Neustarts und Updates hinweg.

Das Manifest deklariert **keine Android-Berechtigungen**, insbesondere kein `INTERNET`. Die Hülle blockiert Netzwerkladevorgänge, fremde Navigation, Dateisystem-URLs sowie Kamera-, Mikrofon- und Standortanfragen. Alle Spielressourcen liegen lokal mit relativen URLs vor. Die Content Security Policy beschränkt Skripte, Medien und Verbindungen auf die vorgesehenen lokalen Quellen.

Automatische Android-Cloudsicherung und automatischer Gerätetransfer sind deaktiviert. Manuelle JSON-Sicherungen verwenden die Android-Dokumentauswahl ohne allgemeine Speicherberechtigung. Vor Gerätewechsel oder Deinstallation eine solche Datei exportieren.

## Native Schnittstelle

| JavaScript-Aufruf | Verhalten |
|---|---|
| `AndroidBridge.speak(text)` | Verwendet eine installierte deutsche Offline-Stimme; meldet `false`, wenn keine bereit ist |
| `AndroidBridge.speakAtVolume(text, volume)` | Offline-Sprachfallback mit Lautstärke 0–1; bei 0 stumm |
| `AndroidBridge.stopSpeaking()` | Stoppt native Sprache |
| `AndroidBridge.isSpeechAvailable()` | Meldet die Verfügbarkeit einer lokalen deutschen Stimme |
| `AndroidBridge.setFullscreen(boolean)` | Blendet Android-Systemleisten ein oder aus |
| `AndroidBridge.exportSave(json)` | Öffnet `ACTION_CREATE_DOCUMENT` und schreibt UTF-8 |
| `AndroidBridge.importSave()` | Öffnet `ACTION_OPEN_DOCUMENT`, liest höchstens 1 MiB und übergibt die Vorschau |

Die Activity sendet `nativeappready`, `nativespeechready`, `nativespeechunavailable`, `nativepause` und `nativeresume` an `window`. `window.onAndroidBack()` kann die Zurück-Aktion mit Rückgabewert `true` übernehmen; andernfalls erscheint die native Beenden-Abfrage.

Sicherungsergebnisse sind `CustomEvent`s:

| Ereignis | `event.detail` |
|---|---|
| `nativesaveexport` | `{ok:true}` oder `{cancelled:true}` |
| `nativesaveimport` | `{json:"…"}` oder `{cancelled:true}` |
| `nativesaveerror` | `{message:"…"}` |

`SaveTransfer.java` arbeitet im Hintergrundthread, begrenzt die Bytezahl, prüft UTF-8 streng und erlaubt eine optionale BOM. Die native Schicht prüft JSON-Struktur, `GameState.inspectImport` das Spielstandsformat. Erst die bestätigte Vorschau führt zu `GameState.importSave`; bei einem Schreibfehler bleibt der laufende Stand erhalten.

## Audio und Unterbrechungen

Alle 144 WevoLabs-Clips sind neu mit Seraphina Multi bei 1,00× aufgenommen. Die Hülle legt Audio unkomprimiert im APK-Container ab und unterstützt lokale MP3-, OGG-, WAV- und M4A-Dateien. Der Asset-Handler beantwortet einfache Byte-Range-Anfragen mit 206, `Content-Length` und `Content-Range`; ungültige Bereiche erhalten 416.

Lokale Medien dürfen ohne vorausgehende Berührung starten. Bei Android-Unterbrechungen sendet die Hülle `nativepause` und pausiert die WebView; die Spielseite stoppt Audio und hält Pflege sowie Minispiele an. Die Lautstärketasten steuern den Android-Medienkanal. Die App verändert die systemweite Lautstärke nicht selbst.

Native Sprache ist ein technischer Ersatz mit normalem Tempo. Akzeptiert werden nur bereits installierte deutsche Stimmen, deren Metadaten keine Netzwerkverbindung verlangen. Fehlende Android-Stimmen beeinträchtigen die gebündelten WevoLabs-Aufnahmen nicht. Details und Herkunft: [VOICE-CREDITS.md](../VOICE-CREDITS.md).

## Spielstand und Migration

Origin sowie Schlüssel `sternenbaby.state.v1` und `sternenbaby.state.backup.v1` bleiben erhalten. Version 1.1 verwendet weiterhin **Schema 2**. Schema-1- und bestehende Schema-2-Spielstände werden bereinigt übernommen; fehlende Werksammlungen beginnen mit `creations: {}`.

Mutterfigur, Babyname, Geschichte, Pflege, Spielabschlüsse, Erinnerungen, Melodie, Lautstärken und Figurenpositionen bleiben erhalten. Die sechs neuen Werktypen werden begrenzt validiert und in manuelle Sicherungen aufgenommen. Ein beschädigter primärer Stand kann aus der letzten gültigen Sicherungsfassung geladen werden. Unbekannte zukünftige Speicherformate und fremde Dateien werden abgewiesen; ein fehlgeschlagener Import überschreibt den laufenden Stand nicht.

## Prüfungen und Grenzen

```sh
npm test
npm run test:release
npm run test:audio
python3 android/tests/run-save-transfer.py
python3 android/tests/run-byte-range.py
python3 android/build.py --check-native
```

Die beiden portablen Java-Tests benötigen Java 17 und Python 3, keinen Emulator. Sie prüfen elf Fälle zur Dateilänge, UTF-8 und BOM sowie zwölf Fälle für Byte-Ranges. Diese Parserprüfungen bestätigen noch keine Android-Systemdialoge oder Medienwiedergabe.

Der finale Build vom 22. Oktober 2026 ist signiert und geprüft: [Buildbericht](../verification/build-report.json), [Manifest](../verification/manifest-badging.txt), [Signaturprüfung](../verification/signature-verification.txt). Alle fachlichen Ergebnisse stehen in [TESTERGEBNISSE.md](../verification/TESTERGEBNISSE.md).

**Kein echtes Android-Gerät und kein Emulator wurden verwendet.** Installation als Update, tatsächliche Systemdateiauswahl, Audio über Tablet-Lautsprecher und das Zusammenspiel mit der jeweiligen System-WebView müssen auf dem Zielgerät noch praktisch geprüft werden.


Wimeloo uses the legacy Android package and storage origin by design; see the main README for update compatibility and browser developer mode.
