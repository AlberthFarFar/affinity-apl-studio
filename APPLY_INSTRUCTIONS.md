# Context Crop v2 — apply guide

## File baru

- `src/components/image-crop/ImageCropModal.tsx`
- `src/utils/imageCrop.ts`

## File pengganti

- `src/components/Step1Input.tsx`
- `src/types.ts`
- `package.json`

## Dependency

`react-image-crop` (`^11.0.10`)

Jalankan `npm install`, lalu validasi dengan `npm run lint` dan `npm run build`.

## Cara menerapkan

Salin isi folder `src/` dan `package.json` dari paket ini ke path yang sama di root repository Affinity, lalu jalankan perintah install di atas. File source asli di paket ini adalah pengganti lengkap, bukan patch parsial.

## Perilaku

Sebelumnya referensi properti/gaya langsung dioptimalkan menjadi Master AI Image. Sekarang setiap gambar membuka editor crop lokal; gambar multi-upload diproses satu per satu. Original tetap disimpan, sedangkan Master AI Image dibuat dari hasil crop. Thumbnail mendukung **Edit Crop** tanpa unggah ulang.

## Batasan diketahui

Crop besar dibatasi pada sisi terpanjang 8192px untuk mencegah alokasi canvas yang tidak aman. PNG dipertahankan sebagai PNG; format lain diekspor JPEG sebelum optimasi Master AI.
