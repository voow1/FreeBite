"""Extract the approved v1.16.0 sheets and encode transparent runtime animations.

Rows are separated at actual alpha gutters rather than cutting feet at a nominal grid.
No pose synthesis or duplicated/interpolated frames is performed.
"""
from pathlib import Path
import hashlib
import json
import shutil
import sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / '上线资料/角色动作重制/v1.16.0'
QA = ROOT / 'tools/miniprogram/.generated/诊断-v1.16.0'
QA.mkdir(parents=True, exist_ok=True)
PETS = ['pink-pastry-girl', 'milk-tea-puppy', 'lazy-yawn-cat', 'baozi-sous-chef']
NAMES = ['草莓甜心小厨', '奶茶小狗', '慵懒小猫', '包仔小厨']
STATES = {'idle': (16, 180), 'run-right': (16, 90), 'run-left': (16, 90), 'done': (12, 140)}

def boundaries(alpha, count, axis):
    projection = (alpha >= 128).sum(axis=axis)
    length = len(projection)
    cuts = [0]
    for i in range(1, count):
        ideal = length * i / count
        radius = length / count * .33
        candidates = np.arange(round(ideal-radius), round(ideal+radius))
        empty = candidates[projection[candidates] == 0]
        if not len(empty):
            raise ValueError(f'No clear alpha gutter at cell boundary {i}/{count}')
        # Choose the center of the empty run nearest to the expected boundary.
        runs = np.split(empty, np.where(np.diff(empty) > 1)[0]+1)
        run = min(runs, key=lambda r: abs(float(r.mean())-ideal))
        cuts.append(round(float(run.mean())))
    return cuts + [length]

def extract(pet, state):
    im = Image.open(ART / pet / 'actions' / f'{state}.png').convert('RGBA')
    alpha = np.asarray(im)[:,:,3]
    rows = STATES[state][0] // 4
    xs = boundaries(alpha, 4, 0)
    cells = {}
    for col in range(4):
        strip = im.crop((xs[col], 0, xs[col+1], im.height))
        ys = boundaries(np.asarray(strip)[:,:,3], rows, 1)
        for row in range(rows):
            cell = strip.crop((0, ys[row], strip.width, ys[row+1]))
            box = cell.getchannel('A').point(lambda a: 255 if a >= 64 else 0).getbbox()
            assert box is not None
            # Keep full antialiased character edges; discard transparent generation dust.
            crop = cell.crop(box)
            crop.putalpha(crop.getchannel('A').point(lambda a: 0 if a < 32 else a))
            cells[row*4+col] = crop
    return [cells[i] for i in range(rows*4)]

def normalize(cells, canvas=160):
    ratio=canvas/160
    scale = min(132*ratio/max(c.width for c in cells), 140*ratio/max(c.height for c in cells))
    frames = []
    for cell in cells:
        sprite = cell.resize((round(cell.width*scale), round(cell.height*scale)), Image.Resampling.LANCZOS)
        frame = Image.new('RGBA', (canvas, canvas))
        frame.alpha_composite(sprite, (round((canvas-sprite.width)/2), round(150*ratio)-sprite.height))
        frames.append(frame)
    return frames

def verify(path, count):
    with Image.open(path) as im:
        assert im.n_frames == count, (path, im.n_frames, count)
        hashes = set()
        for i in range(count):
            im.seek(i); frame = im.convert('RGBA')
            assert frame.size == (160, 160)
            a = frame.getchannel('A')
            assert all(a.getpixel(p)==0 for p in [(0,0),(159,0),(0,159),(159,159)])
            box = a.point(lambda x:255 if x>=96 else 0).getbbox()
            assert box and min(box[0], box[1], 160-box[2], 160-box[3])>=5, (path,i,box)
            hashes.add(hashlib.sha256(frame.tobytes()).hexdigest())
        assert len(hashes)==count, (path,'duplicate frames',len(hashes))

report = []
for pet, name in zip(PETS, NAMES):
    runtime = ART / pet / 'install'; runtime.mkdir(exist_ok=True)
    pet_frames = {}
    atlas = Image.new('RGBA', (2048,2048))
    sources = {}
    for state, (count, duration) in STATES.items():
        try:
            cells=extract(pet, state)
            frames = normalize(cells)
        except Exception as exc:
            print(f'BLOCKED {pet} {state}: {exc}')
            continue
        durations = [duration]*count
        for index,frame in enumerate(normalize(cells,256)):
            atlas.alpha_composite(frame,((index%8)*256,(list(STATES).index(state)*2+index//8)*256))
        webp = runtime / f'{pet}-{state}.webp'
        frames[0].save(webp, 'WEBP', save_all=True, append_images=frames[1:],
                       duration=durations, loop=0, quality=76, method=4, minimize_size=True)
        verify(webp, count)
        pet_frames[state]=frames
        key={'run-right':'runRight','run-left':'runLeft'}.get(state,state)
        sources[key]=f'assets/{pet}-{state}.webp'
        report.append({'pet':pet,'state':state,'frames':count,'duration':sum(durations),
                       'webpBytes':webp.stat().st_size})
    if len(pet_frames)==4:
        (runtime/'pet.json').write_text(json.dumps({'id':pet,'name':name,'sources':sources},ensure_ascii=False,indent=2),encoding='utf-8')
        native=ART/'小程序图集';native.mkdir(exist_ok=True)
        atlas.quantize(colors=256,method=Image.Quantize.FASTOCTREE).save(native/f'{pet}.png',optimize=True)
        normalize(extract(pet,'idle'),256)[0].save(native/f'{pet}-preview.png',optimize=True)
    contact=Image.new('RGB',(16*90,4*112),'#f0eee9'); draw=ImageDraw.Draw(contact)
    for row,(state,frames) in enumerate(pet_frames.items()):
        for col,frame in enumerate(frames):
            contact.paste(frame.resize((86,86),Image.Resampling.LANCZOS),(col*90,row*112+20),frame.resize((86,86),Image.Resampling.LANCZOS))
            draw.text((col*90+4,row*112+3),f'{state} {col+1}',fill='#333')
    contact.save(QA/f'{pet}-contact.png')
(QA/'assets-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'sequences':len(report),'frames':sum(r['frames'] for r in report),'webpBytes':sum(r['webpBytes'] for r in report)}))
if len(report)!=16:sys.exit(1)
if '--install' in sys.argv:
    for r in report:
        pet,state=r['pet'],r['state']; source=f'assets/{pet}-{state}.webp'
        shutil.copy2(ART/pet/'install'/f'{pet}-{state}.webp',ROOT/'site'/source)
    for source in (ART/'小程序图集').glob('*.png'):
        target=ROOT/'miniprogram/petmotion/assets'/source.name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(source,target)
