#!/usr/bin/env python3
"""Verify apksigner output matches the real 1.1.0 Android update certificate."""
import re,sys
from pathlib import Path
EXPECTED='25db9b0f7c00d99f4d9d57ea7aceb5c26392b86ad81c5f34e01185df220fa951'
text=Path(sys.argv[1]).read_text() if len(sys.argv)>1 else sys.stdin.read()
found=re.findall(r'Signer #\d+ certificate SHA-256 digest:\s*([0-9A-Fa-f:]+)',text)
if not found or any(re.sub('[^0-9a-f]','',v.lower())!=EXPECTED for v in found):
    raise SystemExit('Android signing certificate differs from the original release identity')
if not re.search(r'Verified using v2 scheme \(APK Signature Scheme v2\): true',text,re.I):
    raise SystemExit('Missing verified v2 APK signature')
print('Android signer certificate and v2 scheme match original Sternenbaby 1.1.0')
