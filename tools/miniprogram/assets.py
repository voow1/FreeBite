"""Convert existing licensed assets to local Mini Program images; never fetch new images."""
import hashlib
import io
import json
import shutil
from datetime import datetime
from pathlib import Path
from PIL import Image

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

# Animated pets are rendered from alpha-preserving PNG atlases in petmotion.
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
atlas_config=json.loads((ROOT/'tools/miniprogram/pet-atlas.json').read_text(encoding='utf-8'))
atlas_source=ROOT/atlas_config['sourceDir']
atlas_out=OUT/'petmotion'
if atlas_out.exists():
    old.mkdir(parents=True,exist_ok=True)
    shutil.move(str(atlas_out),str(old/'petmotion'))
(atlas_out/'assets').mkdir(parents=True)
for pet in data['mascotPresets']:
    for suffix in ('.png','-preview.png'):
        shutil.copy2(atlas_source/(pet['id']+suffix),atlas_out/'assets'/(pet['id']+suffix))
(atlas_out/'index.js').write_text('Page({ onLoad() { wx.redirectTo({url:"/pages/kitchen/index"}); } });\n',encoding='utf-8')
(atlas_out/'index.json').write_text('{}\n',encoding='utf-8')
(atlas_out/'index.wxml').write_text('<view>不牛马厨房</view>\n',encoding='utf-8')
packages.append({'name':'petmotion','root':'petmotion','pages':['index']})
(ROOT / 'tools/miniprogram/.generated/assets.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
print(json.dumps({'images': len(manifest), 'packages': len(packages),
                  'bytes': sum(p.stat().st_size for p in OUT.glob('media*/assets/*'))}))
