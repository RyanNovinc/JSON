# `deployed/` — artifacts currently live in AWS

Nothing in this directory is built from, or built into, anything. It is a record of
**what is actually running in production**, kept because the deployed state and the repo
state have drifted and the difference is not otherwise recoverable.

Do not delete these. Do not put them back under `src/` — `src/` is the SAM `CodeUri`, so
anything there is swept into both Lambda bundles.

## `createShare-live-2026-05-05.zip`

The 2,168-byte artifact currently deployed as the `jsonfit-createShare` Lambda
(`LastModified: 2026-05-05T02:19:56Z`). It was uploaded **out of band** — not by
CloudFormation, not by SAM — roughly 16 hours after the stack was created.

It contains the pre-compression `createShare`: `EXPIRY_DAYS = 7` and the `200 * 1024`
byte limit. It predates the gzip work.

This zip previously lived at `src/createShare/function.zip`, where `sam build` was
copying it into *both* function bundles.

## Why this matters: CloudFormation does not know this code exists

The `jsonfit-shares` stack was created from `cloudformation-template.yaml`, which carries
the Lambda source **inline, as CloudFormation parameters** (`Code: ZipFile: !Ref
FunctionCode1`). The live stack still holds `FunctionCode1` = the original inline
`createShare`, which has a **30-day** TTL and the 200KB limit.

So CloudFormation believes `createShare` is running 30-day code. It is actually running
the 7-day code in this zip.

**Consequence:** re-running the deploy command in `../README.md`

```bash
aws cloudformation deploy --template-file cloudformation-template.yaml \
  --stack-name jsonfit-shares --capabilities CAPABILITY_IAM --region ap-southeast-2
```

would re-apply `FunctionCode1` and **silently revert `createShare`** to the 30-day,
200KB, no-compression version — clobbering both this artifact and any newer work.

`getShare` was never re-deployed at all; it still runs the inline code from the stack,
which is why `src/getShare/index.js` in the repo is one error-handling branch ahead of
what is live.
