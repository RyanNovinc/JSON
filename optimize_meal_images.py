#!/usr/bin/env python3
"""
optimize_meal_images.py
Batch-optimise meal photos for the web: resize + convert to WebP.

Run from your repo root:
    pip install pillow
    python optimize_meal_images.py                  # processes images/meals/
    python optimize_meal_images.py --max-width 800 --quality 80
    python optimize_meal_images.py --force          # rebuild every webp

For each <name>.png / .jpg in the folder it writes an optimised <name>.webp
next to it. Source files are NEVER modified (your PNGs stay as the fallback).
Re-running only rebuilds a webp whose source PNG is newer — so after you
replace an image (e.g. pulled-pork.png), just run it again and only that one
rebuilds. Commit the resulting .webp files.
"""
import argparse, os, sys
from PIL import Image

EXTS = (".png", ".jpg", ".jpeg")

def human(n):
    n = float(n)
    for u in ("B", "KB", "MB"):
        if n < 1024:
            return f"{n:.0f}{u}"
        n /= 1024
    return f"{n:.1f}GB"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="images/meals", help="folder of source images")
    ap.add_argument("--max-width", type=int, default=800, help="max output width in px")
    ap.add_argument("--quality", type=int, default=80, help="WebP quality 1-100")
    ap.add_argument("--force", action="store_true", help="rebuild even if up to date")
    a = ap.parse_args()

    if not os.path.isdir(a.dir):
        sys.exit(f"Folder not found: {a.dir}  (run this from your repo root)")

    src_total = out_total = 0
    done = skipped = 0
    for name in sorted(os.listdir(a.dir)):
        base, ext = os.path.splitext(name)
        if ext.lower() not in EXTS:
            continue
        src = os.path.join(a.dir, name)
        dst = os.path.join(a.dir, base + ".webp")
        if (not a.force) and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            skipped += 1
            continue
        try:
            im = Image.open(src).convert("RGB")
        except Exception as e:
            print(f"  skip {name}: {e}")
            continue
        if im.width > a.max_width:
            h = round(im.height * a.max_width / im.width)
            im = im.resize((a.max_width, h), Image.LANCZOS)
        im.save(dst, "WEBP", quality=a.quality, method=6)
        s, o = os.path.getsize(src), os.path.getsize(dst)
        src_total += s
        out_total += o
        done += 1
        print(f"  {name:44} {human(s):>8} -> {human(o):>8}  {im.width}x{im.height}")

    print(f"\nConverted {done}, skipped {skipped} (already up to date).")
    if done:
        pct = 100 - round(out_total / src_total * 100)
        print(f"Total: {human(src_total)} -> {human(out_total)}  ({pct}% smaller)")

if __name__ == "__main__":
    main()