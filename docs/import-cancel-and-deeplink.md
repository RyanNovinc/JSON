# Import cancel paths & deep-link handoff

Snapshot of the file-open / share / curated import work so a future session can pick
it up cold. Source of truth is always `src/`; this describes intent and open threads.

## Root cause & fix (landed: `5baad95`)

Declining a **file-open import** (Open-with / share sheet, routed as `/import-file`)
dropped the user onto the legacy "Paste Your Plan" screen instead of Home, and from
there its back button reached the old "Your Prompt is Ready!" screen.

Cause: `ImportRoutineScreen.handleModalCancel` sent the user Home only for
`prefilledJson || shareId`. `fileUri` was **missing from that condition** — an omission,
not a decision. Blame confirms it: the `prefilledJson || shareId` condition was written
in the sharing era (`32b8232e`, 2026-05-07), and inbound file import landed ~2 months
later (`0ba776c`, 2026-07-14) without anyone revisiting the cancel condition. The comment
on that condition only ever mentioned "shared import".

Fix `5baad95` adds `fileUri` to the navigate-away condition. Verified on an Android
emulator against a local release build: decline → Home; re-open the same file → the
confirmation modal returns (see harness below).

## ⚠️ The trap: never set `prefilledCancelled` on the `fileUri` path

`5baad95` adds `fileUri` to the navigate-away branch but **deliberately does not call
`setPrefilledCancelled(true)` for it** (only `prefilledJson || shareId` do). This is
load-bearing — do not "tidy" it into the shared setter:

- `prefilledCancelled` is a **one-way latch**: declared once, set `true` once (in
  `handleModalCancel`), and **never reset anywhere**.
- The `fileUri` auto-import effect is guarded by `!prefilledCancelled` **and** the
  `consumedFileUri` delivery-key (`fileUri + ':' + receivedAt`). The file path keeps
  this screen instance mounted, so setting the latch would **permanently wedge the
  fileUri effect** for the life of the instance — every subsequent re-open would be
  silently ignored. That is the exact "wedge shut for the life of the screen" failure
  the latch comment (around `ImportRoutineScreen.tsx:189-198`) was written to avoid.
- The intended re-open guard is the **per-delivery `receivedAt` nonce** (stamped in
  `toCanonicalUrl`, `AppNavigator.tsx`). A new nonce = a new `deliveryKey` = re-admitted
  import. `prefilledCancelled` is safe for share/curated only because their branch also
  navigates away and their instance is replaced on the next entry.

## Structurally identical gap in `ImportMealPlanScreen` (currently unreachable)

`ImportMealPlanScreen.handleModalCancel` (~`:646`) has **no navigate-away branch at
all** — it just animates the modal closed and resets state. So a *prefilled* meal-plan
import that is declined would silently return the user to wherever they were: the same
shape of bug `5baad95` fixed for workouts.

It is **currently unreachable**: `prefilledJson` is declared on the `ImportMealPlan`
route type (`AppNavigator.tsx:158`) and consumed by the screen (`:69`, `:73`), but
**nothing ever navigates to `ImportMealPlan` with `prefilledJson`** — the only producer,
`NutritionDashboardScreen.tsx:143`, passes `{ showStep1New: true }`. (Shared meal plans
go to the separate `ImportSharedMealPlan` screen instead.) So the orphaned `prefilledJson`
param is a latent trap: wire a producer and the silent-cancel bug becomes live. Fix the
cancel shape first if that path is ever revived.

## Still pending (investigation steps 2–6, NOT done this session)

Carried forward from the broader import-flow investigation; not verified this session:

- **`showStep1New` plumbing.** `a6ca876` removed the dead copy in `useWorkoutImport`
  (declared, never read/set/returned). But `showStep1New` is still live plumbing in
  `ImportRoutineScreen` (route param `:73`, renders `WorkoutGeneratorStep1New` `:2177`)
  and `ImportMealPlanScreen` (`handleCancel` navigates with `showStep1New: true`). Trace
  whether this legacy branch is still reachable/wanted.
- **The two "New" components.** `WorkoutGeneratorStep1New` and `NutritionGeneratorStep1New`
  are still rendered (they superseded `NutritionGeneratorStep1`/`Step4`, which `a6ca876`
  deleted as never-rendered). Confirm they're the intended surviving entry points.
- **`WorkoutDashboardScreen` / `NutritionDashboardScreen` island.** Reachability was
  **never confirmed on device**. `NutritionDashboardScreen` is the sole producer of the
  `ImportMealPlan` route (with `showStep1New`); the workout counterpart's live entry
  points are unverified. Check whether these dashboards are actually reachable in the
  shipping navigation or are a dead island.

## Testing

`scripts/deeplink-harness.sh` fires the file-open / share / curated routes at the
installed Android app via the `json-app://` scheme (rewritten to `/import-file` etc. by
`toCanonicalUrl`), with a caller-controlled `receivedAt` nonce. See the script header for
usage and the device-shell single-quote gotcha (a silently dropped `&receivedAt` looks
identical to the latch having wedged). Curated `p/program/<slug>` needs a real published
slug (static file on json.fit — can't be minted like a share); share `p/<id>` needs a real
backend id (create one via `POST /shares` with a `{ workoutData: <program> }` envelope,
gzip+base64, `enc: "gzip+b64"`).
