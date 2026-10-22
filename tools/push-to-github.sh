#!/usr/bin/env bash
# Publish the complete local Wimeloo source on a PR branch (never pushes signing secrets).
set -euo pipefail
REPO="bratkartoffeln/Wimeloo"
BRANCH="feat/wimeloo-full-source-1.2.0"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for bin in git gh python3; do command -v "$bin" >/dev/null || { echo "Missing command: $bin" >&2; exit 1; }; done
gh auth status
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
git clone "https://github.com/$REPO.git" "$WORK/repo"
cd "$WORK/repo"
git switch -c "$BRANCH"
# Copy only project sources and bundled release audio; no raw recordings, toolchains, build outputs, or private keys.
PROJECT_ROOT="$PROJECT_ROOT" python3 - <<'PY'
from pathlib import Path
from shutil import copy2
import os
src=Path(os.environ['PROJECT_ROOT']);dst=Path.cwd()
for p in src.rglob('*'):
    if not p.is_file(): continue
    rel=p.relative_to(src)
    if rel.parts[0] in {'toolchain','voice-source','verification','node_modules','.git'} or \
       (rel.parts[0]=='android' and len(rel.parts)>1 and rel.parts[1]=='build') or \
       p.suffix.lower() in {'.p12','.jks','.keystore','.password'}:continue
    target=dst/rel;target.parent.mkdir(parents=True,exist_ok=True);copy2(p,target)
PY
if git ls-files --others --exclude-standard | grep -E '(^toolchain/|build-state/|\.(p12|jks|keystore|password)$)'; then
  echo 'ERROR: private signing files would be uploaded' >&2;exit 1
fi
git add -A
git commit -m 'feat: import complete Wimeloo 1.2.0 game, offline audio and developer tools'
git push -u origin "$BRANCH"
gh pr create --repo "$REPO" --base main --head "$BRANCH" \
  --title 'feat: import complete Wimeloo 1.2.0 source and browser dev mode' \
  --body 'Complete offline game source with browser developer mode, state-preserving Android rename, test suite and workflows. Signing keys excluded.'
echo 'Review CI, then merge with the authorized bypass in GitHub if desired.'
