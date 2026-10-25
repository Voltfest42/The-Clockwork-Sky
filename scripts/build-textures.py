"""
Builds the planet textures in src/data/textures/ for the planet globes
(Figure 8.2) from Solar System Scope's 2k maps (solarsystemscope.com/textures,
CC BY 4.0), resized to 1024 x 512 and saved as WebP.

    python -I scripts/build-textures.py

It needs Pillow. The downloads are cached in scripts/.cache/textures/. (The
other data scripts are TypeScript run by Node; this one is Python because Node
has no image encoder without a native dependency.)
"""

import os
import sys
import urllib.request

from PIL import Image

BASE = 'https://www.solarsystemscope.com/textures/download/'
CACHE = os.path.join('scripts', '.cache', 'textures')
OUT = os.path.join('src', 'data', 'textures')
WIDTH = 1024

# Output name: source file.
MAPS = {
    'mercury': '2k_mercury.jpg',
    'venus': '2k_venus_atmosphere.jpg',
    'earth': '2k_earth_daymap.jpg',
    'moon': '2k_moon.jpg',
    'mars': '2k_mars.jpg',
    'jupiter': '2k_jupiter.jpg',
    'saturn': '2k_saturn.jpg',
    'saturn-ring': '2k_saturn_ring_alpha.png',
    'uranus': '2k_uranus.jpg',
    'neptune': '2k_neptune.jpg',
}


def fetch(name: str) -> str:
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        print(f'Downloading {BASE}{name}')
        request = urllib.request.Request(BASE + name, headers={'User-Agent': 'the-clockwork-sky build script'})
        with urllib.request.urlopen(request) as response:
            data = response.read()
        with open(path, 'wb') as f:
            f.write(data)
    return path


def main() -> None:
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for out, source in MAPS.items():
        image = Image.open(fetch(source))
        ring = out == 'saturn-ring'
        image = image.convert('RGBA' if ring else 'RGB')
        height = image.height if ring else WIDTH // 2
        image = image.resize((WIDTH, height), Image.LANCZOS)
        target = os.path.join(OUT, f'{out}.webp')
        image.save(target, 'WEBP', quality=82, method=6)
        size = os.path.getsize(target)
        total += size
        print(f'{target}: {image.width} x {image.height}, {size / 1024:.0f} kB')
    print(f'Total {total / 1024:.0f} kB')


if __name__ == '__main__':
    sys.exit(main())
