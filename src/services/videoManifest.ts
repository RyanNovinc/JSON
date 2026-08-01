/* ────────────────────────────────────────────────────────────────────────────
 * REMOTE VIDEO MANIFEST
 *
 * Which meals have footage is decided by a JSON file on S3, not by a table
 * compiled into the binary. Uploading a new recipe video is then three files
 * and no release: the mp4, its poster, and an updated manifest.json. Without
 * this, every video costs a production build and an App Store review, which is
 * an absurd price for a file that is already encoded and sitting on disk — and
 * the kind of friction that quietly stops footage being made at all.
 *
 * The bundled table in CookScreen stays as the FLOOR. This module can only add
 * to it or override an entry, never empty it. A 404, a timeout, an airport
 * wifi captive portal, malformed JSON, a truncated upload — every one of those
 * leaves the app exactly as it shipped. There is no failure mode here that
 * costs the user a video they would otherwise have seen.
 *
 * Storage: plain AsyncStorage, deliberately NOT RobustStorage. RobustStorage
 * writes three redundant copies plus a checksum and verifies on read, which is
 * right for data the user authored and cannot get back. This is a disposable
 * cache of a public file with a bundled fallback underneath it. Using the
 * heavy path here would be four writes to save a fetch.
 * ──────────────────────────────────────────────────────────────────────────── */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

/** Single source of truth for the bucket. CookScreen imports this rather than
 *  declaring its own copy, so a move to CloudFront is a one-line change. */
export const VIDEO_BASE =
  'https://jsonfit-videos-au.s3.ap-southeast-2.amazonaws.com/videos';

const MANIFEST_URL = `${VIDEO_BASE}/manifest.json`;
/* Bare snake_case with no namespace, matching STORAGE_KEYS in utils/storage. */
const CACHE_KEY = 'cook_video_manifest';

/** Short. This runs at launch and the app is fully usable without it, so it
 *  must never be something the user waits on. */
const FETCH_TIMEOUT_MS = 6000;

/** Floor between network fetches. Without this, every visit to the Cook tab
 *  would hit S3 — and the file changes a handful of times a year. */
const MIN_REFETCH_INTERVAL_MS = 30 * 60 * 1000;

/** Module scope, so it survives the screen unmounting and remounting as the
 *  user moves between tabs. Reset only by killing the app. */
let lastFetchAt = 0;

/** Sanity ceiling. The catalogue is 85 meals; a manifest claiming thousands of
 *  entries is a wrong or hostile file, not a very productive month. */
const MAX_ENTRIES = 500;

export interface MealVideo {
  video: string;
  /** Frame-zero still, shown while the video buffers. */
  poster?: string;
}

/** Slug → video. Deliberately keyed by plain string rather than MealSlug: this
 *  data arrives at runtime from outside the app, so it cannot be trusted to
 *  contain real slugs. Callers look up by slug and get undefined for anything
 *  that does not match, which is the correct behaviour for a manifest listing
 *  a meal that this build has never heard of. */
export type VideoTable = Record<string, MealVideo>;

/* ────────────────────────────────────────────────────────────────────────────
 * Wire format
 *
 * {
 *   "version": 1,
 *   "videos": {
 *     "butter_chicken": { "video": "butter_chicken.mp4",
 *                         "poster": "butter_chicken.jpg" }
 *   }
 * }
 *
 * Values are FILENAMES relative to VIDEO_BASE, not full URLs. The file is
 * hand-edited every time footage lands, and a bare filename is far harder to
 * get subtly wrong than a 70-character URL repeated twice per entry. Anything
 * that already starts with http:// or https:// is passed through untouched, so
 * a future CDN or a one-off video hosted elsewhere still works.
 * ──────────────────────────────────────────────────────────────────────────── */

function absolutise(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `${VIDEO_BASE}/${value}`;
}

/** Validates per ENTRY, not per file. One malformed line in the manifest drops
 *  that meal and keeps the rest, because the alternative — rejecting the whole
 *  file — means a stray comma costs every video at once. */
