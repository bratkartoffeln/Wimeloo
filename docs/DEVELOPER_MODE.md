# Wimeloo Browser Dev Mode

Wimeloo kann aus seinem `www/`-Ordner ohne Buildsystem auf einem lokalen HTTP-Server laufen:

```sh
python3 -m http.server 8080 --directory www
```

- `http://localhost:8080/?dev=1`: Dev-Modus beim Laden aktiv.
- `Ctrl+Shift+D`: Entwicklerpanel ein-/ausblenden.
- `?dev=0`: regulärer Modus.
- Funktionen: isometrisches Kachelraster, Hitbox-Grenzen, Kameraposition/Zoom, FPS, Laufwege der Figuren, Dialog- und Kapitelzustand, schnelles Öffnen von Spielen und Pflege.
- Kein Backend, keine Debug-Telemetrie; JSON-Kopie nur auf ausdrücklichen Klick.
- **Nicht** in der Android-WebView aktivierbar.

Das vollständige `www/dev.js` wird gemeinsam mit dem Quellcode importiert. Vorläufig enthält dieses Repo nur die vorbereitende Dokumentation.
