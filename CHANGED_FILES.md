# Affinity AI Link Fast Auto-fill

Salin file berikut ke path yang sama di repository Affinity. Jangan salin folder pembungkusnya.

| Tindakan | Path | Alasan |
| --- | --- | --- |
| REPLACE | `package.json` | Menjalankan seluruh tes mock AI Link dalam satu perintah. |
| REPLACE | `server/projectIntelligence.ts` | Fetch aman maksimal 3 URL, SSRF/redirect guard, timeout, batas respons, cache 24 jam, ekstraksi HTML/JSON-LD deterministik, dan mapping fakta. |
| ADD/REPLACE | `server/projectIntelligenceRoute.ts` | Validasi maksimal 3 URL dan endpoint JSON untuk auto-fill. |
| ADD | `server/projectIntelligence.test.ts` | Tes mock parsing, partial failure, unit/harga ambigu, SSRF/redirect, dan deduplikasi. |
| ADD | `server/projectIntelligenceRoute.test.ts` | Tes kontrak endpoint JSON tanpa API eksternal. |
| REPLACE | `src/App.tsx` | Merge hasil hanya ke field kosong. |
| REPLACE | `src/components/ProjectIntelligencePanel.tsx` | Status cepat, retry, auto-apply, batas 3 URL, abort dan proteksi stale request. |
| REPLACE | `src/types/projectIntelligence.ts` | Tipe hasil auto-fill serta metadata bukti sumber. |
| REPLACE | `src/utils/projectIntelligence.ts` | Sanitasi input project opsional untuk URL-first flow. |
| ADD | `src/utils/projectAutofill.ts` | Merge-only-empty dan latest-request guard. |
| ADD | `src/utils/projectAutofill.test.ts` | Tes field manual tidak tertimpa dan request lama tidak menang. |

## Pengujian lokal

```powershell
npm install
npm run test:project-intelligence
npm run lint
npm run build
```

Semua tes memakai mock lokal dan tidak memanggil API berbayar.
