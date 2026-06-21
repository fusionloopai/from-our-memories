#!/usr/bin/env python3
"""
Process all images from ../images/ into public/images/
- Converts HEIC to JPEG
- Auto-corrects orientation via EXIF
- Resizes to max 1920px on longest side
- Quality 85

Run from the web/ directory:
  pip install pillow pillow-heif
  python scripts/process-images.py
"""

import os
import sys
from pathlib import Path
from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    print("pillow-heif not installed. HEIC files will be skipped.")
    print("Install with: pip install pillow-heif")

WEB_DIR = Path(__file__).parent.parent
INPUT_DIR = WEB_DIR.parent / "images"
OUTPUT_DIR = WEB_DIR / "public" / "images"
MAX_SIZE = 1920
QUALITY = 85
SUPPORTED = {".jpg", ".jpeg", ".png", ".heic", ".heif"}


def process_image(src: Path, dst: Path) -> bool:
    try:
        with Image.open(src) as img:
            # Apply EXIF rotation so orientation is correct in browser
            img = ImageOps.exif_transpose(img)

            # Convert to RGB (handles RGBA PNG, HEIC, etc.)
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            # Resize so longest side <= MAX_SIZE
            w, h = img.size
            if max(w, h) > MAX_SIZE:
                scale = MAX_SIZE / max(w, h)
                img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

            dst.parent.mkdir(parents=True, exist_ok=True)
            img.save(dst, "JPEG", quality=QUALITY, optimize=True)
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def main():
    if not INPUT_DIR.exists():
        print(f"Input directory not found: {INPUT_DIR}")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    files = sorted(
        f for f in INPUT_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED
    )

    print(f"Found {len(files)} images in {INPUT_DIR}")
    print(f"Output → {OUTPUT_DIR}\n")

    ok = skip = fail = 0
    for i, src in enumerate(files, 1):
        # Output always as .jpg
        dst = OUTPUT_DIR / (src.stem + ".jpg")

        if dst.exists():
            print(f"[{i}/{len(files)}] skip (exists): {src.name}")
            skip += 1
            continue

        print(f"[{i}/{len(files)}] {src.name} → {dst.name}", end=" ... ")
        if process_image(src, dst):
            print("ok")
            ok += 1
        else:
            fail += 1

    print(f"\nDone: {ok} processed, {skip} skipped, {fail} failed")
    print(f"Total images ready: {ok + skip}")


if __name__ == "__main__":
    main()
