#!/usr/bin/env python3
"""Fetch the fixed official Linux Android SDK packages used by this project."""
import argparse
import hashlib
from pathlib import Path
import urllib.request
import zipfile

PACKAGES = [
    ("build-tools_r35_linux.zip", "bd3a4966912eb8b30ed0d00b0cda6b6543b949d5ffe00bea54c04c81e1561d88", "build-tools/35.0.0"),
    ("platform-35_r02.zip", "0988cacad01b38a18a47bac14a0695f246bc76c1b06c0eeb8eb0dc825ab0c8e0", "platforms/android-35"),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", type=Path, default=Path(__file__).resolve().parents[2] / "toolchain")
    args = parser.parse_args()
    root = args.destination.resolve()
    downloads = root / "downloads"
    downloads.mkdir(parents=True, exist_ok=True)
    for name, expected, destination in PACKAGES:
        archive = downloads / name
        if not archive.exists():
            print("Downloading", name, flush=True)
            urllib.request.urlretrieve("https://dl.google.com/android/repository/" + name, archive)
        if hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
            raise RuntimeError("SHA-256 mismatch: " + name)
        with zipfile.ZipFile(archive) as source:
            for item in source.infolist():
                relative = Path(*Path(item.filename).parts[1:])
                if not relative.parts:
                    continue
                if relative.is_absolute() or ".." in relative.parts:
                    raise RuntimeError("Unsafe archive member")
                if destination.startswith("platforms/") and str(relative) not in (
                    "android.jar", "source.properties", "package.xml", "build.prop", "framework.aidl", "sdk.properties"
                ):
                    continue
                target = root / destination / relative
                if item.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
                else:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(source.read(item))
                    mode = (item.external_attr >> 16) & 0o777
                    if mode:
                        target.chmod(mode)
        for binary in ("aapt", "aapt2", "zipalign", "d8", "apksigner"):
            target = root / destination / binary
            if target.exists():
                target.chmod(0o755)
        print("Verified and extracted", destination)


if __name__ == "__main__":
    main()
