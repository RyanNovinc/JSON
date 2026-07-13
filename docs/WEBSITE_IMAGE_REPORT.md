# Website Image Fix Report

## Summary
Fixed all 109 broken meal images on JSON.fit GitHub Pages website by creating properly slugified image files in `images/meals/` directory.

## Root Cause
The website's `slugifyImage()` function transforms image filenames from `meals.json` using:
1. NFKD normalization (strips accents: Ćevapi → Cevapi)
2. Remove special characters (parentheses, emojis, etc.)
3. Replace spaces and underscores with hyphens
4. Convert to lowercase

Example: `"Butter Chicken with Basmati Rice.png"` → `"butter-chicken-with-basmati-rice.png"`

## Resolution Process

### Images Processed: 109 total
- **88 images** - Direct copy from app assets (snake_case → kebab-case)
- **21 images** - Manual mapping required for complex variations

### Manual Mappings Applied:
| Original (from meals.json) | App Asset | Website Slug |
|---------------------------|-----------|-------------|
| `BBQ Pulled Pork Burger (sandwich).png` | `pulled_pork_sandwich.png` | `bbq-pulled-pork-burger-sandwich.png` |
| `Butter Chicken with Basmati Rice.png` | `butter_chicken_with_rice.png` | `butter-chicken-with-basmati-rice.png` |
| `Massaman Beef Curry with Rice.png` | `massaman_rice.png` | `massaman-beef-curry-with-rice.png` |
| `Chicken Schnitzel.png` | `chicken_schnitzel.png` | `chicken-schnitzel.png` |
| `Chicken Parma (parma).png` | `chicken_parma_parma.png` | `chicken-parma-parma.png` |
| `cevapi_with_flatbread.png` | `cevapi_flatbread.png` | `cevapi-with-flatbread.png` |
| *(+ 15 other plate variations)* | | |

## Key Fixed Images
The four originally reported broken images are now resolved:
- ✅ **Butter Chicken with Basmati Rice** → `butter-chicken-with-basmati-rice.png`
- ✅ **Slow-Cooked Massaman Beef Curry** → `massaman-beef-curry-with-rice.png` 
- ✅ **Lamb Kofta** → `lamb-kofta.png`
- ✅ **Ćevapi** → `cevapi-with-flatbread.png`

## Verification
✅ All 109 unique `image_filename` values from `meals.json` now have corresponding slugified files in `images/meals/`
✅ Website image loading should work for both meal-level and plate-level images

## Files Added
- `images/meals/` directory with 109 properly named image files
- Analysis scripts: `analyze_website_images.js`, `copy_images_to_website.js`, `fix_missing_images.js`