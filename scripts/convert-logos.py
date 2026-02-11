#!/usr/bin/env python3
"""Convert Toy Outpost PDF logos to PNG with transparent background."""
import fitz
from pathlib import Path

from PIL import Image

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
SITE_ROOT = SCRIPT_DIR.parent
ASSETS_DIR = SITE_ROOT / "assets"
PDFS = [
    (
        Path("/Users/kristian/Library/Application Support/Cursor/User/workspaceStorage/b9ad67fc8d7abf408832ae37a73a4883/pdfs/b4975d14-d407-4855-9afb-3d36c11f2104/horizontal-logo.pdf"),
        "logo-horizontal.png",
    ),
    (
        Path("/Users/kristian/Library/Application Support/Cursor/User/workspaceStorage/b9ad67fc8d7abf408832ae37a73a4883/pdfs/69c96ffa-c4a0-4327-b9ab-05978d2a1b2f/vertical-logo.pdf"),
        "logo-vertical.png",
    ),
]

ASSETS_DIR.mkdir(exist_ok=True)
DPI = 200  # Good for retina and sharp on web

# Pixels with R,G,B all >= this are treated as "background" white
WHITE_THRESHOLD = 248


def is_white(pixel, threshold=WHITE_THRESHOLD):
    r, g, b = pixel[0], pixel[1], pixel[2]
    return r >= threshold and g >= threshold and b >= threshold


def remove_outer_white_transparent(img: Image.Image) -> Image.Image:
    """Make transparent only the white pixels that touch the image edges (the
    background around the logo). White that is inside the logo is kept.
    """
    img = img.convert("RGBA")
    w, h = img.size
    data = list(img.getdata())

    # 1D index: (y * w + x). Build white mask as list of bools.
    white = [is_white(data[i]) for i in range(w * h)]

    # Flood-fill from edges: only white connected to border -> background
    background = [False] * (w * h)
    stack = []
    for x in range(w):
        i0 = 0 + x
        i1 = (h - 1) * w + x
        if white[i0]:
            stack.append(i0)
        if white[i1]:
            stack.append(i1)
    for y in range(1, h - 1):
        i0 = y * w + 0
        i1 = y * w + (w - 1)
        if white[i0]:
            stack.append(i0)
        if white[i1]:
            stack.append(i1)

    while stack:
        i = stack.pop()
        if background[i]:
            continue
        background[i] = True
        x, y = i % w, i // w
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                ni = ny * w + nx
                if white[ni] and not background[ni]:
                    stack.append(ni)

    for i in range(w * h):
        if background[i]:
            r, g, b, a = data[i]
            data[i] = (r, g, b, 0)

    img.putdata(data)
    return img


for pdf_path, out_name in PDFS:
    if not pdf_path.exists():
        print(f"Skip (not found): {pdf_path}")
        continue
    out_path = ASSETS_DIR / out_name
    doc = fitz.open(pdf_path)
    page = doc[0]
    pix = page.get_pixmap(alpha=True, dpi=DPI)
    pix.save(str(out_path))
    doc.close()

    # Remove only the outer white (around the logo), keep white inside the logo
    im = Image.open(out_path)
    im = remove_outer_white_transparent(im)
    im.save(out_path, "PNG")
    print(f"Saved: {out_path} (outer white → transparent)")

print("Done.")
