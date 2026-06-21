#!/usr/bin/env python3
"""
Use Claude vision to detect and fix images that are physically rotated
(sideways or upside-down) regardless of EXIF data.

Run from the web/ directory:
  python scripts/fix-orientation.py

Saves a log of fixes to scripts/orientation-fixes.json so it can resume
if interrupted and won't re-check already-processed images.
"""

import base64
import json
import os
import sys
import time
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("anthropic not installed. Run: pip install anthropic")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("pillow not installed. Run: pip install pillow")
    sys.exit(1)

WEB_DIR = Path(__file__).parent.parent
IMAGES_DIR = WEB_DIR / "public" / "images"
LOG_FILE = Path(__file__).parent / "orientation-fixes.json"

# Load API key from root .env
env_file = WEB_DIR.parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

PROMPT = """Look at this photo carefully. Is it rotated incorrectly — meaning it appears sideways (90 degrees off) or upside down?

Reply with EXACTLY one of these options:
- ok  (image is correctly oriented, even if it's a portrait shot)
- rotate_cw  (needs 90° clockwise rotation to be right-side up)
- rotate_ccw  (needs 90° counter-clockwise rotation to be right-side up)
- rotate_180  (needs 180° flip — upside down)

Only flag it if faces, text, or the scene are clearly sideways or upside-down.
Reply with only the option, nothing else."""

ROTATIONS = {
    "rotate_cw":  Image.ROTATE_270,   # PIL ROTATE_270 = visually 90° CW
    "rotate_ccw": Image.ROTATE_90,    # PIL ROTATE_90  = visually 90° CCW
    "rotate_180": Image.ROTATE_180,
}


def encode_image(path: Path) -> str:
    with open(path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


def check_orientation(client: anthropic.Anthropic, path: Path) -> str:
    b64 = encode_image(path)
    for attempt in range(3):
        try:
            msg = client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=20,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": PROMPT},
                    ],
                }],
            )
            result = msg.content[0].text.strip().lower()
            for key in ("ok", "rotate_cw", "rotate_ccw", "rotate_180"):
                if key in result:
                    return key
            return "ok"
        except Exception as e:
            if attempt < 2:
                time.sleep(2 ** attempt)
            else:
                print(f"  API error: {e}")
                return "ok"


def rotate_image(path: Path, rotation: str) -> bool:
    try:
        with Image.open(path) as img:
            rotated = img.transpose(ROTATIONS[rotation])
            rotated.save(path, "JPEG", quality=85, optimize=True)
        return True
    except Exception as e:
        print(f"  Rotation error: {e}")
        return False


def load_log() -> dict:
    if LOG_FILE.exists():
        try:
            return json.loads(LOG_FILE.read_text())
        except Exception:
            pass
    return {}


def save_log(log: dict):
    LOG_FILE.write_text(json.dumps(log, indent=2))


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set.")
        sys.exit(1)

    if not IMAGES_DIR.exists():
        print(f"Images directory not found: {IMAGES_DIR}")
        sys.exit(1)

    image_files = sorted(
        f for f in IMAGES_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    print(f"Checking {len(image_files)} images for orientation issues\n")

    log = load_log()
    client = anthropic.Anthropic(api_key=api_key)

    fixed = 0
    checked = 0

    for i, img_path in enumerate(image_files, 1):
        fname = img_path.name

        if fname in log:
            # Already checked in a prior run — skip silently
            continue

        print(f"[{i}/{len(image_files)}] {fname} ... ", end="", flush=True)
        result = check_orientation(client, img_path)
        log[fname] = result
        checked += 1
        time.sleep(0.05)

        if result == "ok":
            print("ok")
        else:
            print(f"FIXING ({result})", end=" ... ", flush=True)
            if rotate_image(img_path, result):
                print("done")
                fixed += 1
            else:
                print("FAILED")

        # Save progress every 20 images
        if checked % 20 == 0:
            save_log(log)

    save_log(log)

    rotated_files = [f for f, r in log.items() if r != "ok"]
    print(f"\nDone: {checked} newly checked, {fixed} rotated this run")
    if rotated_files:
        print(f"All rotated files ({len(rotated_files)} total):")
        for f in rotated_files:
            print(f"  {f} → {log[f]}")
    else:
        print("No orientation issues found.")


if __name__ == "__main__":
    main()
