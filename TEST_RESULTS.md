# TEST RESULTS

Tanggal: 2026-10-08 (Asia/Jakarta)  
Baseline: `main@798968107166a3ed4c0a242f5e0ae5f9fa3871cc`

## Commands executed

- `npm install --ignore-scripts --no-audit --no-fund` — PASS; 202 packages installed for local verification.
- `npm run test:visual-style-lab` — PASS; 7 tests, 7 passed, 0 failed. All fal calls used injected mocks.
- `npm run build` — PASS; Vite transformed 1681 modules and produced a production bundle. Existing Vite warning about future native config-loader support for `__dirname` remains non-fatal.
- `npm run lint` (first run) — FAIL because baseline `tsconfig.json` implicitly included stale duplicate root files `App.tsx` and `Step1Input.tsx` with invalid relative imports.
- Scoped repair: `tsconfig.json` now explicitly includes actual `src/`, `server/`, `server.ts`, and `vite.config.ts`.
- `npm run lint` (rerun) — PASS; TypeScript completed with no errors.
- `npm run dev` — PASS; server started on port 3000. A separate localhost HTTP probe was unavailable because the execution sandbox blocks cross-process sockets.

## Mock coverage proved

- Exactly 5 styles, 25 unique scene IDs, and 25 non-empty authoritative prompts.
- Deterministic compilation and verified-fact suffixing.
- Five distinct Nano calls, `num_images: 1`, shared master-first reference order, and maximum concurrency 2.
- Partial failure preserves four successes; retry makes exactly one independent Nano call.
- Initial generation never calls Seedream.
- Seedream requires separate confirmation and receives only finish prompt + one image using `image_size` 1024x1280.
- Paid generation defaults off and remains impossible in production without a future authenticated gate.

## Manual acceptance — one style / five images

1. Start locally with paid flag OFF, open `/visual-style-test-lab`, upload one representative full residential/shophouse master, choose one style, and click **Dry Run**. Confirm five separate full prompts, master-first reference order, five expected calls, and cost shown as unknown.
2. After reviewing prompts, enable the local backend paid flag and reload. Click **Generate 5**, then accept the second confirmation. Confirm five independent status cards and five Nano request IDs.
3. If one slide fails, confirm the other successful images remain visible; click **Retry satu** only on the failed card and accept its separate confirmation.
4. On one approved slide, click **Cinema Film Finish**, accept the confirmation, and compare before/after. Reject the finish if facade, geometry, people, framing, daypart, or lighting intent drifts.
5. Upload a separate AI-generated image in the finish-only section and repeat the single-image before/after check. Never approve a finish solely from automated success status.

No paid generation, Gemini request, Seedream request, commit, or push was performed during verification.
