// ============================================================================
// Program image registry
// React Native's `require()` needs static literals — can't be dynamic.
// So we register every program × theme combination explicitly.
// ============================================================================

const PROGRAM_IMAGES: Record<string, any> = {
  foundations_cyan: require('./programs/foundations_cyan.png'),
  foundations_pink: require('./programs/foundations_pink.png'),
  builder_cyan: require('./programs/builder_cyan.png'),
  builder_pink: require('./programs/builder_pink.png'),
  mass_cyan: require('./programs/mass_cyan.png'),
  mass_pink: require('./programs/mass_pink.png'),
};

/**
 * Look up a bulking program image by id and theme.
 * @param programId  e.g. 'foundations', 'builder', 'mass'
 * @param isPinkTheme  pass true for pink theme, false for cyan
 */
export function getProgramImage(programId: string, isPinkTheme: boolean): any | undefined {
  const key = `${programId}_${isPinkTheme ? 'pink' : 'cyan'}`;
  return PROGRAM_IMAGES[key];
}