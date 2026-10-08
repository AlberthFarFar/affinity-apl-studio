# APPLY INSTRUCTIONS

1. Buat backup atau branch baru dari repository `affinity-apl-studio`, lalu pastikan baseline Anda adalah `main` commit `798968107166a3ed4c0a242f5e0ae5f9fa3871cc` (atau review konflik jika `main` sudah lebih baru).
2. Ekstrak ZIP ini. Salin seluruh isi hasil ekstrak ke **root repository** sambil mempertahankan struktur folder. Izinkan overwrite hanya untuk lima file berstatus **MODIFIED** di `CHANGE_MANIFEST.md`; file berstatus **ADDED** harus masuk ke path baru yang sama.
3. Di root repository jalankan `npm install`, `npm run test:visual-style-lab`, `npm run lint`, lalu `npm run build`. Jangan lanjut jika salah satu gagal.
4. Untuk pemakaian lokal, lab tersedia di `/visual-style-test-lab`. Paid generation tetap OFF. Jika benar-benar ingin melakukan uji berbayar secara lokal, simpan `FAL_KEY` hanya di secret/environment backend dan set `VISUAL_STYLE_LAB_PAID_GENERATION_ENABLED=true`. Jangan pernah membuat variabel `VITE_FAL_KEY`.
5. Untuk memperbarui GitHub lewat web: upload file dengan path yang sama ke branch fitur, review tab **Files changed**, lalu commit ke branch tersebut dan buat PR. Paket ini sendiri tidak membuat commit/push.
6. Untuk Google AI Studio: simpan/backup perubahan lokal yang belum tersinkron, pilih project repository yang sama, gunakan fitur pull/sync dari branch yang sudah direview, cek konflik pada lima file MODIFIED, lalu ulangi test/build sebelum deploy.
7. Saat deploy publik, biarkan `VISUAL_STYLE_LAB_ENABLED` tidak disetel/false. Lab page menjadi 404 dan paid endpoints tetap ditolak. Aplikasi ini belum memiliki auth lab, sehingga kode sengaja tidak mengizinkan paid lab generation di production.

Catatan: `visual-style-test-presets.v1.json` dan `SEEDREAM_FINISH_ONLY_PROMPT.txt` adalah sumber baku. Jangan edit tanpa versi baru dan alasan teknis yang terdokumentasi.
