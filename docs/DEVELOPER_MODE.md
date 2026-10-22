# Browser developer mode

Wimeloo is a single offline-friendly `www/` web app inside an Android WebView. It can be run in a desktop/mobile browser for development, **without** using the Android native shell.

```sh
python3 -m http.server 8080 --directory www
```

Open `http://localhost:8080/?dev=1` for a floating development panel with FPS, camera world coordinates/zoom, selected character, actor paths, chapter/baby state, current overlay, canvas grid and action button hitbox outlines. Buttons allow camera reset, quick testing of music, garden and care, and explicit diagnostics JSON copying.

Use `Ctrl+Shift+D` to toggle the panel at any time on the browser. `/` or `?dev=0` starts without dev mode. No developer overlay is created in the signed Android WebView because the native bridge is present. The overlay does not collect analytics, communicate with a server, require an account, or intercept game taps outside its own visible controls.

**Privacy:** the JSON copy action copies only the current technical summary (positions and chapter counters, no baby name). The browser app may retain normal local game data in localStorage, just like Android; wipe site data if using a shared test machine. Developer mode intentionally does **not** skip parent checks or change the saved chapter progression.

**World controls:** the green diamond grid shows isometric map coordinates; yellow outlines show the actual clickable world-station targets. Use these to diagnose panning/zoom target misalignment.

**Smoke checks:** `npm run test:dev` and `npm test`, then exercise pointer gestures in the browser manually. Chrome/Chromium DevTools can simulate phone/tablet screens.
