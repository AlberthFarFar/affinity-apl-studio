# Affinity: perbaikan penanganan kegagalan Auto-isi AI

Paket ini memperbaiki kode aplikasi agar Auto-isi menggunakan jalur GPT yang sama dengan Diagnostik.

## Hasil penelusuran

Diagnostik pada aplikasi membuktikan `FAL_KEY`, endpoint fal.ai OpenRouter, GPT-5, dan `/api/analyze-master` dapat digunakan. Error 403 hanya terjadi pada Project Intelligence. Perbedaannya adalah fitur tersebut memakai tool server OpenRouter (`web_fetch`/`web_search`) untuk mengunjungi tautan atau mencari web, sedangkan Diagnostik memakai GPT secara langsung. Jadi akses GPT utama tersedia; tool server pada jalur fal.ai/OpenRouter yang ditolak untuk permintaan ini.

Kode lama mencoba ulang setiap kegagalan, kemudian mengubahnya menjadi HTTP 502 dan pesan terkait URL. Frontend menampilkan pesan umum jika Content-Type bukan JSON. Proxy yang mengubah respons 502 menjadi HTML dapat memperburuk gejala ini; dugaan perubahan oleh proxy belum diverifikasi pada hosting pengguna.

Log WebSocket Vite berasal dari koneksi hot reload. Log itu tidak menjelaskan penolakan HTTP 403 pada panggilan backend ke provider. Konfigurasi HMR tidak diubah dalam perbaikan ini.

## Perubahan

- Pertahankan HTTP 401/402/403/429 dengan kode error terstruktur dan petunjuk yang sesuai.
- Hentikan retry otomatis pada penolakan akses, kredit, parameter, dan rate limit. Hanya kegagalan koneksi/server sementara yang dicoba sekali lagi.
- Batasi waktu panggilan GPT agar permintaan tidak menggantung selamanya.
- Jangan meneruskan body error mentah provider, kredensial, atau HTML ke antarmuka/log. Sertakan request ID yang valid jika disediakan provider.
- Project Intelligence kini memakai GPT-5 langsung tanpa `web_fetch` atau `web_search`, sama seperti Diagnostik yang sudah lulus. Ini menghilangkan pemicu 403 pada alur Auto-isi.
- Tautan proyek dinormalisasi otomatis: `www.parklandpodomoro.com` menjadi `https://www.parklandpodomoro.com/`.
- Tautan menjadi rujukan yang dicantumkan pada hasil, bukan diklaim telah dibaca. Model diminta membuat konsep sebagai draft dan menandai informasi yang belum dapat diverifikasi sebagai inferensi.
- Frontend dapat membaca JSON meski header diubah proxy, dan memberi petunjuk sesuai HTTP status untuk respons HTML/rusak.
- Tetap menggunakan `openai/gpt-5` melalui fal.ai dan secret server `FAL_KEY`. Tidak memerlukan Gemini API key.
- Sertakan perbaikan runtime sebelumnya: `build` membangun frontend/backend, `start` dan `preview` menjalankan Express.

## Cara menerapkan

Basis salinan: commit `646c814` (`GPT-AI research`) ditambah perbaikan runtime sebelumnya. Pengambilan versi terbaru GitHub gagal karena DNS `Could not resolve host: github.com`, termasuk percobaan di luar sandbox. Paket belum dipush atau dideploy.

1. Simpan/commit perubahan lokal Anda terlebih dahulu. Ekstrak paket ke folder baru untuk ditinjau; jangan menimpa seluruh repo yang sudah punya perubahan baru.
2. Gabungkan file berikut ke proyek Affinity di GitHub/AI Studio:
   - `server/aiErrors.ts` (baru)
   - `server/falOpenRouter.ts`
   - `server/projectIntelligenceRoute.ts`
   - `server/diagnostics.ts`
   - `src/utils/projectIntelligenceApi.ts` (baru)
   - `src/components/ProjectIntelligencePanel.tsx`
   - `server.ts`, `server.production.ts`, `package.json`, `tsconfig.json`
   - File tes terkait: `server/falOpenRouter.test.ts`, `server/projectIntelligenceRoute.test.ts`, `server/diagnostics.test.ts`, `src/utils/projectIntelligenceApi.test.ts`.
3. Pastikan secret `FAL_KEY` tersedia pada server/Secrets AI Studio. Jangan masukkan ke kode frontend atau commit Git.
4. Jalankan:

```sh
npm install
npm run test:project-intelligence
npm run lint
npm run build
npm start
```

Untuk pengembangan gunakan `npm run dev`. Pastikan hosting menjalankan server Node/Express, bukan hanya folder statis `dist`. Terapkan/restart versi backend dan frontend bersama-sama.

5. Buka Auto-isi AI dan masukkan nama proyek, cluster, serta tipe unit. Domain tanpa protokol juga diterima. Pilih **Analisis Project dengan AI** atau **Buat Draft Konsep**, lalu tinjau dan Apply to Project.
6. Kedua tombol sekarang membuat draft langsung dengan GPT. Bila membaca situs atau pencarian web diperlukan lagi, fitur itu perlu provider retrieval terpisah yang sudah disetujui untuk akun Anda.

## Pengujian

16 pengujian Auto-isi/Diagnostik dan 7 pengujian Visual Style lulus, termasuk jalur GPT langsung tanpa tool web, domain tanpa `https://`, simulasi provider 403, HTTP route, parser frontend, respons HTML/rusak, timeout, dan jalur sukses. TypeScript serta build produksi lulus. Pengujian menggunakan respons provider simulasi, bukan panggilan berbayar ke akun pengguna. Keberhasilan AI di hosting pengguna belum diverifikasi.

Jika kelak Anda ingin mengaktifkan kembali pencarian web, hubungi fal.ai dengan bukti 403 dan request ID tanpa mengirim API key. Referensi: [fal.ai OpenRouter API](https://fal.ai/models/openrouter/router/openai/v1/chat/completions/api), [OpenRouter server tools](https://openrouter.ai/docs/guides/features/server-tools/overview).
