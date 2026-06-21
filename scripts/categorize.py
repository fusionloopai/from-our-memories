#!/usr/bin/env python3
"""
Categorize all images in public/images/ using Claude claude-haiku-4-5 vision.
Writes data/categories.json with slide order and chapter assignments.

Run from the web/ directory:
  pip install anthropic pillow
  Add ANTHROPIC_API_KEY to .env.local
  python scripts/categorize.py

Resumes automatically if interrupted (skips already-categorized images).
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

WEB_DIR = Path(__file__).parent.parent
IMAGES_DIR = WEB_DIR / "public" / "images"
OUTPUT_FILE = WEB_DIR / "data" / "categories.json"

# Load API key from .env.local if present
env_file = WEB_DIR / ".env.local"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

CHAPTERS = [
    ("title",          "From Our Memories"),
    ("baby-childhood", "Baby & Childhood"),
    ("old-family",     "Old Family Memories"),
    ("wedding",        "Wedding & Romance"),
    ("family-years",   "Family Through the Years"),
    ("reunions",       "Reunions & Gatherings"),
    ("adventures",     "Adventures & Activities"),
    ("recent",         "Recent Memories"),
]
CHAPTER_KEYS = [k for k, _ in CHAPTERS]

PROMPT = """Look at this family photo and assign it to exactly ONE of these categories:

- title: An official title/intro slide with text overlay (not a regular photo)
- baby-childhood: Babies, toddlers, or young children (under ~12 years old)
- old-family: Vintage or historical photos (black & white, or clearly pre-1990s color)
- wedding: Wedding ceremonies, receptions, brides, grooms, or romantic couple portraits
- family-years: Family group photos, portraits, or everyday moments from the 1990s–2010s
- reunions: Family reunions, large outdoor gatherings, fishing trips, holiday gatherings
- adventures: Outdoor activities, hiking, camping, sledding, scenic nature/travel photos
- recent: Modern everyday photos from approximately 2018–present (smartphone quality)

Reply with ONLY the category key, nothing else. Example: old-family"""

KNOWN = {
    "Title Slide.jpg": "title",
    "wedding.jpg": "wedding",
}


def encode_image(path: Path) -> str:
    with open(path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


def categorize_one(client: anthropic.Anthropic, path: Path) -> str:
    # Use known mapping for obvious files
    if path.name in KNOWN:
        return KNOWN[path.name]

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
            cat = msg.content[0].text.strip().lower()
            if cat in CHAPTER_KEYS:
                return cat
            # Fuzzy match
            for key in CHAPTER_KEYS:
                if key in cat:
                    return key
            return "family-years"  # fallback
        except Exception as e:
            if attempt < 2:
                time.sleep(2 ** attempt)
            else:
                print(f"  API error after 3 attempts: {e}")
                return "family-years"


def load_existing() -> dict:
    if OUTPUT_FILE.exists():
        try:
            data = json.loads(OUTPUT_FILE.read_text())
            return {s["file"]: s["category"] for s in data.get("slides", [])}
        except Exception:
            pass
    return {}


def save(slides: list):
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Group and sort within chapters
    chapter_order = {k: i for i, (k, _) in enumerate(CHAPTERS)}
    chapter_labels = {k: lbl for k, lbl in CHAPTERS}

    # Title slide always first within its group; rest sorted by filename
    slides_sorted = sorted(
        slides,
        key=lambda s: (chapter_order.get(s["category"], 99), s["file"])
    )

    output = {
        "chapters": [{"key": k, "label": lbl} for k, lbl in CHAPTERS],
        "slides": slides_sorted,
    }
    OUTPUT_FILE.write_text(json.dumps(output, indent=2))


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set.")
        print("Add it to web/.env.local:  ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    if not IMAGES_DIR.exists():
        print(f"Images directory not found: {IMAGES_DIR}")
        print("Run process-images.py first.")
        sys.exit(1)

    image_files = sorted(
        f for f in IMAGES_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    print(f"Found {len(image_files)} images to categorize\n")

    existing = load_existing()
    client = anthropic.Anthropic(api_key=api_key)

    slides = []
    new_count = 0

    for i, img_path in enumerate(image_files, 1):
        fname = img_path.name
        if fname in existing:
            cat = existing[fname]
            print(f"[{i}/{len(image_files)}] {fname} → {cat} (cached)")
        else:
            print(f"[{i}/{len(image_files)}] {fname} → ", end="", flush=True)
            cat = categorize_one(client, img_path)
            print(cat)
            new_count += 1
            time.sleep(0.1)  # gentle rate limit

        slides.append({"file": fname, "category": cat})

        # Save progress every 10 images
        if new_count > 0 and new_count % 10 == 0:
            save(slides)

    save(slides)
    print(f"\nDone. {new_count} new categorizations. Output: {OUTPUT_FILE}")

    # Print summary
    from collections import Counter
    counts = Counter(s["category"] for s in slides)
    print("\nCategory counts:")
    for key, label in CHAPTERS:
        print(f"  {label}: {counts.get(key, 0)}")


if __name__ == "__main__":
    main()
