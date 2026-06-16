# JSON.fit Event Catalogue (as deployed)

The canonical data dictionary for every analytics event actually instrumented
across the JSON.fit **app** and **website**. Written to be read by an AI: the
export script bundles this file inline with your data, so any model understands
the whole dataset with no extra explanation.

This reflects the real, shipped instrumentation — event names, property names,
and the actual enum values used in code.

## Shared envelope (every event has this shape)

```json
{
  "event": "program_imported",
  "timestamp": "2026-06-16T04:56:17.854Z",   // client time (ISO 8601)
  "anon_id": "uuid",                          // random, persisted per install / browser
  "session_id": "uuid",                       // resets after 30 min of inactivity
  "properties": { },                          // event-specific (tables below)
  "context": { },                             // surface-specific (below)
  "received_at": "2026-06-16T04:56:24.226Z"   // server time, added by the Lambda
}
```

Identity is an anonymous random id only — no names, emails, or free-text user
input are ever stored.

## Context by surface

**App:** `{ surface: "app", platform: "ios" | "android", os_version, app_version }`

**Web:** `{ surface: "web", platform: "web", app_version: "web", path, referrer,
device_type: "mobile" | "tablet" | "desktop", viewport_w, viewport_h, is_internal? }`

- `is_internal: true` appears only on the site owner's own browsing (set by
  visiting any page with `?internal=1`). **Exclude these from analysis.**

---

## App events

### Lifecycle / navigation
| Event | Properties | Fires when |
|---|---|---|
| `app_opened` | — | App becomes active |
| `session_started` | — | A new session begins (after 30 min idle) |
| `screen_viewed` | `screen_name` | Any screen/route is shown (focused leaf route name) |

### Onboarding funnel
**Branches by intent:** a `meals` choice routes to the example-plan step;
`plan` / `workout` route to the contract step — so not every user hits every
step. A skipped step is a branch, not necessarily a drop-off.

| Event | Properties | Fires when |
|---|---|---|
| `onboarding_started` | `is_first_session` (bool) | User enters onboarding (`true` = fresh install, `false` = profile reset) |
| `onboarding_step_viewed` | `step_name`, `step_number` | A step is shown |
| `onboarding_step_completed` | `step_name`, `step_number`, `time_on_step_ms` | User advances from a step |
| `onboarding_completed` | `total_time_ms`, `steps_count` | Onboarding finished |
| `onboarding_abandoned` | `last_step_name`, `last_step_number`, `time_on_step_ms` | User leaves before finishing |
| `onboarding_intent_chosen` | `intent` (`meals`\|`plan`\|`workout`\|`skipped`) | Fires in IntentForkModal choose() when the user picks a fork option — gives the choice distribution |

`step_name` (`step_number`): `intent_fork` (1), `contract` (2), `example_plan` (3).

### Core product actions
| Event | Properties | Notes |
|---|---|---|
| `program_imported` | `valid` (bool), `error_type` (string\|null), `week_count`, `day_count` | Workout JSON import. `error_type` ∈ {`json_parse_error`, `validation_error`, `null` (on success)}. `week_count` derived from block week ranges; `day_count` from block days. |
| `meal_plan_imported` | `valid` (bool), `error_type` (string\|null), `day_count` | Meal-plan JSON import. `error_type` ∈ {`missing_field`, `empty_plan`, `invalid_date_format`, `json_parse_error`, `null` (on success)}. |
| `prompt_copied` | `prompt_type` (`workout`\|`meal`), `prompt_version` (`1`\|`2`) | Generation prompt copied to clipboard (card tap or "Open in AI" button). |
| `returned_from_ai` | `prompt_type` (`workout`\|`meal`), `time_away_ms` | User returns to the app after leaving for their AI — fires at the AppState return-detection point in PromptReadyScreen / NutritionPromptReadyScreen |
| `workout_logged` | `exercise_count`, `duration_ms` | A workout session is logged. |
| `exercise_swiped` | `direction` (`next`\|`prev`) | Swipe-between-exercises gesture. |
| `curated_program_opened` | `program_id` | A curated program opened. |
| `curated_meal_viewed` | `meal_id` | A curated meal's detail viewed. |

*Defined but not yet emitted:* `cookbook_downloaded { source }` — no in-app
download exists; the cookbook is a web lead magnet (see `cookbook_email_submitted`).

---

## Web events

| Event | Properties | Fires when |
|---|---|---|
| `page_viewed` | `path`, `title` | Every page load (auto) |
| `session_started` | *(see below)* | Once per session — carries attribution + device |
| `scroll_depth` | `percent` (25\|50\|75\|100) | Each threshold passed, once per page |
| `page_engaged` | `engagement_time_ms`, `max_scroll_percent` | On page exit |
| `outbound_click` | `url` | Click to an external site. `url` ∈ {`app_store`, `youtube`, academic second-level domains e.g. `springer` / `pubmed` / `wiley`} |
| `cookbook_email_submitted` | — | Cookbook email form submitted successfully |
| `cta_clicked` | `cta_id` | Primary CTA pressed. `cta_id` ∈ {`browse_meals`, `cookbook_pdf_download`, `open_in_app`, `import_program`} |

**`session_started` (web) properties:**
- New vs returning: `is_first_visit` (bool)
- Last-touch (this session): `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `referrer`, `landing_page`
- First-touch (original acquisition — never overwritten): `ft_source`, `ft_medium`, `ft_campaign`, `ft_referrer`, `ft_landing_page`, `ft_timestamp`
- Locale / device: `timezone`, `language`, `device_type`, `viewport_w`, `viewport_h`

---

## Notes for the analysing AI
- **Join** `session_started` to other events by `session_id` to attach attribution
  and device to any action in that session.
- **Onboarding funnel:** compute completion per `step_name`; account for the
  meals-vs-plan/workout branch so a skipped step isn't misread as a drop-off.
  Flag steps where abandoners spent *longer* than completers (confusion, not boredom).
- **Activation (app):** % of users who reach `program_imported` with `valid:true`;
  for failures, break down `error_type`.
- **Conversion (web):** treat `outbound_click` with `url:"app_store"` and
  `cookbook_email_submitted` as conversions; segment by first-touch (`ft_*`) to see
  which sources actually convert.
- **Always exclude** web events where `context.is_internal` is `true`.
- Conventions: `_ms` = milliseconds; `is_`/`has_` = boolean; all timestamps ISO 8601.