function parseManifest(raw: unknown): VideoTable | null {
  if (!raw || typeof raw !== 'object') return null;

  const videos = (raw as { videos?: unknown }).videos;
  if (!videos || typeof videos !== 'object') return null;

  const out: VideoTable = {};
  let count = 0;

  for (const [slug, entry] of Object.entries(videos as object)) {
    if (count >= MAX_ENTRIES) break;
    if (!slug || typeof slug !== 'string') continue;
    if (!entry || typeof entry !== 'object') continue;

    const video = (entry as { video?: unknown }).video;
    if (typeof video !== 'string' || video.trim() === '') continue;

    const poster = (entry as { poster?: unknown }).poster;
    const record: MealVideo = { video: absolutise(video.trim()) };
    if (typeof poster === 'string' && poster.trim() !== '') {
      record.poster = absolutise(poster.trim());
    }

    out[slug] = record;
    count += 1;
  }

  /* An empty but well-formed manifest is a legitimate state (everything
   * deliberately unpublished), so it is returned rather than treated as a
   * failure. It still cannot empty the feed — the bundled table sits under it
   * and this table only ever adds or overrides. */
  return out;
}

/** Last good copy, for first paint and for offline. Returns null on a cold
 *  install or if the cached blob no longer parses. */
export async function loadCachedVideoTable(): Promise<VideoTable | null> {
  try {
    const blob = await AsyncStorage.getItem(CACHE_KEY);
    if (!blob) return null;
    return parseManifest(JSON.parse(blob));
  } catch {
    /* Corrupt cache is not worth reporting or repairing: the next successful
     * fetch overwrites it, and until then the bundled table carries the app. */
    return null;
  }
}

/** Fetches, validates and caches. Resolves null on any failure — callers are
 *  expected to simply keep whatever table they already have. */
export async function fetchVideoTable(): Promise<VideoTable | null> {
  /* Stamped BEFORE the attempt, not after a success. A device on airport wifi
   * or behind a captive portal would otherwise retry on every single tab
   * focus, which is the exact situation where the retries are most useless
   * and most expensive. A failure costs at most one stale interval. */
  lastFetchAt = Date.now();
  try {
    /* Cache-buster. S3 serves without cache headers by default, but this file
     * is the one thing that MUST be fresh — the whole point of the exercise is
     * that a new video appears without a release, and an intermediary holding
     * a five-minute-old copy would silently undo that. */
    const res = await axios.get(`${MANIFEST_URL}?t=${Date.now()}`, {
      timeout: FETCH_TIMEOUT_MS,
      /* Some proxies hand back HTML error pages with a 200. Take the text and
       * parse it here so a captive portal login page cannot masquerade as a
       * manifest. */
      responseType: 'text',
      transformResponse: (d) => d,
    });

    const parsed = parseManifest(
      typeof res.data === 'string' ? JSON.parse(res.data) : res.data,
    );
    if (!parsed) return null;

    /* Cache the NORMALISED table, not the raw body: it is what the app reads
     * back, so any parse cost is paid once here rather than on every launch. */
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ version: 1, videos: parsed }),
    ).catch(() => undefined);

    return parsed;
  } catch {
    return null;
  }
}

/** Throttled variant, for the Cook tab regaining focus. Returns null when the
 *  last attempt was recent, which the caller treats identically to a failed
 *  fetch: keep whatever table is already loaded.
 *
 *  This is what makes a video uploaded on Tuesday reach someone who has had
 *  the app resident since Monday. Without it the manifest is read once per
 *  cold start, and a user who never fully quits the app never sees new
 *  footage at all. */
export async function fetchVideoTableIfStale(): Promise<VideoTable | null> {
  if (Date.now() - lastFetchAt < MIN_REFETCH_INTERVAL_MS) return null;
  return fetchVideoTable();
}

/** Shallow compare, used to avoid reordering the feed when nothing changed —
 *  which is the overwhelmingly common case, since the manifest is refetched
 *  every launch and edited a handful of times a year. */
export function sameVideoTable(a: VideoTable, b: VideoTable): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every(
    (k) =>
      b[k] !== undefined &&
      a[k].video === b[k].video &&
      a[k].poster === b[k].poster,
  );
}