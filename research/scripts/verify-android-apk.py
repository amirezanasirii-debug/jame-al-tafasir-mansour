"""Check packaging invariants; this does not substitute for device installation."""
import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('apk', type=Path)
parser.add_argument('--baseline', type=Path)
args = parser.parse_args()
with zipfile.ZipFile(args.apk) as apk:
    entries = apk.infolist()
    names = [entry.filename for entry in entries]
    assert len(names) == len(set(names)), 'Duplicate ZIP entries'
    assert len(names) < 65535, 'ZIP64 entry count is not supported'
    assert apk.testzip() is None, 'CRC mismatch'
    resource = apk.getinfo('resources.arsc')
    assert resource.compress_type == zipfile.ZIP_STORED
    with args.apk.open('rb') as stream:
        stream.seek(resource.header_offset)
        header = stream.read(30)
    name_length, extra_length = struct.unpack_from('<HH', header, 26)
    assert (resource.header_offset + 30 + name_length + extra_length) % 4 == 0
    assert not any(name.startswith('lib/') for name in names), 'Review native ABI compatibility'
    icons = []
    for entry in entries:
        if entry.filename.startswith('res/') and entry.filename.endswith('.png'):
            width, height = struct.unpack('>II', apk.read(entry)[:24][16:24])
            assert max(width, height) <= 432, 'Oversized native bitmap'
            icons.append({'resource': entry.filename, 'width': width, 'height': height})
    assert icons, 'Missing native artwork'
    compared = 0
    if args.baseline:
        with zipfile.ZipFile(args.baseline) as previous:
            for entry in previous.infolist():
                if entry.filename.startswith('assets/'):
                    assert apk.read(entry.filename) == previous.read(entry.filename), entry.filename
                    compared += 1
digest = hashlib.sha256()
with args.apk.open('rb') as stream:
    for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
        digest.update(chunk)
print(json.dumps({'bytes': args.apk.stat().st_size, 'sha256': digest.hexdigest(),
    'packaging': 'passed', 'nativeIcons': icons, 'unchangedWebAndDataAssets': compared,
    'installationTest': 'separate emulator/device test required'}, indent=2))
