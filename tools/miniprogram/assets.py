"""Convert existing licensed assets to local Mini Program images; never fetch new images."""
import hashlib
import io
import json
import shutil
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'miniprogram'
SOURCE = ROOT / 'tools/miniprogram/.generated/source.json'
data = json.loads(SOURCE.read_text(encoding='utf-8'))
old = ROOT / 'tools/miniprogram/.generated/旧素材构建' / datetime.now().strftime('%Y%m%d-%H%M%S-%f')
for previous in OUT.glob('media[0-9]*'):
    if previous.is_dir() and previous.resolve().parent == OUT.resolve():
        old.mkdir(parents=True, exist_ok=True)
        shutil.move(str(previous), str(old / previous.name))
manifest = {}
packages = []
limit = 1750 * 1024
bucket = None
used = 0

def emit(source, payload, extension):
    global bucket, used
    if bucket is None or used + len(payload) > limit:
        bucket = f'media{len(packages):02d}'
        used = 0
        packages.append({'name': bucket, 'root': bucket, 'pages': ['index']})
        (OUT / bucket / 'assets').mkdir(parents=True, exist_ok=True)
        (OUT / bucket / 'index.js').write_text('Page({ onLoad() { wx.redirectTo({url:"/pages/kitchen/index"}); } });\n', encoding='utf-8')
        (OUT / bucket / 'index.json').write_text('{}\n', encoding='utf-8')
        (OUT / bucket / 'index.wxml').write_text('<view>不牛马厨房</view>\n', encoding='utf-8')
    name = hashlib.sha256(source.encode('utf-8')).hexdigest()[:20] + extension
    target = OUT / bucket / 'assets' / name
    target.write_bytes(payload)
    used += len(payload)
    manifest[source] = '/' + target.relative_to(OUT).as_posix()

# Package the four characters together so switching animations never loads another package.
for pet in data['mascotPresets']:
    for source in pet['sources'].values():
        if source in manifest:
            continue
        with Image.open(ROOT / 'site' / source) as image:
            frames, durations = [], []
            for frame in ImageSequence.Iterator(image):
                rgba = frame.convert('RGBA')
                palette = rgba.convert('RGB').quantize(colors=255)
                transparent = rgba.getchannel('A').point(lambda value: 255 if value < 96 else 0)
                palette.paste(255, mask=transparent)
                palette.info['transparency'] = 255
                frames.append(palette)
                durations.append(frame.info.get('duration', 100))
            buf = io.BytesIO()
            frames[0].save(buf, format='GIF', save_all=True, append_images=frames[1:],
                           duration=durations, loop=0, transparency=255, disposal=2, optimize=False)
            emit(source, buf.getvalue(), '.gif')

for source in sorted({recipe['image'] for recipe in data['recipes']}):
    if not source.startswith('assets/dishes/'):
        raise ValueError(f'Unexpected external or empty image: {source}')
    with Image.open(ROOT / 'site' / source) as image:
        image = image.convert('RGB')
        image.thumbnail((560, 560), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        image.save(buf, 'JPEG', quality=66, optimize=True)
        emit(source, buf.getvalue(), '.jpg')

result = {'files': manifest, 'packages': packages}
(ROOT / 'tools/miniprogram/.generated/assets.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
print(json.dumps({'images': len(manifest), 'packages': len(packages),
                  'bytes': sum(p.stat().st_size for p in OUT.glob('media*/assets/*'))}))
