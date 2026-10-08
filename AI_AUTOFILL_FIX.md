# Affinity: perbaikan penanganan kegagalan Auto-isi AI

Paket ini memperbaiki kode aplikasi. Paket ini tidak memulihkan akses yang diblokir oleh penyedia AI.

## Hasil penelusuran

Screenshot menunjukkan HTTP 403 dengan pesan `Policy Violation: this user has been blocked for a previous policy violation` dari panggilan GPT melalui fal.ai/OpenRouter. Backend sudah mencapai layanan AI. Pesan tersebut belum menentukan akun pihak mana yang dibatasi; dukungan fal.ai perlu menelusuri jalur upstream.

Kode lama mencoba ulang setiap kegagalan, kemudian mengubahnya menjadi HTTP 502 dan pesan terkait URL. Frontend menampilkan pesan umum jika Content-Type bukan JSON. Proxy yang mengubah respons 502 menjadi HTML dapat memperburuk gejala ini; dugaan perubahan oleh proxy belum diverifikasi pada hosting pengguna.

Log WebSocket Vite berasal dari koneksi hot reload. Log itu tidak menjelaskan penolakan HTTP 403 pada panggilan backend ke provider. Konfigurasi HMR tidak diubah dalam perbaikan ini.

## Perubahan

- Pertahankan HTTP 401/402/403/429 dengan kode error terstruktur dan petunjuk yang sesuai.
- Hentikan retry otomatis pada penolakan akses, kredit, parameter, dan rate limit. Hanya kegagalan koneksi/server sementara yang dicoba sekali lagi.
- Batasi waktu panggilan GPT agar permintaan tidak menggantung selamanya.
- Jangan meneruskan body error mentah provider, kredensial, atau HTML ke antarmuka/log. Sertakan request ID yang valid jika disediakan provider.
- Gunakan jalur panggilan yang sama untuk Diagnostik dan analisis. Diagnostik berikutnya dilewati jika koneksi provider gagal.
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

5. Buka Auto-isi AI. Jika provider masih memblokir, tampilan seharusnya menjelaskan penolakan HTTP 403 dan menawarkan tautan dukungan. Jangan menganggap ini tanda bahwa pembatasan provider sudah pulih.
6. Setelah dukungan fal.ai memulihkan akses, jalankan Diagnostik dan ulangi analisis URL atau pencarian. Kedua tombol menghasilkan draft untuk ditinjau sebelum Apply to Project.

## Pengujian

15 pengujian Auto-isi/Diagnostik dan 7 pengujian Visual Style lulus, termasuk simulasi provider 403 melalui fungsi GPT, analisis, HTTP route, hingga parser frontend; jalur sukses; tidak ada retry pada 401/402/403/429; retry pada gangguan sementara; HTML; respons rusak; dan timeout. TypeScript serta build produksi lulus. Pengujian menggunakan respons provider simulasi, bukan panggilan berbayar ke akun pengguna. Keberhasilan AI di hosting pengguna belum diverifikasi.

## Pesan untuk dukungan fal.ai

Kirim melalui akun Anda ke support@fal.ai. Tidak ada pesan yang dikirim otomatis oleh paket ini.

> Aplikasi Affinity saya memanggil endpoint `openrouter/router/openai/v1/chat/completions` dengan model `openai/gpt-5` menggunakan FAL_KEY server-side. Respons upstream: HTTP 403, "Policy Violation: this user has been blocked for a previous policy violation". Mohon periksa apakah pembatasan berasal dari akun fal.ai saya, koneksi OpenRouter, atau provider OpenAI yang digunakan di belakangnya, serta langkah pemulihan akses resmi. Waktu kejadian: [isi tanggal, jam, zona waktu]. Request ID: [isi jika tersedia].

Jangan sertakan API key dalam pesan dukungan.

Referensi resmi: [fal.ai OpenRouter API](https://fal.ai/models/openrouter/router/openai/v1/chat/completions/api), [OpenRouter server tools](https://openrouter.ai/docs/guides/features/server-tools/overview).
