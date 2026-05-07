#!/bin/bash

# Script to create folder structure for ALL 128 exercise images
# This creates the exact structure needed for your complete exercise library

echo "Creating exercise image folders for all 128 exercises..."

# Create base directory
mkdir -p exercise-images

# CHEST (12)
mkdir -p exercise-images/barbell-bench-press/{blue,pink}
mkdir -p exercise-images/incline-barbell-bench-press/{blue,pink}
mkdir -p exercise-images/decline-barbell-bench-press/{blue,pink}
mkdir -p exercise-images/dumbbell-bench-press/{blue,pink}
mkdir -p exercise-images/incline-dumbbell-bench-press/{blue,pink}
mkdir -p exercise-images/machine-chest-press/{blue,pink}
mkdir -p exercise-images/smith-machine-bench-press/{blue,pink}
mkdir -p exercise-images/dips-chest-focus/{blue,pink}
mkdir -p exercise-images/cable-crossover/{blue,pink}
mkdir -p exercise-images/pec-deck-fly/{blue,pink}
mkdir -p exercise-images/dumbbell-fly/{blue,pink}
mkdir -p exercise-images/incline-dumbbell-fly/{blue,pink}

# BACK — LATS, UPPER BACK (18)
mkdir -p exercise-images/pull-up/{blue,pink}
mkdir -p exercise-images/weighted-pull-up/{blue,pink}
mkdir -p exercise-images/assisted-pull-up/{blue,pink}
mkdir -p exercise-images/chin-up/{blue,pink}
mkdir -p exercise-images/neutral-grip-pull-up/{blue,pink}
mkdir -p exercise-images/lat-pulldown/{blue,pink}
mkdir -p exercise-images/neutral-grip-lat-pulldown/{blue,pink}
mkdir -p exercise-images/close-grip-lat-pulldown/{blue,pink}
mkdir -p exercise-images/barbell-row/{blue,pink}
mkdir -p exercise-images/pendlay-row/{blue,pink}
mkdir -p exercise-images/t-bar-row/{blue,pink}
mkdir -p exercise-images/chest-supported-t-bar-row/{blue,pink}
mkdir -p exercise-images/chest-supported-dumbbell-row/{blue,pink}
mkdir -p exercise-images/seated-cable-row/{blue,pink}
mkdir -p exercise-images/single-arm-dumbbell-row/{blue,pink}
mkdir -p exercise-images/meadows-row/{blue,pink}
mkdir -p exercise-images/seal-row/{blue,pink}
mkdir -p exercise-images/straight-arm-pulldown/{blue,pink}
mkdir -p exercise-images/dumbbell-pullover/{blue,pink}

# SHOULDERS (13)
mkdir -p exercise-images/barbell-overhead-press/{blue,pink}
mkdir -p exercise-images/seated-barbell-overhead-press/{blue,pink}
mkdir -p exercise-images/seated-dumbbell-shoulder-press/{blue,pink}
mkdir -p exercise-images/machine-shoulder-press/{blue,pink}
mkdir -p exercise-images/arnold-press/{blue,pink}
mkdir -p exercise-images/dumbbell-lateral-raise/{blue,pink}
mkdir -p exercise-images/cable-lateral-raise/{blue,pink}
mkdir -p exercise-images/machine-lateral-raise/{blue,pink}
mkdir -p exercise-images/dumbbell-front-raise/{blue,pink}
mkdir -p exercise-images/cable-rear-delt-fly/{blue,pink}
mkdir -p exercise-images/reverse-pec-deck/{blue,pink}
mkdir -p exercise-images/face-pull/{blue,pink}
mkdir -p exercise-images/bent-over-dumbbell-rear-delt-raise/{blue,pink}

# TRAPS (3)
mkdir -p exercise-images/barbell-shrug/{blue,pink}
mkdir -p exercise-images/dumbbell-shrug/{blue,pink}
mkdir -p exercise-images/cable-shrug/{blue,pink}

