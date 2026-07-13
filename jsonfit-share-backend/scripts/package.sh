#!/bin/bash
#
# Package the built Lambda bundles into deployable zips.
#
# Run `sam build` first. This does NOT deploy anything — it only writes dist/.
#
# ---------------------------------------------------------------------------
# Slim zips: node_modules is deliberately EXCLUDED
# ---------------------------------------------------------------------------
# The handlers require @aws-sdk/client-dynamodb and @aws-sdk/lib-dynamodb, but we
# do not ship them. The Lambda Node.js runtime provides AWS SDK v3 on the module
# path (/var/runtime/node_modules), and that is what the live functions already
# resolve against today — they are deployed as 2,168 and 1,072 byte zips with no
# node_modules at all, and they work.
#
# So this is not a new bet: it is the existing, proven dependency model. Bundling
# the SDK would add ~2.8MB and a slower cold start, and would be a change to the
# dependency model riding along with a behaviour change. Kept separate on purpose.
#
# sam build still installs node_modules into .aws-sam/build (it needs the manifest
# to resolve the tree); we simply don't ship it.
#
# CAVEAT: if the runtime is ever bumped, re-confirm the target runtime still ships
# the AWS SDK before deploying a slim zip. nodejs18/20/22 do. Do not assume for
# anything newer — AWS has signalled dropping the bundled SDK from future runtimes.
# If it is ever absent, the fix is to stop excluding node_modules below.
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Why the shim
# ---------------------------------------------------------------------------
# Both live functions are configured with `Handler: index.handler` — they were
# created by CloudFormation from inline code, which always lands as index.js at
# the archive root.
#
# Our bundles nest the handler one level down (createShare/index.js), because
# both functions build from a shared CodeUri so they can share
# shared/shareLimits.js. Uploading that layout as-is gives
# Runtime.HandlerNotFound on the first invoke, in production.
#
# The obvious fix — also calling `update-function-configuration --handler
# createShare/index.handler` — is NOT safe. update-function-code and
# update-function-configuration are two separate API calls, so whichever order
# you run them in, there is a window where the configured handler and the
# deployed code disagree and every invoke fails:
#
#   code first   -> nested code, handler still index.handler   -> HandlerNotFound
#   config first -> handler nested, code still flat index.js   -> HandlerNotFound
#
# So instead we add a root index.js that re-exports the real handler. The
# configured handler stays `index.handler` and never has to change, which means
# there is no window at all: a single update-function-code call swaps the
# function atomically.
#
#   /var/task/index.js            <- shim, exports.handler
#   /var/task/createShare/index.js <- the real handler
#   /var/task/shared/shareLimits.js <- '../shared/shareLimits' from createShare/ ✔
#   /var/task/node_modules/        <- resolves upward from createShare/ ✔
# ---------------------------------------------------------------------------

set -euo pipefail

cd "$(dirname "$0")/.."

BUILD=".aws-sam/build"
DIST="dist"

if [ ! -d "$BUILD" ]; then
  echo "error: $BUILD not found — run 'sam build' first" >&2
  exit 1
fi

rm -rf "$DIST"
mkdir -p "$DIST"

package() {
  local fn_name="$1"      # jsonfit-createShare
  local build_dir="$2"    # CreateShareFunction
  local entry="$3"        # createShare
  local other="$4"        # getShare  (the sibling handler we don't need)

  local stage
  stage="$(mktemp -d)"

  cp -R "$BUILD/$build_dir/." "$stage/"

  # Each bundle carries both handlers because they share a CodeUri. Drop the one
  # this function doesn't use, plus the vestigial per-function manifests.
  rm -rf "${stage:?}/$other"
  rm -f "$stage/$entry/package.json"

  # Ship slim: the AWS SDK comes from the runtime, not from us. See header.
  rm -rf "${stage:?}/node_modules"
  rm -f "$stage/package.json"

  # The shim that keeps `Handler: index.handler` valid — see header.
  cat > "$stage/index.js" <<EOF
// Entry shim. The live function is configured with Handler: index.handler, but
// the real handler lives at $entry/index.js so that both functions can share
// shared/shareLimits.js. Re-export it rather than changing the function config,
// which would otherwise need a second API call and open a window where the
// handler and the code disagree. See scripts/package.sh.
module.exports = require('./$entry/index.js');
EOF

  ( cd "$stage" && zip -qr "$OLDPWD/$DIST/$fn_name.zip" . )
  rm -rf "$stage"

  printf '  %-22s %s\n' "$fn_name.zip" "$(du -h "$DIST/$fn_name.zip" | cut -f1)"
}

echo "packaging:"
package jsonfit-createShare CreateShareFunction createShare getShare
package jsonfit-getShare    GetShareFunction    getShare    createShare

echo
echo "wrote $DIST/ — nothing has been uploaded."
