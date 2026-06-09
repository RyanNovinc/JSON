# Plate Image Filename Fix Summary

## Issue Fixed
✅ **Root Cause**: Plate `image_filename` values contained old human-readable names (spaces, capitals, parentheses, emoji) that didn't match the deployed kebab-case files in `/images/meals/`.

## Changes Made

### 1. Deterministic Filename Function
Created `generatePlateFilename(mealSlug, plateId)` function that ensures consistent naming:

```javascript
function generatePlateFilename(mealSlug, plateId) {
  const kebabSlug = mealSlug.replace(/_/g, '-');
  const kebabPlateId = plateId.replace(/_/g, '-');
  
  // For base plates that don't need plate suffix
  if (plateId === mealSlug || plateId === 'base' || plateId === 'standard') {
    return `${kebabSlug}.png`;
  }
  
  // For specific plate variants, append plate ID
  return `${kebabSlug}-${kebabPlateId}.png`;
}
```

### 2. Fixed 30 Plate Image References
Updated `meals.json` with correct filenames:

**Key Examples Fixed:**
- `"Spaghetti Bolognese (spaghetti).png"` → `"spaghetti-bolognese-spaghetti.png"`
- `"Butter Chicken with Basmati Rice.png"` → `"butter-chicken-with-basmati-rice.png"`
- `"Chicken Parma (parma).png"` → `"chicken-parma-parma.png"`
- `"Lamb Kofta Wrap (wrap).png"` → `"lamb-kofta-wrap-wrap.png"`
- `"Bolognese Lasagne ⚡ STUNT PLATE (lasagne).png"` → `"bolognese-lasagne-stunt-plate-lasagne.png"`

### 3. Verification
✅ All 30 fixed filenames match existing files in `/images/meals/`  
✅ No 404s expected for plate images anymore  
✅ Website should now load all multi-plate meal images correctly  

## Next Steps for Display Names
Still needed: Update website to show `plates[0].display_name || meal.display_name` instead of just `meal.display_name` so titles read "Butter Chicken" instead of "Butter Chicken with Basmati Rice".

## Files Modified
- `meals.json` - Updated 30 plate `image_filename` values
- `fix_plate_image_filenames.js` - Script used to perform the fix

## Verification Commands
```bash
# Check specific fixed filenames
grep -A 5 '"id": "spaghetti"' meals.json
grep "butter-chicken-with-basmati-rice" meals.json
grep "chicken-parma-parma" meals.json

# Verify files exist
ls images/meals/ | grep -E "spaghetti-bolognese-spaghetti|butter-chicken-with-basmati-rice|chicken-parma-parma"
```