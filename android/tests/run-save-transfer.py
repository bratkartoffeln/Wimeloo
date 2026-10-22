#!/usr/bin/env python3
"""Compile and exercise bounded save-file transfers without an Android device."""
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="sternenbaby-save-test-") as temporary:
    subprocess.run(["java", "-m", "jdk.compiler/com.sun.tools.javac.Main", "--release", "8",
                    "-encoding", "UTF-8", "-d", temporary,
                    str(root / "app/src/main/java/de/sternenbaby/app/SaveTransfer.java"),
                    str(root / "tests/SaveTransferTest.java")], check=True)
    subprocess.run(["java", "-cp", temporary, "de.sternenbaby.app.SaveTransferTest"], check=True)
