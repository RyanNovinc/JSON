// src/utils/planPdf.ts
//
// Turns the user's route into a one-page PDF they can print, save or share.
//
// HTML, NOT A DRAWING LIBRARY. expo-print renders HTML to PDF, so the document
// is a template rather than a canvas — which means it can be reviewed, diffed
// and changed by editing markup, and it inherits proper text layout, page
// breaks and font rendering for free.
//
// LIGHT, NOT DARK. Every screen in this app is near-black, and reproducing that
// here would empty a cartridge and read badly on paper. The PDF is the one
// artefact that leaves the phone, so it follows print conventions rather than
// the app's.
//
// ONE PAGE, deliberately. Anything longer stops being a thing you pin up and
// becomes a document you file and never open again. The current phase is the
// headline because the reason to print this is remembering what you are meant
// to be doing now, not admiring the whole journey.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { deriveRoadmap, leanMassKg, type Roadmap } from './roadmap';
import { expandPhases, phasePosition } from './phaseJourney';
import { phaseIntentFor, phaseEndWeightKg } from './phaseIntent';
import type { GoalsProfile } from './goalsProfile';

const LB_PER_KG = 2.2046226218;

const PHASE_LABEL: Record<string, string> = {
  trim: 'Trim',
  build: 'Build',
  recomp: 'Recomp',
  reveal: 'The reveal',
};

