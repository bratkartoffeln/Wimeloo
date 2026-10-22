# Wimeloo — agent development guidelines

## Product intent
Wimeloo is a child-friendly, **offline-first**, touch-controlled isometric world with baby-care, music and learning minigames. It targets children who cannot read fluently. Use pictures, movement and audio for essential instructions. No streak pressure, ads, accounts or trackers.

## Architecture
- `www/`: plain JavaScript/Canvas/CSS browser game. The native Android WebView loads the same files locally.
- `www/dev.js` and `www/dev.css`: **browser-only** diagnostics enabled with `?dev=1` or Ctrl+Shift+D. Keep the Android bridge gate and pointer-events none on canvas highlights.
- `android/`: Java WebView shell, safe offline file import/export, pinned SDK build tooling.
- `tests/`: portability, state migration, UI and minigame checks.
- `www/audio/`: shipped local voice clips; no runtime TTS API calls or cloud dependencies.

## Non-negotiable compatibility
- Keep package ID `de.sternenbaby.app` while supporting updates from prior releases. The **display name** is Wimeloo.
- Keep original storage keys `sternenbaby.state.v1` and `sternenbaby.state.backup.v1` and the same appassets origin.
- Increment Android versionCode on each released APK.
- Never commit keystores, signing passwords, service tokens, private recordings, child profiles, logs or unrelated secrets.
- Before release: validate original signer certificate fingerprint and maintain signing continuity.
- `main` is protected; work on branches and open PRs. Do not rewrite or weaken repository rulesets.

## Test/acceptance
1. `npm test`, `npm run test:dev`, `npm run test:world`, `npm run test:minigames`.
2. `python3 android/fetch-toolchain.py && python3 android/build.py --check-native`.
3. For browser: `python3 -m http.server 8080 --directory www`; check `http://localhost:8080/?dev=1` for overlay, zoom, touch boxes, and no accidental world taps.
4. For Android release, supply original signing identity through repository secrets, build and verify the signed APK; run on an actual Android tablet before declaring device compatibility.
5. No game action may be gated by reading or cloud connectivity. Visual steps must remain tappable without text.
