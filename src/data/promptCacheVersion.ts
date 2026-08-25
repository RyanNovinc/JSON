// src/data/promptCacheVersion.ts
//
// ONE definition of the cache-buster appended to every json.fit URL that any
// generated prompt hands to the AI.
//
// WHY THIS FILE EXISTS. This string used to be declared separately in
// planningPrompt.ts, mealPlanPromptV2.ts and (implicitly, as a literal) in
// workoutPrompt.ts, with a convention that they be kept identical. They were
// not. A website file was edited and only two of the three got bumped, so the
// AI kept fetching a cached copy of the old file and the change appeared not to
// work — twice. And workoutPrompt.ts carried a hardcoded `?v=3` on the volume
// landmarks URL that had never been bumped at all, alongside three references
// to exercises.md with no version on them whatsoever, which could serve a stale
// copy indefinitely.
//
// A convention that two files must match is a bug waiting for someone to be
// tired. This is a leaf module with no imports, so anything may import it
// without risking a cycle.
//
// BUMP THIS whenever ANY file under json.fit/ that a prompt fetches is edited:
// the prompts/v2/*.md pipeline files, exercises.md, volume-landmarks.md,
// rir-guidance.md, rep-range-guidance.md, rest-guidance.md, deload-guidance.md,
// phase-selection.md, lean-mass-targets.md. Then rebuild — the constant only
// reaches users through a new app build.
export const PROMPT_CACHE_VERSION = '2026-08-24a'; // rep-range-guidance: isolation bands tightened to 10-15, band-is-the-prescription rule, hard floors