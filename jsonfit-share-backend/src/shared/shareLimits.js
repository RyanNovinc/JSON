/**
 * Share payload limits — the SINGLE source of truth.
 *
 * This file is required by both Lambdas (createShare, getShare) and imported
 * directly by the app (src/services/shareService.ts). Do not copy these numbers
 * anywhere else; change them here and both sides move together.
 *
 * ---------------------------------------------------------------------------
 * Where these numbers come from
 * ---------------------------------------------------------------------------
 *
 * The binding constraint is DynamoDB's hard 400 KB (409,600 byte) maximum item
 * size. It counts attribute NAMES plus values, and it cannot be raised — there
 * is no quota increase for it. Everything below is derived from that ceiling.
 *
 * The old limit was `bodySize > 200 * 1024` — an undocumented magic number with
 * no stated derivation. It was measuring the wrong thing: the RAW JSON body, at
 * a time when raw JSON was what we stored. We now store the payload GZIPPED, so
 * the raw size no longer determines whether the item fits.
 *
 * Item budget:
 *   400 KB  DynamoDB hard cap
 *   -  1 KB  overhead: shareId, createdAt, expiresAt, enc, attribute names
 *   = 399 KB available for the compressed blob
 *
 * MAX_STORED_COMPRESSED_BYTES = 350 KB. That is the real safety net: whatever
 * the client sends, we refuse to write an item that could approach the cap. It
 * leaves ~49 KB of headroom for schema growth.
 *
 * MAX_UNCOMPRESSED_BYTES = 1 MiB, derived from the stored guard:
 *
 *   Measured gzip ratio on real programs in this repo:  ~13.7 : 1
 *     (a 20,377-line program: 241,418 B raw -> 17,564 B gzip+base64)
 *   Pessimistic floor for a program that compresses badly: 3 : 1
 *     (JSON this repetitive does not realistically do worse; 3:1 is a floor,
 *      not an expectation)
 *
 *   At the 3:1 floor, 1 MiB uncompressed compresses to ~350 KB — exactly the
 *   stored guard. So 1 MiB is the LARGEST uncompressed limit that DynamoDB can
 *   still honour even when compression underperforms badly. Both guards are
 *   enforced; whichever binds first wins.
 *
 * What this buys us in practice:
 *   old limit  200 KB raw   ~= 17,300 lines of program JSON  (measured 11.8 B/line)
 *   new limit    1 MiB raw  ~= 89,000 lines
 *   the program that reported "too big to share" was 20,377 lines / 241,418 B.
 *
 * MAX_UNCOMPRESSED_BYTES is ALSO the decompression bound. The API is
 * unauthenticated, so a hostile client could POST a small gzip blob that
 * inflates to gigabytes (a zip bomb). createShare passes this value to zlib as
 * `maxOutputLength`, which makes the decompress itself fail rather than
 * exhausting Lambda memory. Never decompress an untrusted body without it.
 */

/** DynamoDB's hard per-item ceiling. Not configurable, not raisable. */
const DYNAMODB_MAX_ITEM_BYTES = 400 * 1024;

/**
 * Largest compressed blob we will write to DynamoDB.
 * Sized to stay clear of DYNAMODB_MAX_ITEM_BYTES with room for item overhead.
 */
const MAX_STORED_COMPRESSED_BYTES = 350 * 1024;

/**
 * Largest raw (decompressed) JSON payload we accept.
 * Doubles as the zlib `maxOutputLength` zip-bomb guard — see header.
 */
const MAX_UNCOMPRESSED_BYTES = 1024 * 1024;

/**
 * Marker for a gzip+base64 request body.
 *
 * A compressed POST body looks like: { enc: "gzip+b64", payload: "<base64>" }
 * An old (uncompressed) client POSTs the bare share object, with no `enc` key.
 * That is how the endpoint stays backward compatible: presence of `enc` is the
 * whole discriminator. This marker lives on the REQUEST only — getShare always
 * responds with plain JSON, so installed clients are unaffected.
 */
const ENCODING_GZIP_B64 = 'gzip+b64';

module.exports = {
  DYNAMODB_MAX_ITEM_BYTES,
  MAX_STORED_COMPRESSED_BYTES,
  MAX_UNCOMPRESSED_BYTES,
  ENCODING_GZIP_B64,
};
