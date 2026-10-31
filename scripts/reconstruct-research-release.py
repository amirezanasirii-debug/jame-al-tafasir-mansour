"""Reconstruct exact, already-signed release files without a signing key."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

def sha(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()

def filename(value):
    if Path(value).name != value or '/' in value or '\\' in value:
        raise ValueError('Expected a plain filename')
    return value

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--patch', type=Path, required=True)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--base', type=Path, required=True)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--target-tag', default='research-v2.8.0-preview.3')
    args = parser.parse_args()
    assert sha(args.patch) == args.sha256, 'Update package hash mismatch'
    if not args.verify_only:
        assert args.output is not None
        args.output.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.patch) as patch:
        manifest = json.loads(patch.read('manifest.json'))
        assert manifest['format'] == 'mansour-exact-release-delta-v1'
        assert manifest['targetTag'] == args.target_tag
        for item in manifest['files']:
            base = args.base / filename(item['baseFile'])
            assert sha(base) == item['baseSha256'], 'Base file hash mismatch'
            literals = patch.read(filename(item['literalFile']))
            result = hashlib.sha256()
            total = 0
            dest = None if args.verify_only else args.output / filename(item['file'])
            target = None if dest is None else dest.open('xb')
            try:
                with base.open('rb') as before:
                    for op in item['operations']:
                        length = op['length']
                        assert isinstance(length, int) and length > 0
                        if 'copy' in op:
                            assert 0 <= op['copy'] <= base.stat().st_size - length
                            before.seek(op['copy'])
                        else:
                            assert 0 <= op['literal'] <= len(literals) - length
                        offset = 0
                        while offset < length:
                            amount = min(4 * 1024 * 1024, length - offset)
                            chunk = before.read(amount) if 'copy' in op else literals[op['literal'] + offset:op['literal'] + offset + amount]
                            assert len(chunk) == amount
                            result.update(chunk)
                            if target is not None:
                                target.write(chunk)
                            total += amount
                            offset += amount
                assert total == item['bytes'], 'Reconstructed file size mismatch'
                assert result.hexdigest() == item['sha256'], 'Reconstructed file hash mismatch'
            finally:
                if target is not None:
                    target.close()
            print(json.dumps({'file': item['file'], 'bytes': total, 'sha256': result.hexdigest(), 'verified': True}), flush=True)

if __name__ == '__main__':
    main()
