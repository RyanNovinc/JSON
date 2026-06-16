// export_events.mjs — pull a date range of events from S3 and write ONE
// AI-ready JSON file that bundles the event SCHEMA + all the EVENTS, so you can
// hand it straight to an AI and it understands everything with no explanation.
//
// Usage (run from the folder that holds this file AND EVENTS.md):
//   npm i @aws-sdk/client-s3                     # one-time
//   node export_events.mjs                       # last 7 days
//   node export_events.mjs 2026-06-01 2026-06-16 # explicit range
//   node export_events.mjs 2026-06-01 2026-06-16 > export.json
//
// Needs AWS credentials in your environment (same ones the CLI uses).

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';

const BUCKET = process.env.BUCKET || 'jsonfit-analytics-405045611723';
const s3 = new S3Client({});

function dayRange(from, to) {
  const out = [];
  const d = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function listKeys(prefix) {
  const keys = [];
  let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: prefix, ContinuationToken: token,
    }));
    (r.Contents || []).forEach(o => keys.push(o.Key));
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function readObject(key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return await r.Body.transformToString();
}

const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
const from = process.argv[2] || weekAgo;
const to = process.argv[3] || today;

const events = [];
for (const dt of dayRange(from, to)) {
  const keys = await listKeys(`events/dt=${dt}/`);
  for (const k of keys) {
    const text = await readObject(k);
    text.split('\n').filter(Boolean).forEach(line => {
      try { events.push(JSON.parse(line)); } catch {}
    });
  }
}

events.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

let schemaDoc = '';
try {
  schemaDoc = readFileSync(new URL('./EVENTS.md', import.meta.url), 'utf8');
} catch {
  schemaDoc = '(EVENTS.md not found next to this script — schema not bundled)';
}

const output = {
  meta: {
    generated_at: new Date().toISOString(),
    date_range: { from, to },
    event_count: events.length,
    unique_users: new Set(events.map(e => e.anon_id)).size,
    unique_sessions: new Set(events.map(e => e.session_id)).size,
  },
  schema_doc: schemaDoc,
  events,
};

process.stdout.write(JSON.stringify(output, null, 2));