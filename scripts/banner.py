# Builds assets/banner.svg: banner.jpg + pixel twinkle overlays on detected stars.
import base64, random
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "assets/banner.jpg"
im = np.array(Image.open(SRC).convert("L")).astype(int)
H, W = im.shape
CX, CY = 365, 125  # main star

b = im > 170
lab, n = ndimage.label(b)
sizes = ndimage.sum(b, lab, range(1, n + 1))
cents = ndimage.center_of_mass(b, lab, range(1, n + 1))
stars = []
for s, (y, x) in zip(sizes, cents):
    x, y = int(x), int(y)
    if not 2 <= s <= 60 or (x - CX) ** 2 + (y - CY) ** 2 < 75 ** 2:
        continue
    ring = im[max(0, y - 9):y + 10, max(0, x - 9):x + 10]
    if (ring < 60).mean() > 0.6:
        stars.append((x, y, s))

random.seed(7)
parts = []
for x, y, s in stars:
    r = 5 if s < 8 else 7 if s < 15 else 9  # arm length in px
    dur = round(random.uniform(1.4, 3), 2)
    delay = round(random.uniform(0, 4), 2)
    arms = (f'<rect x="{x-r}" y="{y}" width="{2*r+1}" height="1"/>'
            f'<rect x="{x}" y="{y-r}" width="1" height="{2*r+1}"/>'
            f'<rect x="{x-1}" y="{y-1}" width="3" height="3"/>'
            f'<rect x="{x-2}" y="{y-2}" width="1" height="1"/><rect x="{x+2}" y="{y-2}" width="1" height="1"/>'
            f'<rect x="{x-2}" y="{y+2}" width="1" height="1"/><rect x="{x+2}" y="{y+2}" width="1" height="1"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#glow)" opacity=".5"/>')
    parts.append(f'<g class="tw" style="animation-duration:{dur}s;animation-delay:-{delay}s">{arms}</g>')

# main star: soft glow pulse + long cross flare
main = f'''
<circle cx="{CX}" cy="{CY}" r="45" fill="url(#glow)" class="pulse"/>
<g class="flare">
  <rect x="{CX-70}" y="{CY}" width="141" height="1"/><rect x="{CX-1}" y="{CY-1}" width="3" height="3"/>
  <rect x="{CX}" y="{CY-60}" width="1" height="121"/>
</g>'''

img = base64.b64encode(open(SRC, "rb").read()).decode()
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" width="{W*2}" height="{H*2}" shape-rendering="crispEdges">
<style>
.tw{{fill:#fff;opacity:0;animation-name:tw;animation-iteration-count:infinite;animation-timing-function:steps(1)}}
@keyframes tw{{0%,100%{{opacity:0}}25%{{opacity:.5}}35%,55%{{opacity:1}}65%{{opacity:.5}}80%{{opacity:0}}}}
.pulse{{transform-origin:{CX}px {CY}px;animation:pulse 3.2s ease-in-out infinite}}
@keyframes pulse{{0%,100%{{opacity:.35;transform:scale(.8)}}50%{{opacity:1;transform:scale(1.4)}}}}
.flare{{fill:#fff;transform-origin:{CX}px {CY}px;animation:flare 2.4s ease-in-out infinite}}
@keyframes flare{{0%,100%{{opacity:.3;transform:scale(.7)}}50%{{opacity:1;transform:scale(1.25)}}}}
</style>
<defs><radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<image width="{W}" height="{H}" style="image-rendering:pixelated" href="data:image/jpeg;base64,{img}"/>
{main}
{''.join(parts)}
</svg>'''
open("assets/banner.svg", "w").write(svg)
print(f"{len(stars)} stars, {len(svg)//1024} KB")
