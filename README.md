# Dispo Wedding Cam

Kamera sekali pakai (disposable) digital untuk tamu pernikahan. Tamu scan kode QR di meja, langsung
dapat kamera di browser HP dengan filter film, tanpa install aplikasi. Semua foto terkumpul di satu galeri.

**Stack:** Next.js (App Router) · Supabase (Postgres + Storage + Realtime) · Vercel

## Fitur

- **Kode QR siap cetak** (`/qr`): kartu meja berisi nama pengantin, tanggal, dan hashtag. Bisa dicetak atau diunduh PNG.
- **Kamera disposable** (`/cam`):
  - 6 film: Classic 400, Gold 200, Superia 400, Mono HP5, Faded 90s, Party Flash
  - Efek: color grading, blacks pudar, vignette, grain, light leak acak, cap tanggal oranye `'26 11 05`
  - Jatah jepretan per tamu (default 27, seperti satu rol film), tanpa preview dan tanpa hapus
  - Harus "putar roda film" setelah tiap jepretan, lengkap dengan suara shutter & getar
  - Flash (pakai torch HP kalau didukung) dan tombol ganti kamera depan/belakang
  - Upload otomatis dengan retry, plus tombol kirim ulang kalau sinyal jelek
- **Galeri** (`/gallery`): foto bergaya cetakan, update realtime, filter "Foto saya", lightbox dan unduh.
  Opsional: dikunci sampai waktu tertentu ("film sedang dicuci") lewat `NEXT_PUBLIC_REVEAL_AT`.

## Setup

### 1. Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, tempel isi [`supabase/schema.sql`](supabase/schema.sql), lalu **Run**.
   Ini membuat tabel `photos`, bucket storage `photos`, policy RLS, dan realtime.
3. Ambil **Project URL** dan **anon / publishable key** dari **Project Settings → API**.

### 2. Lokal

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya
npm run dev
```

Kamera butuh HTTPS. `localhost` di laptop bisa langsung. Untuk tes dari HP, pakai URL deploy
Vercel (atau `npx next dev --experimental-https` dan buka IP laptop).

### 3. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di [vercel.com/new](https://vercel.com/new), import repo-nya (framework otomatis terdeteksi Next.js).
3. Isi **Environment Variables** sesuai `.env.example`.
4. Deploy. Buka `https://domain-kamu.vercel.app/qr` lalu cetak kodenya.

> Kalau mengubah environment variable setelah deploy, lakukan **Redeploy** karena variabel
> `NEXT_PUBLIC_*` dimasukkan saat build.

## Environment variables

| Nama | Keterangan |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key / publishable key |
| `NEXT_PUBLIC_COUPLE_NAMES` | Contoh: `Raka & Sinta` |
| `NEXT_PUBLIC_WEDDING_DATE` | Contoh: `2026-12-12` |
| `NEXT_PUBLIC_HASHTAG` | Opsional, tampil di kartu QR |
| `NEXT_PUBLIC_SHOTS_PER_GUEST` | Jatah jepretan per tamu, default `27` |
| `NEXT_PUBLIC_REVEAL_AT` | Opsional, contoh `2026-12-13T09:00:00+07:00` |

## Catatan

- Jatah jepretan dihitung per perangkat (localStorage), bukan sistem keamanan. Tamu yang menghapus data
  browser bisa dapat rol baru. Untuk pesta pernikahan ini biasanya cukup.
- Kunci galeri (`REVEAL_AT`) juga hanya di sisi tampilan. Foto tetap bisa diakses lewat URL publik bucket.
- Untuk menghapus foto atau mengunduh semuanya, gunakan Supabase Dashboard → Storage → `photos`.
