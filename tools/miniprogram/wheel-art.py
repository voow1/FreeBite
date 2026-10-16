"""Draw the existing wheel palettes as local PNGs, avoiding native canvas overlays."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
themes = json.loads(sys.stdin.read())
palette = ['--candy-peach', '--candy-mint', '--candy-yellow', '--candy-pink',
           '--candy-blue', '--surface-2', '--candy-lilac', '--candy-yellow']
for theme in themes:
    target = root / 'miniprogram/assets/wheels' / theme['id']
    target.mkdir(parents=True, exist_ok=True)
    tokens = theme['tokens']
    for count in range(1, 9):
        image = Image.new('RGB', (1024, 1024), tokens['--surface'])
        draw = ImageDraw.Draw(image)
        for index in range(count):
            start = -90 + index * 360 / count
            end = -90 + (index + 1) * 360 / count
            draw.pieslice((8, 8, 1016, 1016), start, end,
                          fill=tokens[palette[index]], outline=tokens['--surface'], width=9)
        draw.ellipse((8, 8, 1016, 1016), outline=tokens['--surface'], width=18)
        image.resize((512, 512), Image.Resampling.LANCZOS).quantize(colors=96).save(target / f'{count}.png', optimize=True)
