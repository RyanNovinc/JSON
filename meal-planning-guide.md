# How to Create a Custom Meal Plan with AI

## Overview
JSON.fit offers two distinct approaches for creating personalized meal plans to accommodate different user needs, time constraints, and accuracy requirements.

## Two-Tier System

### Quick Creation (Standard Flow)
**Time**: 30-60 seconds  
**Best for**: Immediate meal planning needs, familiar ingredients, general dietary goals

**Process:**
1. Select your nutrition goals and dietary preferences
2. Include fridge/pantry inventory (optional)
3. AI generates meal plan using existing knowledge base
4. Instant results with standard nutritional estimates

**Features:**
- Immediate generation
- Uses comprehensive AI training data
- Incorporates your inventory and preferences
- Standard accuracy for common foods and recipes

### Research-Verified Creation (Premium Flow)
**Time**: 15-20 minutes  
**Best for**: Specific dietary requirements, unfamiliar ingredients, precise nutritional goals

**Process:**
1. Select your nutrition goals and dietary preferences
2. Include fridge/pantry inventory (optional)
3. AI conducts real-time web research for:
   - Current pricing data
   - Latest nutritional information
   - Recipe verification
   - Ingredient availability
4. **Critical Audit Step**: AI reviews its own research with skeptical analysis
   - Fact-checks pricing against multiple sources
   - Verifies nutritional claims
   - Identifies potential errors or outdated information
5. Delivers research-backed meal plan with source citations

**Features:**
- Live pricing data
- Verified nutritional information
- Source citations for all claims
- Built-in error detection and correction
- Higher accuracy for specialized diets

## User Interface

### Mode Selection
Users see a toggle switch at the start of meal plan creation:

```
┌─────────────────────────────────────┐
│ Meal Plan Creation Mode             │
│                                     │
│ ○ Quick Creation (30-60 seconds)    │
│ ● Research-Verified (15-20 minutes) │
│                                     │
│ Research-verified includes live     │
│ pricing, fact-checking, and source  │
│ verification for maximum accuracy.  │
└─────────────────────────────────────┘
```

### Progress Indicators

**Quick Creation:**
```
Generating your meal plan... ⏳
[████████████████████] 100%
```

**Research-Verified:**
```
Step 1: Researching ingredients and pricing... ⏳
[████████░░░░░░░░░░░░] 40%

Step 2: Critical audit and fact-checking... 🔍
[████████████████░░░░] 80%

Step 3: Finalizing verified meal plan... ✅
[████████████████████] 100%
```

## Fridge & Pantry Integration

Both flows leverage your inventory data and preferences:

### Primary Approaches:
- **Maximize Inventory**: Plan meals specifically around what you already have
- **Expiry Focused**: Prioritize using items before they expire  
- **AI-Led Planning**: Create optimal meal plans first, naturally incorporate your items when they fit

### Smart Features:
- Expiry date tracking with color-coded warnings
- Automatic substitution suggestions from your inventory
- Preference-based meal recommendations
- Integration with grocery lists for missing ingredients

## When to Use Each Approach

### Choose Quick Creation when:
- You need a meal plan immediately
- Working with familiar, common ingredients
- General health and fitness goals
- Budget is not a primary concern
- Using well-established dietary patterns

### Choose Research-Verified when:
- You have specific dietary restrictions or medical needs
- Working with specialty or unfamiliar ingredients
- Precise nutritional targets are critical
- Budget optimization is important
- You want source citations for nutritional claims
- Planning for extended periods (monthly meal prep)

## Technical Implementation

The research-verified flow includes:
1. **Web search integration** for live data
2. **Critical audit prompt** that challenges the AI's initial research
3. **Multi-source verification** for pricing and nutrition data
4. **Error detection algorithms** that flag inconsistencies
5. **Citation tracking** for all external data sources

This two-tier approach ensures users can choose between speed and accuracy based on their specific needs, while both flows leverage the comprehensive fridge/pantry integration and preference system for personalized results.