"""Build the native app's font subset from actual delivered Chinese text."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
import base64
import json
import re

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / 'miniprogram'
original = TTFont(ROOT / 'site/assets/fonts/lemi-milk-bubble.woff2')
required = set(original.getBestCmap())
for folder in ['pages', 'templates', 'components', 'data', 'info', 'utils']:
    for path in (APP / folder).rglob('*'):
        if path.suffix in ['.js', '.wxml']:
            required.update(ord(c) for c in re.findall(r'[\u4e00-\u9fff]', path.read_text(encoding='utf-8')))
font = TTFont(ROOT / 'site/assets/fonts/lemi-milk-bubble.ttf')
available = set(font.getBestCmap())
options = subset.Options()
options.flavor = 'woff2'
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=required & available)
subsetter.subset(font)
font.flavor = 'woff2'
cache = Path(__file__).parent / '.generated'
cache.mkdir(exist_ok=True)
output = cache / 'miniprogram-font.woff2'
font.save(output)
encoded = base64.b64encode(output.read_bytes()).decode('ascii')
(APP / 'font.wxss').write_text("@font-face{font-family:'Lemi';src:url('data:font/woff2;base64," + encoded + "') format('woff2');font-weight:400;font-style:normal;}\n", encoding='utf-8')
print(json.dumps({'fontBytes':output.stat().st_size,'glyphs':len(required & available),'unavailableCJK':''.join(chr(c) for c in sorted(required-available))},ensure_ascii=True))
