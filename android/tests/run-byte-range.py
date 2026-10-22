#!/usr/bin/env python3
"""Run ByteRangeTest on Java 17+ without Android SDK, emulator, or test framework."""
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="sternenbaby-byte-range-") as output:
    subprocess.run([
        "java", "-m", "jdk.compiler/com.sun.tools.javac.Main", "--release", "8", "-d", output,
        str(ROOT / "app/src/main/java/de/sternenbaby/app/ByteRange.java"),
        str(ROOT / "tests/ByteRangeTest.java"),
    ], check=True)
    subprocess.run(["java", "-cp", output, "de.sternenbaby.app.ByteRangeTest"], check=True)
