# Wimeloo — isometrische Lernspielwelt

Wimeloo ist der neue Name von **Sternenbaby**, einem Offline-Android-Tabletspiel mit isometrischer Touch-Welt, Babyfürsorge, Musik, Geschichten und sechs Lernminispielen.

## Projektstand

Dieses Repository wird für den Import des vollständigen Quellcodes vorbereitet. Der vorbereitete Workflow darf **kein** Release erzeugen, solange der vollständige App-Quellstand und die ursprüngliche private Signieridentität nicht verfügbar sind.

## Browser-Dev-Modus (Quellcodepaket 1.2.0)

Nach Übernahme des kompletten `www/`-Verzeichnisses:

```sh
python3 -m http.server 8080 --directory www
```

Browser: `http://localhost:8080/?dev=1`. Umschalten mit `Ctrl+Shift+D`. Das Diagnosepanel zeigt Raster, Kameraposition, Zoom, Touch-Ziele, laufende Figuren und den Kapitelstatus; es ist nicht in der Android-App aktiv. Entwickleransicht arbeitet ohne Cloudverbindung.

## Android-Kompatibilität

- Sichtbarer Name: **Wimeloo**
- Interne Paketkennung bleibt **`de.sternenbaby.app`**, damit das Update alte Installationen erkennt
- Ursprung und Speicher-Keys bleiben unverändert
- Version `1.2.0`, `versionCode 4`
- APK muss mit **dem ursprünglichen** Signaturzertifikat erzeugt werden

## Veröffentlichung

Die vorgesehenen GitHub Actions bauen nach dem Import der kompletten App den Quellcode und eine signierte APK. Die ursprüngliche `sternenbaby-release.p12` und das Passwort sind ausschließlich als GitHub Actions Secrets `WIMELOO_KEYSTORE_B64` (base64) und `WIMELOO_KEYSTORE_PASSWORD` bereitzustellen. Keinesfalls die Schlüsseldatei committen oder als Release Asset veröffentlichen.

Der Workflow prüft das erwartete öffentliche Zertifikat `25db9b0f7c00d99f4d9d57ea7aceb5c26392b86ad81c5f34e01185df220fa951`. Ohne identischen Signierer wird kein APK-Release veröffentlicht.

Hintergrund: [Entwicklermodus](docs/DEVELOPER_MODE.md) · [Agentenanweisungen](AGENTS.md).

**Hinweis:** Der vollständige Quellcode (einschließlich Offline-Sprachdateien) liegt derzeit noch nicht in diesem Repository. Die vorbereitete CI aktiviert sich erst nach dem Import.