## Git rules — non-negotiable

- At the start of every session, run `git branch --show-current` and state the
  current branch before doing anything else.
- Never run `git checkout`, `git switch`, `git stash`, `git reset`, `git clean`,
  or any force-push without asking the user first and getting explicit approval.
- Before ending a session, and before any branch operation, commit all
  work-in-progress (including new untracked source files) with a descriptive
  message. Never leave work uncommitted or stashed at the end of a session.