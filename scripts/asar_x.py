# Extract specific paths from an asar archive (Electron) without external deps.
# Usage: python asar_x.py <asar> <output_dir> <prefix1> [prefix2 ...]
# Prefixes match paths inside the archive (asar uses forward slashes, root keys like "dsh", "renderer").
import json, struct, sys, os

asar, outdir, prefixes = sys.argv[1], sys.argv[2], sys.argv[3:]
fh = open(asar, 'rb')

def read_header(fh):
    fh.seek(0)
    raw = fh.read(16)
    # Observed layout: @0:4, @4:P, @8:P-4, @12:json_size, @16: JSON
    (json_size,) = struct.unpack('<I', raw[12:16])
    header = json.loads(fh.read(json_size).decode('utf-8'))
    data_base = 16 + ((json_size + 3) & ~3)
    return header, data_base

header, data_base = read_header(fh)
files = header.get('files', {})

def walk(node, path):
    for name, ent in node.items():
        p = path + '/' + name if path else name
        if 'files' in ent:
            yield from walk(ent['files'], p)
        else:
            yield p, ent

matched = 0
for p, ent in walk(files, ''):
    if not any(p.startswith(px) for px in prefixes):
        continue
    matched += 1
    dest = os.path.join(outdir, p.replace('/', os.sep))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if ent.get('unpacked'):
        srcp = os.path.join(asar + '.unpacked', p.replace('/', os.sep))
        if os.path.exists(srcp):
            with open(srcp, 'rb') as s, open(dest, 'wb') as d:
                d.write(s.read())
            print('U', p)
        else:
            print('?missing-unpacked', p)
        continue
    off = int(ent['offset']); size = int(ent['size'])
    fh.seek(data_base + off)
    with open(dest, 'wb') as d:
        d.write(fh.read(size))
print('extracted', matched, 'files ->', outdir)
