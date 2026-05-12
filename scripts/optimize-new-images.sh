#!/bin/bash

# Script to optimize new exercise images using pngquant
# This applies the same optimization as commit e9fbb77 (86% size reduction)

echo "🎯 Starting image optimization for new exercises..."

# Define the base directory
BASE_DIR="/Users/ryannovinc/Desktop/AI-Workout-Generator/exercise-images"

# Define the new exercise folders
EXERCISES=(
  "back-extension"
  "hanging-leg-raise"
  "smith-machine-calf-raise"
  "dumbbell-wrist-curl"
  "reverse-wrist-curl"
)

# Counter for processed images
TOTAL_PROCESSED=0
TOTAL_BEFORE=0
TOTAL_AFTER=0

# Process each exercise
for EXERCISE in "${EXERCISES[@]}"; do
  EXERCISE_DIR="$BASE_DIR/$EXERCISE"
  
  if [ ! -d "$EXERCISE_DIR" ]; then
    echo "⚠️  Skipping $EXERCISE - directory not found"
    continue
  fi
  
  echo ""
  echo "📁 Processing $EXERCISE..."
  
  # Find all PNG files in this exercise folder
  for IMAGE in $(find "$EXERCISE_DIR" -name "*.png"); do
    if [ -f "$IMAGE" ]; then
      # Get original size
      BEFORE_SIZE=$(stat -f%z "$IMAGE" 2>/dev/null || stat -c%s "$IMAGE" 2>/dev/null)
      BEFORE_KB=$((BEFORE_SIZE / 1024))
      
      echo "  🖼️  Optimizing: $(basename "$IMAGE") (${BEFORE_KB}KB)"
      
      # Run pngquant with the same settings as the original optimization
      # --quality=65-80: Balance between quality and size (same as commit)
      # --force: Overwrite existing file
      # --ext .png: Keep the same extension
      pngquant --quality=65-80 --force --ext .png "$IMAGE"
      
      # Get new size
      AFTER_SIZE=$(stat -f%z "$IMAGE" 2>/dev/null || stat -c%s "$IMAGE" 2>/dev/null)
      AFTER_KB=$((AFTER_SIZE / 1024))
      
      # Calculate reduction
      REDUCTION=$((100 - (AFTER_SIZE * 100 / BEFORE_SIZE)))
      
      echo "      ✅ Reduced to ${AFTER_KB}KB (-${REDUCTION}%)"
      
      # Update totals
      TOTAL_PROCESSED=$((TOTAL_PROCESSED + 1))
      TOTAL_BEFORE=$((TOTAL_BEFORE + BEFORE_SIZE))
      TOTAL_AFTER=$((TOTAL_AFTER + AFTER_SIZE))
    fi
  done
done

# Show summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Optimization Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Images processed: $TOTAL_PROCESSED"

if [ $TOTAL_PROCESSED -gt 0 ]; then
  TOTAL_BEFORE_MB=$((TOTAL_BEFORE / 1024 / 1024))
  TOTAL_AFTER_MB=$((TOTAL_AFTER / 1024 / 1024))
  TOTAL_REDUCTION=$((100 - (TOTAL_AFTER * 100 / TOTAL_BEFORE)))
  
  echo "💾 Total size before: ${TOTAL_BEFORE_MB}MB"
  echo "💾 Total size after: ${TOTAL_AFTER_MB}MB"
  echo "🎯 Total reduction: ${TOTAL_REDUCTION}%"
else
  echo "⚠️  No images found to optimize"
  echo ""
  echo "Please add your images to these folders:"
  for EXERCISE in "${EXERCISES[@]}"; do
    echo "  • $BASE_DIR/$EXERCISE/blue/"
    echo "  • $BASE_DIR/$EXERCISE/pink/"
  done
fi

echo ""
echo "💡 Note: This uses the same optimization settings as the"
echo "   original image optimization (pngquant quality 65-80)"