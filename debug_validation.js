const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));

const block1 = data.blocks[1];
console.log('[VALIDATE] Block 1 analysis:');
console.log('weeks:', block1.weeks);  
console.log('deload_weeks:', JSON.stringify(block1.deload_weeks));

const parseWeeksRange = (weeks) => {
  const parts = weeks.split('-');
  const startWeek = parseInt(parts[0]);
  const endWeek = parseInt(parts[1]);
  return { startWeek, endWeek, weekCount: endWeek - startWeek + 1 };
};

const { startWeek, endWeek, weekCount } = parseWeeksRange(block1.weeks);
const expectedWeekKeys = Array.from({ length: weekCount }, (_, i) => (startWeek + i).toString());

console.log('Expected week keys for block 1:', JSON.stringify(expectedWeekKeys));

const firstExercise = block1.days[0].exercises[0];
const actualKeys = Object.keys(firstExercise.sets_weekly).sort((a,b) => parseInt(a) - parseInt(b));
console.log('Actual sets_weekly keys:', JSON.stringify(actualKeys));

console.log('\nMISMATCH DETECTED:');
console.log('Expected keys (absolute):', expectedWeekKeys);
console.log('Actual keys (relative):', actualKeys);

const missingWeeks = expectedWeekKeys.filter(weekKey => !firstExercise.sets_weekly.hasOwnProperty(weekKey));

if (missingWeeks.length > 0) {
  console.log('\nERROR: Block declares weeks 7-12 but exercise has keys 1-6');
  console.log('Missing weeks:', JSON.stringify(missingWeeks));
  const errorMsg = `Block "${block1.block_name}" declares ${weekCount} weeks but exercise "${firstExercise.exercise}" is missing sets_weekly data for week(s) ${missingWeeks.join(', ')}`;
  console.log('ERROR MESSAGE:', errorMsg);
}