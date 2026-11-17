# layercard — rules for agents

- Code, comments, identifiers and docs in this repo are in English.
- The repo will become public. Never commit private card content (real names other than the fictional
  example, contact data, case studies, client names, domains of employers or clients). Private content
  lives outside the repo and is referenced by deployment config only.
- `packages/scene/CONTRACT.md` is the boundary between the scene and the shell. Effects implement it;
  the shell consumes it. Changing it requires a version bump and a note in `docs/build-log.md`.
- Folder ownership:
  - `packages/scene/effects/<name>/` — the scene runs (one per effect, built by Claude Fable 5.2)
  - `apps/`, `worker/`, `checks/`, `scripts/` — the shell work (branch `shell/*`, worktree `layercard-shell`)
  - `examples/`, `packages/scene/CONTRACT.md`, `packages/scene/types.d.ts` — shared; change only with a note
- Every number that may end up in a public write-up goes into `docs/build-log.md` with its source.
- Ask before: pushing, merging into `main`, deploying, deleting files outside your folder.
