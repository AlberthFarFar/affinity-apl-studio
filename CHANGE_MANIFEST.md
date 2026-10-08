# CHANGE MANIFEST — Affinity Visual Style Testing Lab v1.1

- Repository: `AlberthFarFar/affinity-apl-studio`
- Baseline branch: `main`
- Baseline commit: `798968107166a3ed4c0a242f5e0ae5f9fa3871cc`
- Repository files in this package: 15 (10 ADDED, 5 MODIFIED)
- Packaging documents: 4 (`CHANGE_MANIFEST.md`, `APPLY_INSTRUCTIONS.md`, `TEST_RESULTS.md`, `SHA256SUMS.txt`)
- No commit or push was performed.

## ADDED

- `server/visualStyleLab/nanoAdapter.ts` — dedicated Nano Banana Pro adapter and exact 4:5/2K/PNG payload.
- `server/visualStyleLab/presets.ts` — authoritative preset loading, 5x5 validation, reference validation, deterministic prompt compilation.
- `server/visualStyleLab/routes.ts` — isolated feature-gated API routes; paid routes remain impossible in production without future authentication.
- `server/visualStyleLab/seedreamAdapter.ts` — dedicated Seedream 5.0 Pro finish-only adapter.
- `server/visualStyleLab/service.ts` — dry run, concurrency-2 batch, partial failure, retry-one, and finish orchestration.
- `server/visualStyleLab/types.ts` — lab server contracts and fixed model IDs.
- `server/visualStyleLab/visualStyleLab.test.ts` — mock-only targeted tests; no paid model calls.
- `src/features/visual-style-test-lab/SEEDREAM_FINISH_ONLY_PROMPT.txt` — authoritative finish prompt copied from approved pack.
- `src/features/visual-style-test-lab/visual-style-test-presets.v1.json` — authoritative 5-style/25-prompt data copied byte-for-byte from approved pack.
- `src/features/visual-style-test-lab/VisualStyleTestLab.tsx` — isolated dev/test UI, dry run, result cards, retry, prompt copy, and before/after finish paths.

## MODIFIED

- `package.json` — adds only the targeted mock-test command.
- `server.ts` — mounts the isolated lab API and blocks the lab page by default in production.
- `src/App.tsx` — routes `/visual-style-test-lab` to the isolated lab without changing the production step pipeline.
- `src/components/Navbar.tsx` — adds a development-only link to the lab.
- `tsconfig.json` — scopes typecheck to the actual `src/`, `server/`, and build entry files, excluding stale root duplicates.

## Deliberately unchanged

Production carousel prompts/generation, poster flow, existing upload/crop behavior, auth, deployment files, and user data were not replaced or refactored. No `.env`, secret, generated image, cache, `node_modules`, or `.git` content is included.