# BICEPS (10)
mkdir -p exercise-images/barbell-curl/{blue,pink}
mkdir -p exercise-images/ez-bar-curl/{blue,pink}
mkdir -p exercise-images/dumbbell-curl/{blue,pink}
mkdir -p exercise-images/incline-dumbbell-curl/{blue,pink}
mkdir -p exercise-images/preacher-curl/{blue,pink}
mkdir -p exercise-images/cable-curl/{blue,pink}
mkdir -p exercise-images/hammer-curl/{blue,pink}
mkdir -p exercise-images/cable-hammer-curl/{blue,pink}
mkdir -p exercise-images/concentration-curl/{blue,pink}
mkdir -p exercise-images/reverse-curl/{blue,pink}

# TRICEPS (9)
mkdir -p exercise-images/triceps-pushdown/{blue,pink}
mkdir -p exercise-images/rope-triceps-pushdown/{blue,pink}
mkdir -p exercise-images/overhead-cable-triceps-extension/{blue,pink}
mkdir -p exercise-images/overhead-dumbbell-triceps-extension/{blue,pink}
mkdir -p exercise-images/ez-bar-skullcrusher/{blue,pink}
mkdir -p exercise-images/dumbbell-skullcrusher/{blue,pink}
mkdir -p exercise-images/close-grip-bench-press/{blue,pink}
mkdir -p exercise-images/dips-triceps-focus/{blue,pink}
mkdir -p exercise-images/triceps-kickback/{blue,pink}

# QUADS (13)
mkdir -p exercise-images/barbell-back-squat/{blue,pink}
mkdir -p exercise-images/barbell-front-squat/{blue,pink}
mkdir -p exercise-images/safety-bar-squat/{blue,pink}
mkdir -p exercise-images/smith-machine-squat/{blue,pink}
mkdir -p exercise-images/hack-squat/{blue,pink}
mkdir -p exercise-images/leg-press/{blue,pink}
mkdir -p exercise-images/pendulum-squat/{blue,pink}
mkdir -p exercise-images/bulgarian-split-squat/{blue,pink}
mkdir -p exercise-images/walking-lunge/{blue,pink}
mkdir -p exercise-images/reverse-lunge/{blue,pink}
mkdir -p exercise-images/step-up/{blue,pink}
mkdir -p exercise-images/leg-extension/{blue,pink}
mkdir -p exercise-images/sissy-squat/{blue,pink}

# HAMSTRINGS (11)
mkdir -p exercise-images/romanian-deadlift/{blue,pink}
mkdir -p exercise-images/dumbbell-romanian-deadlift/{blue,pink}
mkdir -p exercise-images/stiff-leg-deadlift/{blue,pink}
mkdir -p exercise-images/conventional-deadlift/{blue,pink}
mkdir -p exercise-images/sumo-deadlift/{blue,pink}
mkdir -p exercise-images/trap-bar-deadlift/{blue,pink}
mkdir -p exercise-images/lying-leg-curl/{blue,pink}
mkdir -p exercise-images/seated-leg-curl/{blue,pink}
mkdir -p exercise-images/nordic-curl/{blue,pink}
mkdir -p exercise-images/single-leg-hamstring-curl/{blue,pink}
mkdir -p exercise-images/good-morning/{blue,pink}

# GLUTES (9)
mkdir -p exercise-images/barbell-hip-thrust/{blue,pink}
mkdir -p exercise-images/machine-hip-thrust/{blue,pink}
mkdir -p exercise-images/single-leg-hip-thrust/{blue,pink}
mkdir -p exercise-images/barbell-glute-bridge/{blue,pink}
mkdir -p exercise-images/cable-glute-kickback/{blue,pink}
mkdir -p exercise-images/hip-abduction-machine/{blue,pink}
mkdir -p exercise-images/cable-hip-abduction/{blue,pink}
mkdir -p exercise-images/hip-adduction-machine/{blue,pink}
mkdir -p exercise-images/reverse-hyperextension/{blue,pink}

