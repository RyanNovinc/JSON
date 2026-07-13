# 🔍 CRITICAL MAPPING VERIFICATION & EDGE CASE FIXES

## ❌ Issue 1: Scale Mapping Mismatch

### **PROBLEM FOUND**: My dynamic prompt mappings are WRONG!

Looking at the actual questionnaire code, the scales have specific descriptions that don't match my generic mappings:

#### **Actual App Scale Mappings** (from BudgetCookingQuestionnaireScreen.tsx):

**planningStyle (1-5):**
- 1: 'Dedicated Meal Prepper'
- 2: 'Weekly Planner' 
- 3: 'Flexible Planner'
- 4: 'Spontaneous Cook'
- 5: 'Last-Minute Decider'

**timeInvestment (1-5):**
- 1: 'Speed Cook'
- 2: 'Quick Meals'
- 3: 'Moderate Cook'
- 4: 'Thorough Cook' 
- 5: 'Slow Food Lover'

**varietySeeking (1-5):**
- 1: 'Routine Eater'
- 2: 'Mostly Consistent'
- 3: 'Moderate Variety'
- 4: 'Variety Seeker'
- 5: 'Adventure Eater'

**skillConfidence (1-5):**
- 1: 'Kitchen Beginner'
- 2: 'Cautious Cook'
- 3: 'Comfortable Cook'
- 4: 'Confident Cook'
- 5: 'Kitchen Experimenter'

**cookingEnjoyment (1-5):**
- 1: 'Cooking Avoider'
- 2: 'Reluctant Cook'
- 3: 'Neutral Cook' 
- 4: 'Cooking Enthusiast'
- 5: 'Passionate Home Chef'

### **My Current Mappings** (INCORRECT):
```typescript
// WRONG - Too verbose and doesn't match app labels
const getMealPrepStyleText = (style: number): string => {
  const styles: { [key: number]: string } = {
    1: 'User wants to meal prep everything - batch cook all proteins, same meals multiple days, cook once per week',
    2: 'User wants to meal prep as much as possible - batch cook proteins, repeat meals multiple days, minimize daily cooking',
    3: 'User likes some meal prep but also some fresh cooking - batch cook 1-2 items but vary the rest',
    // ...
  };
}
```

## ✅ Fix 1: Correct Scale Mappings

Need to map to the actual app labels and add appropriate meal planning guidance:

```typescript
const getMealPrepStyleText = (style: number): string => {
  const styles: { [key: number]: string } = {
    1: 'Dedicated Meal Prepper - batch cook everything, same meals multiple days',
    2: 'Weekly Planner - meal prep focused, repeat meals, minimal daily cooking', 
    3: 'Flexible Planner - some meal prep, some fresh cooking, moderate variety',
    4: 'Spontaneous Cook - mostly fresh cooking, minimal meal prep',
    5: 'Last-Minute Decider - fresh meals daily, no meal prep, maximum variety'
  };
  return styles[style] || styles[3];
};
```

## ❌ Issue 2: Prompt 2 Hard Constraints

### **PROBLEM**: Prompt 2 needs dynamic user targets, but it's often sent as a separate message.

When the user sends Prompt 2 in a new conversation or separate message, it won't have access to the dynamic values from Prompt 1.

### **Current Implementation**:
```typescript
const hardConstraintsSection = `
- **Protein** MUST be within 10% of ${proteinTarget}g target on EVERY individual day.
- **Fiber** MUST hit at least ${fiberMinimum}g (80% of ${fiberTarget}g target) on EVERY individual day.
`;
```

This is correct! My implementation already loads the user data in Prompt 2:
```typescript
const nutritionResults = await WorkoutStorage.loadNutritionResults();
const proteinTarget = macroResults.protein || 150;
const fiberTarget = macroResults.calories ? Math.min(45, Math.max(25, Math.round((macroResults.calories / 1000) * 14))) : 30;
```

✅ **This is working correctly** - Prompt 2 independently loads user data.

## ❌ Issue 3: Edge Cases

Let me test the edge cases you mentioned:

### **Edge Case 1: No Equipment Except Microwave**
```typescript
// Current code:
Available equipment: ${budgetData.cookingEquipment?.join(', ') || 'basic kitchen equipment'}

// If cookingEquipment = ['microwave']:
"Available equipment: microwave"
```
✅ This works correctly.

### **Edge Case 2: 6 Allergies**
```typescript
// Current code:
Allergies: ${budgetData.allergies?.length ? budgetData.allergies.join(', ') : 'None'}

// If allergies = ['dairy', 'nuts', 'shellfish', 'eggs', 'soy', 'gluten']:
"Allergies: dairy, nuts, shellfish, eggs, soy, gluten"
```
✅ This works correctly.

### **Edge Case 3: Vegan on Tight Budget**
```typescript
// Current code handles this through multiple fields:
Budget level: ${getBudgetLevelDescription(budgetData.weeklyBudget)}
// + dietary restrictions in avoid foods
// + budget constraints in prompt
```
✅ This works correctly.

### **Edge Case 4: Skipped Sleep Questionnaire**
```typescript
// Current code:
if (sleepData?.bedtime && sleepData?.wakeTime) {
  prompt += sleep optimization section
}

// If sleepResults is null or formData is missing:
// Sleep section is completely omitted ✅
```
✅ This works correctly.

## 🔧 Required Fixes

### Fix 1: Update Scale Mappings in mealPlanningPromptFixed.ts

The scale mappings need to match the actual app labels and provide appropriate meal planning context.

### Fix 2: Add Better Edge Case Handling

Add more robust fallbacks and edge case handling for extreme scenarios.