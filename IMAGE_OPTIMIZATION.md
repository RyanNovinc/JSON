# Image Optimization Guide

This document explains the image optimization process used to dramatically reduce file sizes while maintaining visual quality.

## Overview

Claude Code successfully applied the same optimization technique used for exercise images to the meal images, achieving excellent results:

- **Exercise Images**: Already optimized in commit `e9fbb77` (147MB → 20MB, 86% reduction)
- **Meal Images**: Just optimized (26MB → 7MB, 70% reduction)

## Technique Used: pngquant

The optimization uses **pngquant**, a command-line tool for lossy PNG compression that maintains excellent visual quality while dramatically reducing file size.

### Installation
```bash
brew install pngquant
```

### Settings Used
```bash
pngquant --quality=65-80 --force --ext .png [filename]
```

**Parameter explanation:**
- `--quality=65-80`: Balanced quality range (65-80% quality retention)
- `--force`: Overwrite existing files
- `--ext .png`: Keep original file extension

## Results Achieved

### Exercise Images (commit e9fbb77)
- **Before**: 147MB total
- **After**: 20MB total 
- **Reduction**: 86%
- **Individual images**: ~900KB → ~150KB

### Meal Images (May 13, 2026)
- **Before**: 26MB total (21 images)
- **After**: 7MB total
- **Reduction**: 70%
- **Range**: 65-84% reduction per image

## Example Results from Meal Images

| Image | Before | After | Reduction |
|-------|---------|--------|-----------|
| Cookies & Gains.png | 962KB | 157KB | 84% |
| King Kong Chocolate.png | 944KB | 164KB | 83% |
| Brekkie to GROW-Grow.png | 811KB | 209KB | 75% |
| Energy Lift Heavy.png | 1040KB | 261KB | 75% |
| Choc Muscle MAXX.png | 1033KB | 269KB | 74% |
| Mango Mass.png | 889KB | 233KB | 74% |

## Automation Scripts

The project includes automation scripts for consistent optimization:

1. **`scripts/optimize-new-images.sh`** - Optimizes specific exercise image folders
2. **Manual commands** - For ad-hoc optimization of any directory

### Example Command for New Images
```bash
cd /path/to/images
pngquant --quality=65-80 --force --ext .png *.png
```

## Why This Works

1. **pngquant uses perceptual quality**: Reduces colors in a way that's barely noticeable to human vision
2. **Lossy but intelligent**: Unlike lossless compression, it actually removes data, but only data humans can't easily perceive  
3. **Mobile-optimized**: Smaller images = faster app downloads and better user experience
4. **Build-safe**: No risk of broken builds since files are optimized in place

## Quality Assessment

The 65-80% quality range was chosen because:
- Below 65%: Noticeable quality degradation
- Above 80%: Diminishing returns on file size reduction
- 65-80%: Sweet spot for mobile apps (great quality, dramatic size reduction)

## Notes for Claude Code

**How this was done:**
1. Found the existing optimization script in `scripts/optimize-new-images.sh`
2. Identified that exercise images were already optimized using pngquant with `--quality=65-80`
3. Applied the same technique to meal images in `src/assets/meals/`
4. Achieved 70% reduction across 21 images (26MB → 7MB)

**Next time images need optimization:**
1. Check if pngquant is installed: `which pngquant`
2. Run: `pngquant --quality=65-80 --force --ext .png *.png` in the target directory
3. Document results and update this file

## Breakfast Meal Images (June 1, 2026)
- **Before**: 31MB total (15 images)
- **After**: 7.9MB total
- **Reduction**: 74%
- **Range**: 61-74% reduction per image

### Breakfast Meal Optimization Results

| Image | Before | After | Reduction |
|-------|--------|-------|-----------|
| muscle_oats.png | 1.3M | 367K | 72% |
| maple_muscle_toast.png | 1.5M | 514K | 66% |
| scramble_stack.png | 1.7M | 522K | 69% |
| overnight_oats.png | 935K | 240K | 74% |
| greek_yoghurt_bowl.png | 1.3M | 428K | 67% |
| cottage_cheese_bowl.png | 1.6M | 545K | 66% |
| pb_banana_toast.png | 1.6M | 506K | 68% |
| protein_pancakes.png | 1.5M | 454K | 70% |
| steak_and_eggs.png | 1.8M | 609K | 66% |
| shakshuka.png | 2.6M | 899K | 65% |
| freezer_breakfast_burrito.png | 1.6M | 478K | 70% |
| baked_oats.png | 1.5M | 457K | 70% |
| egg_muffins.png | 1.9M | 738K | 61% |
| smoked_salmon_bagel.png | 1.9M | 646K | 66% |
| big_breakfast_plate.png | 1.9M | 666K | 65% |

**Total app size impact:**
- Exercise images: -127MB
- Meal images: -19MB  
- Breakfast meal images: -23MB
- **Combined savings: 169MB** (massive improvement for mobile app downloads)