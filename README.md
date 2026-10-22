# Wimeloo · Isometrische Spielwelt für Kinder

**Version 1.2.0 · Offline-Android-Tabletspiel und lokaler Browser-Entwicklermodus**

Wimeloo ist der neue Name der bisherigen App „Sternenbaby“. Drei Freundinnen begleiten die Geburt eines Babys und erleben gemeinsam Pflegehandlungen, Musik, Gestaltung und sechs Lernminispiele in einer isometrischen, per Touch begehbaren Welt. Deutschsprachige Audioanleitungen sind offline enthalten. Keine Registrierung, Werbung oder Internetberechtigung.

## Schnellstart

- **Android:** Release-APK `Wimeloo-1.2.0.apk` auf Android 8+ installieren, über der bisherigen Version (nicht vorher deinstallieren).
- **Browser:** `python3 -m http.server 8080 --directory www` und dann `http://localhost:8080/` öffnen.
- **Browser-Dev-Modus:** `http://localhost:8080/?dev=1` oder `Ctrl+Shift+D`. Siehe [Dev-Modus](docs/DEVELOPER_MODE.md).
- **Tests:** `npm test` und die spezialisierten `npm run test:*`-Skripte.
- **Android bauen:** `python3 android/fetch-toolchain.py && python3 android/build.py`. Für aktualisierbare APK ist der **ursprüngliche** Signierschlüssel nötig.

## Versions- und Spielstandkompatibilität

**Der sichtbare App-Name lautet Wimeloo, die interne Android-Kennung bleibt bewusst `de.sternenbaby.app`.** Ebenso bleiben die `sternenbaby.state.*`-Schlüssel, die APK-WebView-Origin und die Signaturidentität unverändert. Das verhindert Datenverlust und ermöglicht die Installation als Update. Android `versionCode` steigt von 3 auf 4.

## Repository und Releases

- Änderungen erfolgen auf Featurebranches und via Pull Requests. `main` bleibt geschützt.
- `verify.yml` testet Quellcode, Speicherformat, Minispiele und Android-Wrapper.
- `release.yml` überprüft bei Push auf `main` das erste signierte Übergangsrelease `v1.2.0` aus den versionierten `.release-parts` und veröffentlicht es nach **vollständigem Asset-Abgleich, SHA-256-Prüfung, offizieller APK-Signaturprüfung und Zertifikatsvergleich**.
- **Der private Signierschlüssel liegt nicht auf GitHub.** Für die erste Veröffentlichung ist ein mit dem ursprünglichen Zertifikat signiertes Artefakt hinterlegt. Der Release-Workflow signiert nicht selbst, sondern verifiziert und veröffentlicht ausschließlich dieses Artefakt.
- `build-signed.yml` ist der Workflow für spätere Versionen. Dazu müssen die beiden Secrets `WIMELOO_KEYSTORE_B64` (PKCS12-Datei in Base64) und `WIMELOO_KEYSTORE_PASSWORD` (Keystore-Passwort) ausschließlich im GitHub-Environment `android-signing` hinterlegt werden. Nie Schlüssel oder Passwort in das öffentliche Repository, Pull Requests, Issues oder Logs übertragen.

### Hinweis zum ersten Übergangsrelease

Version 1.2.0 verwendet die bewährte, bereits signierte Android-Hülle der Vorversion und enthält **die vollständigen neuen Wimeloo-Webassets**. Android-Manifest und App-Name wurden für Wimeloo angepasst. Für spätere Releases ist der reproduzierbare Android-Quellbuild mit dem Originalschlüssel vorgesehen. Die Prüfskripte verhindern eine Veröffentlichung mit einer anderen Signatur.

## Datenschutz und Inhalte

Alle Sprachanweisungen sind in `www/audio/` lokal gebündelt; die App kommuniziert nicht mit WevoLabs oder anderen Servern. Die originale Aufnahmequelle wird für Entwicklung und Herkunft dokumentiert, enthält aber keine Signierschlüssel. Prüfe vor einer **öffentlichen** Weiterverbreitung fremder Musik, Markennamen und Figurengestaltungen sorgfältig deren Nutzungserlaubnis.

Siehe [Android-Hülle](android/ANDROID.md), [Agenten-Anweisungen](AGENTS.md), [Erweiterungen](ERWEITERUNGEN.md), [Sprachnachweise](VOICE-CREDITS.md).