# CALVES (5)
mkdir -p exercise-images/standing-calf-raise/{blue,pink}
mkdir -p exercise-images/seated-calf-raise/{blue,pink}
mkdir -p exercise-images/smith-machine-calf-raise/{blue,pink}
mkdir -p exercise-images/leg-press-calf-raise/{blue,pink}
mkdir -p exercise-images/single-leg-dumbbell-calf-raise/{blue,pink}

# CORE (7)
mkdir -p exercise-images/cable-crunch/{blue,pink}
mkdir -p exercise-images/hanging-leg-raise/{blue,pink}
mkdir -p exercise-images/captains-chair-leg-raise/{blue,pink}
mkdir -p exercise-images/ab-wheel-rollout/{blue,pink}
mkdir -p exercise-images/decline-crunch/{blue,pink}
mkdir -p exercise-images/plank/{blue,pink}
mkdir -p exercise-images/reverse-crunch/{blue,pink}

# LOWER BACK (1)
mkdir -p exercise-images/back-extension/{blue,pink}

# NECK (4)
mkdir -p exercise-images/plate-neck-flexion/{blue,pink}
mkdir -p exercise-images/plate-neck-extension/{blue,pink}
mkdir -p exercise-images/neck-harness-flexion/{blue,pink}
mkdir -p exercise-images/neck-harness-extension/{blue,pink}

# FOREARMS (4)
mkdir -p exercise-images/barbell-wrist-curl/{blue,pink}
mkdir -p exercise-images/dumbbell-wrist-curl/{blue,pink}
mkdir -p exercise-images/reverse-wrist-curl/{blue,pink}
mkdir -p exercise-images/farmers-walk/{blue,pink}

# OBLIQUES (5)
mkdir -p exercise-images/pallof-press/{blue,pink}
mkdir -p exercise-images/side-plank/{blue,pink}
mkdir -p exercise-images/cable-woodchop/{blue,pink}
mkdir -p exercise-images/russian-twist/{blue,pink}
mkdir -p exercise-images/side-bend/{blue,pink}

# SHINS (TIBIALIS) (2)
mkdir -p exercise-images/tibialis-raise/{blue,pink}
mkdir -p exercise-images/weighted-tibialis-raise/{blue,pink}

# SERRATUS ANTERIOR (2)
mkdir -p exercise-images/serratus-punch/{blue,pink}
mkdir -p exercise-images/scapular-push-up/{blue,pink}

echo "✅ Created folders for ALL 128 exercises!"
echo "📁 Structure: exercise-images/{exercise-name}/{blue|pink}/{start.png|end.png}"
echo ""
echo "📊 Breakdown by muscle group:"
echo "  • Chest: 12 exercises"
echo "  • Back: 18 exercises"  
echo "  • Shoulders: 13 exercises"
echo "  • Traps: 3 exercises"
echo "  • Biceps: 10 exercises"
echo "  • Triceps: 9 exercises"
echo "  • Quads: 13 exercises"
echo "  • Hamstrings: 11 exercises"
echo "  • Glutes: 9 exercises"
echo "  • Calves: 5 exercises"
echo "  • Core: 7 exercises"
echo "  • Lower Back: 1 exercise"
echo "  • Neck: 4 exercises"
echo "  • Forearms: 4 exercises"
echo "  • Obliques: 5 exercises"
echo "  • Shins: 2 exercises"
echo "  • Serratus: 2 exercises"
echo ""
echo "🎯 Total: 128 exercises × 2 themes × 2 phases = 512 images needed"
echo ""
echo "📋 Next steps:"
echo "1. Add your start.png and end.png images to each folder"
echo "2. Update getExerciseImageBaseUrl() in src/utils/exerciseImages.ts"
echo "3. Test with: import { getExerciseImages } from '../utils/exerciseImages'"