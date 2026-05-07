#!/bin/bash

# Script to create folder structure for exercise images
# This creates the exact structure needed for your 69 exercises

echo "Creating exercise image folders..."

# Create base directory
mkdir -p exercise-images

# Create folders for all 69 exercises
mkdir -p exercise-images/arnold-press/blue exercise-images/arnold-press/pink
mkdir -p exercise-images/assisted-pull-up/blue exercise-images/assisted-pull-up/pink
mkdir -p exercise-images/banded-clamshell/blue exercise-images/banded-clamshell/pink
mkdir -p exercise-images/barbell-back-squat/blue exercise-images/barbell-back-squat/pink
mkdir -p exercise-images/barbell-bench-press/blue exercise-images/barbell-bench-press/pink
mkdir -p exercise-images/barbell-bent-over-row/blue exercise-images/barbell-bent-over-row/pink
mkdir -p exercise-images/barbell-curl/blue exercise-images/barbell-curl/pink
mkdir -p exercise-images/barbell-hip-thrust/blue exercise-images/barbell-hip-thrust/pink
mkdir -p exercise-images/barbell-lunge/blue exercise-images/barbell-lunge/pink
mkdir -p exercise-images/barbell-pendlay-row/blue exercise-images/barbell-pendlay-row/pink
mkdir -p exercise-images/bulgarian-split-squat/blue exercise-images/bulgarian-split-squat/pink
mkdir -p exercise-images/cable-curl/blue exercise-images/cable-curl/pink
mkdir -p exercise-images/cable-fly/blue exercise-images/cable-fly/pink
mkdir -p exercise-images/cable-hip-abduction/blue exercise-images/cable-hip-abduction/pink
mkdir -p exercise-images/cable-lateral-raise/blue exercise-images/cable-lateral-raise/pink
mkdir -p exercise-images/cable-pull-through/blue exercise-images/cable-pull-through/pink
mkdir -p exercise-images/cable-pullover/blue exercise-images/cable-pullover/pink
mkdir -p exercise-images/chest-supported-db-row/blue exercise-images/chest-supported-db-row/pink
mkdir -p exercise-images/db-bench-press/blue exercise-images/db-bench-press/pink
mkdir -p exercise-images/db-bicep-curl/blue exercise-images/db-bicep-curl/pink
mkdir -p exercise-images/db-fly/blue exercise-images/db-fly/pink
mkdir -p exercise-images/db-hip-thrust/blue exercise-images/db-hip-thrust/pink
mkdir -p exercise-images/db-lateral-raise/blue exercise-images/db-lateral-raise/pink
mkdir -p exercise-images/db-lunge/blue exercise-images/db-lunge/pink
mkdir -p exercise-images/db-overhead-extension/blue exercise-images/db-overhead-extension/pink
mkdir -p exercise-images/db-romanian-deadlift/blue exercise-images/db-romanian-deadlift/pink
mkdir -p exercise-images/db-row/blue exercise-images/db-row/pink
mkdir -p exercise-images/db-shoulder-press/blue exercise-images/db-shoulder-press/pink
mkdir -p exercise-images/goblet-squat/blue exercise-images/goblet-squat/pink
mkdir -p exercise-images/hack-squat/blue exercise-images/hack-squat/pink
mkdir -p exercise-images/hip-abduction-machine/blue exercise-images/hip-abduction-machine/pink
mkdir -p exercise-images/incline-barbell-press/blue exercise-images/incline-barbell-press/pink
mkdir -p exercise-images/incline-db-press/blue exercise-images/incline-db-press/pink
mkdir -p exercise-images/incline-dumbbell-press/blue exercise-images/incline-dumbbell-press/pink
mkdir -p exercise-images/kettlebell-swing/blue exercise-images/kettlebell-swing/pink
mkdir -p exercise-images/lat-pulldown/blue exercise-images/lat-pulldown/pink
mkdir -p exercise-images/lat-pulldown-neutral-grip/blue exercise-images/lat-pulldown-neutral-grip/pink
mkdir -p exercise-images/lateral-raise/blue exercise-images/lateral-raise/pink
mkdir -p exercise-images/leg-extension/blue exercise-images/leg-extension/pink
mkdir -p exercise-images/leg-press/blue exercise-images/leg-press/pink
mkdir -p exercise-images/leg-press-calf-raise/blue exercise-images/leg-press-calf-raise/pink
mkdir -p exercise-images/lying-leg-curl/blue exercise-images/lying-leg-curl/pink
mkdir -p exercise-images/machine-chest-fly/blue exercise-images/machine-chest-fly/pink
mkdir -p exercise-images/machine-chest-press/blue exercise-images/machine-chest-press/pink
mkdir -p exercise-images/machine-lateral-raise/blue exercise-images/machine-lateral-raise/pink
mkdir -p exercise-images/machine-row/blue exercise-images/machine-row/pink
mkdir -p exercise-images/machine-shoulder-press/blue exercise-images/machine-shoulder-press/pink
mkdir -p exercise-images/nordic-hamstring-curl/blue exercise-images/nordic-hamstring-curl/pink
mkdir -p exercise-images/overhead-press/blue exercise-images/overhead-press/pink
mkdir -p exercise-images/overhead-tricep-extension/blue exercise-images/overhead-tricep-extension/pink
mkdir -p exercise-images/overhead-triceps-extension-cable/blue exercise-images/overhead-triceps-extension-cable/pink
mkdir -p exercise-images/pec-deck/blue exercise-images/pec-deck/pink
mkdir -p exercise-images/push-up/blue exercise-images/push-up/pink
mkdir -p exercise-images/romanian-deadlift/blue exercise-images/romanian-deadlift/pink
mkdir -p exercise-images/seated-cable-row/blue exercise-images/seated-cable-row/pink
mkdir -p exercise-images/seated-calf-raise/blue exercise-images/seated-calf-raise/pink
mkdir -p exercise-images/seated-leg-curl/blue exercise-images/seated-leg-curl/pink
mkdir -p exercise-images/single-leg-calf-raise/blue exercise-images/single-leg-calf-raise/pink
mkdir -p exercise-images/single-leg-hip-thrust/blue exercise-images/single-leg-hip-thrust/pink
mkdir -p exercise-images/sissy-squat/blue exercise-images/sissy-squat/pink
mkdir -p exercise-images/skull-crusher/blue exercise-images/skull-crusher/pink
mkdir -p exercise-images/smith-machine-calf-raise/blue exercise-images/smith-machine-calf-raise/pink
mkdir -p exercise-images/smith-machine-hip-thrust/blue exercise-images/smith-machine-hip-thrust/pink
mkdir -p exercise-images/smith-machine-incline-press/blue exercise-images/smith-machine-incline-press/pink
mkdir -p exercise-images/standing-calf-raise/blue exercise-images/standing-calf-raise/pink
mkdir -p exercise-images/stiff-leg-deadlift/blue exercise-images/stiff-leg-deadlift/pink
mkdir -p exercise-images/t-bar-row/blue exercise-images/t-bar-row/pink
mkdir -p exercise-images/terminal-knee-extension/blue exercise-images/terminal-knee-extension/pink
mkdir -p exercise-images/tricep-pushdown/blue exercise-images/tricep-pushdown/pink
mkdir -p exercise-images/triceps-pushdown-cable/blue exercise-images/triceps-pushdown-cable/pink
mkdir -p exercise-images/walking-lunge/blue exercise-images/walking-lunge/pink

echo "✅ Created folders for 69 exercises!"
echo "📁 Structure: exercise-images/{exercise-name}/{blue|pink}/{start.png|end.png}"
echo ""
echo "📋 Next steps:"
echo "1. Add your start.png and end.png images to each folder"
echo "2. Update getExerciseImageBaseUrl() in src/utils/exerciseImages.ts"
echo "3. Test with: import { getExerciseImages } from '../utils/exerciseImages'"

# Create a sample folder structure example
echo ""
echo "📖 Example folder contents:"
echo "exercise-images/"
echo "├── barbell-bench-press/"
echo "│   ├── blue/"
echo "│   │   ├── start.png"
echo "│   │   └── end.png"
echo "│   └── pink/"
echo "│       ├── start.png"
echo "│       └── end.png"
echo "└── ..."