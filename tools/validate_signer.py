#!/usr/bin/env python3
"""Reject an APK build with a different signer (would break installed app updates)."""
import pathlib, re, sys
EXPECTED = "25db9b0f7c00d99f4d9d57ea7aceb5c26392b86ad81c5f34e01185df220fa951"
text=pathlib.Path(sys.argv[1]).read_text()
match=re.search(r"Signer #1 certificate SHA-256 digest: ([a-f0-9:]+)",text,re.I)
if not match or match.group(1).replace(":","").lower() != EXPECTED:
    sys.exit("Unexpected Android signing certificate: update would not install")
print("Signing certificate matches Sternenbaby v1.1.0")
