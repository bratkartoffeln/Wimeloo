#!/usr/bin/env python3
"""Assemble the first release artifact without exposing the private signing key.

The initial distribution is a signed transition APK, built from the original
Sternenbaby wrapper + the complete Wimeloo web assets.  Future releases should
compile and sign the Android project in CI using private repository secrets.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT=Path(__file__).resolve().parent.parent

def run(output:Path,verify_web:bool=True)->None:
    manifest=json.loads((ROOT/'.release-parts'/'manifest.json').read_text('utf-8'))
    parts=manifest['parts']
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open('wb') as f:
        for filename in parts:
            p=ROOT/'.release-parts'/filename
            if not p.is_file():raise RuntimeError('Release part missing: '+filename)
            f.write(p.read_bytes())
    data=output.read_bytes()
    if len(data)!=manifest['bytes'] or hashlib.sha256(data).hexdigest()!=manifest['sha256']:
        raise RuntimeError('Reassembled APK does not match the signed release checksum')
    with zipfile.ZipFile(output) as apk:
        if apk.testzip():raise RuntimeError('APK ZIP member CRC failed')
        files=[p for p in (ROOT/'www').rglob('*') if p.is_file()]
        in_apk={x for x in apk.namelist() if x.startswith('assets/www/')}
        expected={'assets/www/'+p.relative_to(ROOT/'www').as_posix() for p in files}
        if in_apk!=expected:raise RuntimeError('Packaged assets differ from the current source file list')
        if verify_web:
            for path in files:
                rel='assets/www/'+path.relative_to(ROOT/'www').as_posix()
                if apk.read(rel)!=path.read_bytes():raise RuntimeError('Packaged asset not identical to '+rel)
        if b'Wimeloo' not in apk.read('resources.arsc'):
            raise RuntimeError('Release app name is not Wimeloo')
        if '1.2.0'.encode('utf-16le') not in apk.read('AndroidManifest.xml'):
            raise RuntimeError('Release Android manifest version is not v1.2.0')
        if any(x.lower().endswith(('.p12','.keystore','.password')) for x in apk.namelist()):
            raise RuntimeError('Private signing material detected in APK')
    print('Verified signed APK bytes, 100% bundled source assets, version and CRC:',output)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'dist'/'Wimeloo-1.2.0.apk');parser.add_argument('--skip-source-hash',action='store_true')
    args=parser.parse_args();run(args.output,not args.skip_source_hash)