/** Escaped because these values are interpolated into markup. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface BuildArgs {
  profile: GoalsProfile;
  roadmap: Roadmap;
  completedPhases: number;
  routeName: string;
  imperial: boolean;
}

export function buildPlanHtml({
  profile,
  roadmap,
  completedPhases,
  routeName,
  imperial,
}: BuildArgs): string {
  const legs = expandPhases(roadmap);
  const pos = phasePosition(roadmap, completedPhases);
  const i = Math.min(completedPhases, legs.length - 1);
  const current = legs[i];
  const intent = phaseIntentFor(current?.kind ?? '');

  const w = (kg?: number | null) =>
    kg == null ? '\u2014' : imperial ? `${Math.round(kg * LB_PER_KG)} lbs` : `${kg.toFixed(1)} kg`;

  const currentBf = profile.currentBodyFatPct;
  const endKg =
    current != null
      ? phaseEndWeightKg(current.kind, profile.currentWeightKg ?? 0, currentBf, current.exitBodyFatPct)
      : null;

  const endsCell =
    endKg != null
      ? `${w(endKg)} \u00b7 ${Math.round(current.exitBodyFatPct)}%`
      : current != null
        ? `${Math.round(current.exitBodyFatPct)}% body fat`
        : '\u2014';

  // Entry body fat per leg: the previous leg's exit, or the user's current
  // figure for the very first one. It is the only honest source — nothing
  // records what someone actually entered a phase at.
  const rows = legs
    .map((leg, idx) => {
      const from = idx === 0 ? currentBf : legs[idx - 1].exitBodyFatPct;
      const cls = idx < completedPhases ? 'done' : idx === i ? 'now' : '';
      const tag =
        idx < completedPhases
          ? '<span class="tag">DONE</span>'
          : idx === i
            ? '<span class="tag now">NOW</span>'
            : '';
      const range =
        from != null
          ? `${Math.round(from)}% \u2192 ${Math.round(leg.exitBodyFatPct)}%`
          : `to ${Math.round(leg.exitBodyFatPct)}%`;
      return `<tr class="${cls}"><td class="k">${idx + 1} \u00b7 ${esc(
        PHASE_LABEL[leg.kind] ?? leg.kind,
      )}</td><td class="v">${range} ${tag}</td></tr>`;
    })
    .join('');

  const goalLean =
    profile.goalWeightKg != null && profile.goalBodyFatPct != null
      ? leanMassKg(profile.goalWeightKg, profile.goalBodyFatPct)
      : null;
  const nowLean =
    profile.currentWeightKg != null && currentBf != null
      ? leanMassKg(profile.currentWeightKg, currentBf)
      : null;
  const toBuild = goalLean != null && nowLean != null ? goalLean - nowLean : null;

  const today = new Date().toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  /* The PAGE owns the margins, not the body. With @page margin 0 plus body
     padding, the padding sits inside the printable area, so the content box
     ends up taller than the page and a few pixels spill onto a blank second
     sheet. */
  @page { size: A4; margin: 13mm 14mm; }
  html, body { margin: 0; padding: 0; }
  body { color: #1a1a1c;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif; }
  /* Nothing may split across a page it cannot fill. */
  table, tr, .intent, .grid { page-break-inside: avoid; }
  .brand { display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 1px solid #e6e6e9; padding-bottom: 13px; }
  .brandName { font-size: 12px; font-weight: 700; letter-spacing: 1.6px; }
  .brandDate { font-size: 10.5px; color: #8a8a91; }
  .eyebrow { font-size: 9.5px; font-weight: 700; letter-spacing: 1.9px; color: #8a8a91; margin-top: 24px; }
  .phase { font-size: 38px; font-weight: 800; letter-spacing: -1.4px; margin-top: 7px; line-height: 1; }
  .pos { font-size: 12.5px; color: #6b6b72; margin-top: 9px; }
  .intent { border-left: 3px solid #0aa8c4; padding-left: 14px; margin-top: 20px; }
  .intentK { font-size: 8.5px; font-weight: 700; letter-spacing: 1.4px; color: #8a8a91; }
  .intentT { font-size: 17px; font-weight: 700; margin-top: 5px; }
  .intentD { font-size: 12.5px; line-height: 19px; color: #5b5b62; margin-top: 5px; }
  .grid { display: flex; gap: 10px; margin-top: 20px; }
  .cell { flex: 1; border: 1px solid #e6e6e9; border-radius: 9px; padding: 11px 10px; }
  .cellK { font-size: 8px; font-weight: 700; letter-spacing: 1.1px; color: #8a8a91; }
  .cellV { font-size: 17px; font-weight: 700; margin-top: 5px; }
  .cellV.accent { color: #0aa8c4; }
  .secTitle { font-size: 9.5px; font-weight: 700; letter-spacing: 1.7px; color: #8a8a91;
    margin-top: 24px; padding-bottom: 7px; border-bottom: 1px solid #e6e6e9; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  td { font-size: 12.5px; padding: 7px 0; border-bottom: 1px solid #f0f0f2; }
  td.k { color: #6b6b72; }
  td.v { text-align: right; font-weight: 600; }
  tr.now td { background: #f2fbfd; }
  tr.now td.k { color: #0a7d92; font-weight: 600; }
  tr.done td { color: #a5a5ad; }
  .tag { font-size: 8.5px; font-weight: 700; letter-spacing: 1px; border: 1px solid #d8d8dc;
    border-radius: 4px; padding: 2px 5px; color: #8a8a91; margin-left: 7px; }
  .tag.now { border-color: #0aa8c4; color: #0aa8c4; }
  .foot { margin-top: 22px; padding-top: 11px; border-top: 1px solid #e6e6e9;
    font-size: 10px; line-height: 15px; color: #a5a5ad; }
</style></head>
<body>
  <div class="brand">
    <div class="brandName">JSON.FIT</div>
    <div class="brandDate">Generated ${esc(today)}</div>
  </div>

  <div class="eyebrow">RIGHT NOW</div>
  <div class="phase">${esc(PHASE_LABEL[current?.kind ?? ''] ?? current?.kind ?? 'Your plan')}</div>
  <div class="pos">Phase ${pos.index} of ${pos.total} &nbsp;\u00b7&nbsp; ${esc(routeName)}</div>

  <div class="intent">
    <div class="intentK">WHAT THIS PHASE ASKS</div>
    <div class="intentT">${esc(intent.title)}</div>
    <div class="intentD">${esc(intent.detail)}</div>
  </div>

  <div class="grid">
    <div class="cell"><div class="cellK">WEIGHT NOW</div><div class="cellV">${w(
      profile.currentWeightKg,
    )}</div></div>
    <div class="cell"><div class="cellK">BODY FAT NOW</div><div class="cellV">${
      currentBf != null ? `${Math.round(currentBf)}%` : '\u2014'
    }</div></div>
    <div class="cell"><div class="cellK">PHASE ENDS</div><div class="cellV accent">${endsCell}</div></div>
  </div>

  <div class="secTitle">THE WHOLE ROUTE</div>
  <table>${rows}</table>

  <div class="secTitle">WHERE IT ENDS</div>
  <table>
    <tr><td class="k">Goal weight</td><td class="v">${w(profile.goalWeightKg)}</td></tr>
    <tr><td class="k">Goal body fat</td><td class="v">${
      profile.goalBodyFatPct != null ? `${Math.round(profile.goalBodyFatPct)}%` : '\u2014'
    }</td></tr>
    ${
      toBuild != null && toBuild > 0
        ? `<tr><td class="k">Muscle to build</td><td class="v">${w(toBuild)}</td></tr>`
        : ''
    }
    <tr><td class="k">Estimated time</td><td class="v">${roadmap.estYears[0]} to ${
      roadmap.estYears[1]
    } years</td></tr>
  </table>

  <div class="foot">
    Durations are estimates and move as your own rate of progress becomes clear.
    This plan is generated from the numbers you entered and is not medical advice.
  </div>
</body></html>`;
}

/**
 * Renders and hands the file to the share sheet, which covers save-to-files,
 * print and AirDrop in one step rather than three separate integrations.
 */
export async function sharePlanPdf(args: BuildArgs): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: buildPlanHtml(args) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Your plan',
      UTI: 'com.adobe.pdf',
    });
  } else {
    // No share sheet on this device: printing directly is the useful fallback
    // rather than failing silently.
    await Print.printAsync({ uri });
  }
}

/** Convenience for callers that only hold a profile. */
export async function sharePlanPdfFor(
  profile: GoalsProfile,
  completedPhases: number,
  routeName: string,
  imperial: boolean,
): Promise<void> {
  const roadmap = deriveRoadmap(profile, profile.routePreference ?? 'balanced');
  await sharePlanPdf({ profile, roadmap, completedPhases, routeName, imperial });
}