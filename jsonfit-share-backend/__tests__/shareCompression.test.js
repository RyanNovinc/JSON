/**
 * Round-trip tests for the share compression change.
 *
 * The property that matters most here is NOT that compression works — it is that
 * compression is INVISIBLE. There is no version field and no version negotiation
 * on this endpoint, so every app already installed on a phone must keep seeing
 * byte-for-byte the response it saw before. These tests pin that down.
 */

const zlib = require('zlib');

// The Lambdas' aws-sdk deps are installed in the deployment bundle, not at the
// repo root, so they are mocked virtually. The DynamoDB call is captured rather
// than performed — we assert on the item that WOULD have been written.
// (`mock`-prefixed so jest allows the factory to close over it.)
const mockDb = { put: null, get: null };

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class {},
}), { virtual: true });

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({
    send: async (cmd) => {
      if (cmd.__type === 'put') { mockDb.put = cmd.input.Item; return {}; }
      if (cmd.__type === 'get') { return { Item: mockDb.get }; }
      throw new Error('unexpected command');
    },
  }) },
  PutCommand: class { constructor(input) { this.__type = 'put'; this.input = input; } },
  GetCommand: class { constructor(input) { this.__type = 'get'; this.input = input; } },
}), { virtual: true });

const createShare = require('../src/createShare/index').handler;
const getShare = require('../src/getShare/index').handler;
const {
  MAX_UNCOMPRESSED_BYTES,
  MAX_STORED_COMPRESSED_BYTES,
  ENCODING_GZIP_B64,
} = require('../src/shared/shareLimits');

