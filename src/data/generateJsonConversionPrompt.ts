// Import the static function from dynamic system
const { getJsonConversionPrompt } = require('./dynamicMealPlanningPrompt');

export const generateJsonConversionPrompt = (outputPreference?: string): string => {
  // Determine output format based on user preference
  const outputInstructions = outputPreference === 'copy_paste' 
    ? `**Output the meal plan as a \`\`\`json code block in chat. Do not create files.**`
    : `**DO NOT output JSON to chat** — it will hit token limits for plans longer than 7 days.

**You MUST:**
1. Create a file (use Code Interpreter on ChatGPT, or computer tool on Claude)
2. Write the complete JSON structure to the file
3. If you reach output limits, STOP at the end of a complete day, then continue appending to the same file
4. Never stop mid-day or mid-meal
5. When finished, provide the download link`;

  // Get the base prompt and replace the output instructions
  const basePrompt = getJsonConversionPrompt();
  
  // Guard against heading changes in dynamicMealPlanningPrompt.ts breaking the splice
  const criticalIdx = basePrompt.indexOf('# CRITICAL: File Output Instructions');
  const schemaIdx = basePrompt.indexOf('# JSON Schema Required');

  if (criticalIdx === -1 || schemaIdx === -1) {
    console.warn('generateJsonConversionPrompt: Expected headings not found in base prompt. Using fallback.');
    return `# Output Instructions\n\n${outputInstructions}\n\n${basePrompt}`;
  }

  const beforeSection = basePrompt.substring(0, criticalIdx);
  const afterSection = basePrompt.substring(schemaIdx);
  const updatedPrompt = beforeSection + `# CRITICAL: Output Instructions\n\n${outputInstructions}\n\n` + afterSection;
  
  return updatedPrompt;
};

