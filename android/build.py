#!/usr/bin/env python3
"""Build the offline Android APK directly with pinned Android SDK command-line tools.

No Gradle, Maven, network, or third-party Android dependency is required.
The release signing identity lives outside the source tree in private build-state.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parent
VERSION = "1.2.0"
VERSION_CODE = 4


def run(arguments: list[str | Path], *, capture: bool = False) -> str:
    args = [str(arg) for arg in arguments]
    completed = subprocess.run(args, check=True, text=True, stdout=subprocess.PIPE if capture else None,
                               stderr=subprocess.STDOUT if capture else None)
    return completed.stdout or ""


def signing_identity(state: Path) -> tuple[Path, Path]:
    state.mkdir(parents=True, exist_ok=True)
    state.chmod(0o700)
    key = state / "sternenbaby-release.p12"
    password = state / "sternenbaby-release.password"
    if key.exists() and not password.exists():
        raise RuntimeError("Release key exists but its password file is missing; refusing to replace it.")
    if not password.exists():
        descriptor = os.open(password, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(descriptor, "w") as handle:
            handle.write(secrets.token_urlsafe(40) + "\n")
    password.chmod(0o600)
    if not key.exists():
        run(["keytool", "-genkeypair", "-keystore", key, "-storetype", "PKCS12",
             "-storepass:file", password, "-alias", "sternenbaby", "-keyalg", "RSA",
             "-keysize", "3072", "-validity", "10000", "-dname", "CN=Sternenbaby, C=DE",
             "-noprompt"])
    key.chmod(0o600)
    return key, password


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-native", action="store_true", help="Compile the wrapper without packaging the game or signing an APK.")
    parser.add_argument("--web-dir", type=Path, default=ROOT.parent / "www")
    parser.add_argument("--toolchain-dir", type=Path, default=ROOT.parent.parent / "toolchain")
    args = parser.parse_args()
    toolchain = args.toolchain_dir.resolve()
    sdk = toolchain / "build-tools" / "35.0.0"
    android_jar = toolchain / "platforms" / "android-35" / "android.jar"
    for path in (sdk / "aapt2", sdk / "zipalign", sdk / "lib" / "d8.jar",
                 sdk / "lib" / "apksigner.jar", android_jar):
        if not path.is_file():
            raise FileNotFoundError(f"Required SDK component missing: {path}")
    if not args.check_native and not (args.web_dir / "index.html").is_file():
        raise FileNotFoundError(f"The web game must be ready before packaging: {args.web_dir / 'index.html'}")

    work = ROOT / "build" / "native"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    for name in ("classes", "generated", "dex", "assets"):
        (work / name).mkdir()
    assets = work / "assets"
    if not args.check_native:
        # Only the web application is copied. No project, toolchain, or signing state enters the APK.
        shutil.copytree(args.web_dir.resolve(), assets / "www", ignore=shutil.ignore_patterns(
            ".DS_Store", "*.map", "*.bak", "*.tmp", ".git", "node_modules", "tests"))

    source = ROOT / "app" / "src" / "main"
    print("Compiling Android resources…", flush=True)
    run([sdk / "aapt2", "compile", "--dir", source / "res", "-o", work / "resources.zip"])
    link = [sdk / "aapt2", "link", "-o", work / "resources.ap_", "--manifest", source / "AndroidManifest.xml",
            "-I", android_jar, "--java", work / "generated", "--min-sdk-version", "26",
            "--target-sdk-version", "35", "-A", assets, work / "resources.zip"]
    for extension in ("png", "jpg", "jpeg", "webp", "ogg", "mp3", "m4a", "wav", "mp4", "webm", "woff2"):
        link.extend(["-0", extension])
    run(link)

    print("Compiling Java wrapper…", flush=True)
    java_sources = sorted((source / "java").rglob("*.java")) + sorted((work / "generated").rglob("*.java"))
    run(["java", "-m", "jdk.compiler/com.sun.tools.javac.Main", "--release", "8",
         "-classpath", android_jar, "-encoding", "UTF-8", "-d", work / "classes", *java_sources])
    classes_jar = work / "classes.jar"
    with zipfile.ZipFile(classes_jar, "w", compression=zipfile.ZIP_DEFLATED) as jar:
        for item in sorted((work / "classes").rglob("*.class")):
            jar.write(item, item.relative_to(work / "classes").as_posix())
    run(["java", "-cp", sdk / "lib" / "d8.jar", "com.android.tools.r8.D8", "--release",
         "--min-api", "26", "--lib", android_jar, "--output", work / "dex", classes_jar])
    if args.check_native:
        print("Native resource, Java and DEX compilation passed. No APK or signing key was created.")
        return

    print("Packaging offline game…", flush=True)
    unsigned = work / "unsigned.apk"
    shutil.copyfile(work / "resources.ap_", unsigned)
    with zipfile.ZipFile(unsigned, "a", compression=zipfile.ZIP_DEFLATED) as archive:
        for dex in sorted((work / "dex").glob("*.dex")):
            archive.write(dex, dex.name)
    aligned = work / "aligned.apk"
    run([sdk / "zipalign", "-P", "16", "-f", "4", unsigned, aligned])
    key, password = signing_identity(toolchain / "build-state")
    outputs = ROOT / "build" / "outputs"
    outputs.mkdir(parents=True, exist_ok=True)
    output = outputs / f"Wimeloo-{VERSION}.apk"
    run(["java", "-jar", sdk / "lib" / "apksigner.jar", "sign", "--ks", key,
         "--ks-key-alias", "sternenbaby", "--ks-pass", "file:" + str(password),
         "--min-sdk-version", "26", "--v1-signing-enabled", "true", "--v2-signing-enabled", "true",
         "--v3-signing-enabled", "true", "--v4-signing-enabled", "false", "--out", output, aligned])

    print("Verifying manifest, signature, alignment, and asset completeness…", flush=True)
    signature = run(["java", "-jar", sdk / "lib" / "apksigner.jar", "verify", "--verbose", "--print-certs", output], capture=True)
    badging = run([sdk / "aapt2", "dump", "badging", output], capture=True)
    run([sdk / "zipalign", "-c", "-P", "16", "4", output])
    if "uses-permission:" in badging:
        raise RuntimeError("Unexpected Android permission in final APK.")
    if "name='de.sternenbaby.app'" not in badging or f"versionName='{VERSION}'" not in badging or f"versionCode='{VERSION_CODE}'" not in badging:
        raise RuntimeError("Final package identity mismatch.")
    if "minSdkVersion:'26'" not in badging or "targetSdkVersion:'35'" not in badging:
        raise RuntimeError("Final Android SDK levels mismatch.")
    with zipfile.ZipFile(output) as archive:
        names = archive.namelist()
        if "assets/www/index.html" not in names or "classes.dex" not in names:
            raise RuntimeError("Final APK lacks its game or native code.")
        if any(name.endswith((".p12", ".jks", ".keystore", ".password")) for name in names):
            raise RuntimeError("Private signing material must never be packaged.")
        packaged_assets = {name[len("assets/www/"):] for name in names if name.startswith("assets/www/") and not name.endswith("/")}
        staged_assets = {path.relative_to(assets / "www").as_posix() for path in (assets / "www").rglob("*") if path.is_file()}
        if packaged_assets != staged_assets:
            raise RuntimeError("Packaged asset file list differs from staged web application.")

    (outputs / "signature-verification.txt").write_text(signature)
    (outputs / "manifest-badging.txt").write_text(badging)
    run(["keytool", "-exportcert", "-rfc", "-keystore", key, "-storepass:file", password,
         "-alias", "sternenbaby", "-file", outputs / "release-certificate.pem"], capture=True)
    report = {
        "apk": output.name, "package": "de.sternenbaby.app", "versionName": VERSION, "versionCode": VERSION_CODE,
        "minSdk": 26, "targetSdk": 35, "permissions": [], "architecture": "universal (no native libraries)",
        "bytes": output.stat().st_size, "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "webFiles": len(packaged_assets), "signatureVerified": True, "zipAlignmentVerified": True,
        "network": "No INTERNET permission; requests restricted to packaged appassets origin",
        "testedOnAndroidDevice": False,
    }
    (outputs / "build-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print("APK: " + str(output))


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print("Build failed: " + str(error), file=sys.stderr)
        raise SystemExit(1)