// A realistically-shaped share payload.
const PAYLOAD = {
  workoutData: {
    routine_name: 'Advanced Hypertrophy',
    days_per_week: 5,
    blocks: [
      { block_name: 'Block 1', weeks: '1-4', days: [
        { day_name: 'Push', exercises: [
          { type: 'strength', exercise: 'Barbell Bench Press', sets: 4, reps: '8-12', rest: 165,
            primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps'] },
        ] },
      ] },
    ],
  },
  manualBlocks: [],
  exportMetadata: { routineName: 'Advanced Hypertrophy', source: 'JSON.fit' },
};

/** How the PREVIOUS version of getShare built its response body. The baseline. */
const legacyResponseBody = (shareId, data, createdAt, expiresAt) =>
  JSON.stringify({ shareId, data, createdAt, expiresAt });

const gzipB64Body = (obj) => JSON.stringify({
  enc: ENCODING_GZIP_B64,
  payload: zlib.gzipSync(Buffer.from(JSON.stringify(obj), 'utf8'), { level: 9 }).toString('base64'),
});

/** Run a payload through createShare, then read it back out through getShare. */
const roundTrip = async (body) => {
  mockDb.put = null;
  const created = await createShare({ body });
  if (created.statusCode !== 201) return { created, fetched: null };

  const { shareId } = JSON.parse(created.body);
  mockDb.get = mockDb.put;
  const fetched = await getShare({ pathParameters: { shareId } });
  return { created, fetched, stored: mockDb.put };
};

beforeEach(() => { mockDb.put = null; mockDb.get = null; });

describe('backward compatibility — the receiving side must not notice', () => {
  test('OLD format in -> OLD format out: an uncompressed POST round trips unchanged', async () => {
    const { created, fetched, stored } = await roundTrip(JSON.stringify(PAYLOAD));

    expect(created.statusCode).toBe(201);
    expect(fetched.statusCode).toBe(200);

    // The exact bytes the previous implementation would have returned.
    const expected = legacyResponseBody(
      stored.shareId, PAYLOAD, stored.createdAt, stored.expiresAt
    );
    expect(fetched.body).toBe(expected);

    // Response headers are part of the contract too.
    expect(fetched.headers['Content-Type']).toBe('application/json');
    expect(fetched.headers['Cache-Control']).toBe('public, max-age=300');
  });

  test('a compressed POST yields the SAME response as an uncompressed one', async () => {
    const plain = await roundTrip(JSON.stringify(PAYLOAD));
    const gzipped = await roundTrip(gzipB64Body(PAYLOAD));

    // Normalise the ids/timestamps, which are generated per-request.
    const strip = (r, s) => r.fetched.body
      .split(s.shareId).join('<id>')
      .split(String(s.createdAt)).join('<t>')
      .split(String(s.expiresAt)).join('<e>');

    expect(strip(gzipped, gzipped.stored)).toBe(strip(plain, plain.stored));
    expect(JSON.parse(gzipped.fetched.body).data).toEqual(PAYLOAD);
  });

  test('a PRE-EXISTING plaintext item (written before this deploy) still resolves', async () => {
    // Rows written by the old createShare carry `data`, not `blob`. They live in
    // the table for up to the full 7-day TTL after deploy and must keep working.
    mockDb.get = {
      shareId: 'AbCdEfGh',
      data: PAYLOAD,
      createdAt: 1_700_000_000,
      expiresAt: 1_900_000_000,
    };

    const fetched = await getShare({ pathParameters: { shareId: 'AbCdEfGh' } });

    expect(fetched.statusCode).toBe(200);
    expect(fetched.body).toBe(
      legacyResponseBody('AbCdEfGh', PAYLOAD, 1_700_000_000, 1_900_000_000)
    );
  });
});

describe('compression', () => {
  test('stores a gzip blob, not plaintext', async () => {
    const { stored } = await roundTrip(gzipB64Body(PAYLOAD));

    expect(stored.enc).toBe('gzip');
    expect(Buffer.isBuffer(stored.blob)).toBe(true);
    expect(stored.data).toBeUndefined();
    expect(JSON.parse(zlib.gunzipSync(stored.blob).toString('utf8'))).toEqual(PAYLOAD);
  });

  test('a real program at the scale that used to 413 now fits comfortably', async () => {
    // The largest real program in the repo (a 1-year advanced hypertrophy plan),
    // grown to the ~20k-line scale that actually reported "too big to share".
    const program = require('../../jsonfit_1year_advanced_hypertrophy_full.json');
    const big = { workoutData: JSON.parse(JSON.stringify(program)), manualBlocks: [] };

    const blocks = big.workoutData.blocks;
    const seed = JSON.stringify(blocks);
    while (Buffer.byteLength(JSON.stringify(big), 'utf8') < 220 * 1024) {
      blocks.push(...JSON.parse(seed));
    }

    const raw = Buffer.byteLength(JSON.stringify(big), 'utf8');
    expect(raw).toBeGreaterThan(200 * 1024); // the old limit would have rejected this

    const { created, stored } = await roundTrip(gzipB64Body(big));

    expect(created.statusCode).toBe(201);
    expect(stored.blob.length).toBeLessThan(MAX_STORED_COMPRESSED_BYTES);

    // And it round-trips back out intact, byte for byte.
    mockDb.get = stored;
    const fetched = await getShare({ pathParameters: { shareId: stored.shareId } });
    expect(JSON.parse(fetched.body).data).toEqual(big);

    console.log(
      `real program: ${raw}B raw -> ${stored.blob.length}B stored ` +
      `(${(raw / stored.blob.length).toFixed(1)}x), old cap was ${200 * 1024}B`
    );
  });
});

describe('limits', () => {
  test('rejects a payload over the uncompressed limit with 413', async () => {
    const huge = { pad: 'x'.repeat(MAX_UNCOMPRESSED_BYTES + 1024) };
    const { created } = await roundTrip(gzipB64Body(huge));

    expect(created.statusCode).toBe(413);
  });

  test('a zip bomb is refused, not inflated', async () => {
    // 10 MB of zeros compresses to a few KB. Without zlib's maxOutputLength this
    // would be materialised in full inside a 256 MB Lambda.
    const bomb = zlib.gzipSync(Buffer.alloc(10 * 1024 * 1024, 0), { level: 9 });
    expect(bomb.length).toBeLessThan(64 * 1024); // tiny on the wire

    const { created } = await roundTrip(JSON.stringify({
      enc: ENCODING_GZIP_B64,
      payload: bomb.toString('base64'),
    }));

    expect(created.statusCode).toBe(413);
  });

  test('non-ASCII survives the codec intact', async () => {
    // Routine names and exercise notes are free text. gzip operates on bytes, so
    // a UTF-8 mistake anywhere in the chain corrupts them silently rather than
    // throwing — worth pinning explicitly.
    const unicode = {
      workoutData: { routine_name: 'Café Push/Pull 💪', note: 'Müller — 日本語 — ✅' },
    };
    const { created, fetched } = await roundTrip(gzipB64Body(unicode));

    expect(created.statusCode).toBe(201);
    expect(JSON.parse(fetched.body).data).toEqual(unicode);
  });

  test('rejects a malformed gzip payload with 400', async () => {
    const { created } = await roundTrip(JSON.stringify({
      enc: ENCODING_GZIP_B64,
      payload: Buffer.from('not gzip at all').toString('base64'),
    }));

    expect(created.statusCode).toBe(400);
  });

  test('rejects an unknown encoding rather than guessing', async () => {
    const { created } = await roundTrip(JSON.stringify({ enc: 'brotli', payload: 'AAAA' }));

    expect(created.statusCode).toBe(400);
  });
});
