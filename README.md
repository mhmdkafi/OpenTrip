# TripDash

Dashboard operasional internal **Rimbaloka Trip**, penyelenggara open trip pendakian di Bandung. Owner dan admin mengelola jadwal trip, peserta, pembayaran, cashflow, dan inventory dari satu tempat, tanpa bolak-balik antara Google Form, spreadsheet, dan screenshot transfer.

Konteks produk ada di [PRODUCT.md](PRODUCT.md), sistem desain (token warna, komponen, aturan layout) di [DESIGN.md](DESIGN.md).

## Fitur

**Overview**
- Ringkasan trip per bulan/tahun: total, done, cancelled, at risk, upcoming.
- Kalender trip dan daftar trip yang akan datang.
- Pengingat pesan WhatsApp yang perlu dikirim hari ini (H-1 keberangkatan).

**Trip Schedule**
- Jadwal per minggu/bulan/tahun dengan period stepper, pencarian, dan filter tanggal.
- Import pendaftaran dari Google Sheets yang dibagikan "Anyone with the link: Viewer". Nama trip, volume, harga, dan rekening dibaca dari judul/header sheet. Kolom yang dikenali: Timestamp, Nama Lengkap, Usia, Fasilitas, Mepo, Alamat, No WhatsApp, No Darurat, Riwayat penyakit, Jas Hujan, dan link bukti transfer. Import ulang tidak menggandakan respons dan tidak menimpa koreksi admin.
- Detail trip: harga, meeting point, rekening, status operasional, ringkasan pembayaran, daftar peserta, dan PDF absensi.

**Peserta dan pembayaran**
- Data peserta lengkap: usia, alamat, nomor WhatsApp, kontak darurat, dan riwayat penyakit (hanya terlihat admin; ikon ❤️ menandai peserta yang punya catatan).
- **Payment review**: antrean bukti transfer. Nominal dibaca otomatis dengan OCR (tesseract.js) dan tampil satu per satu saat terbaca; admin tinggal approve, reject, atau isi nominal lain. Bukti dari satu transfer untuk beberapa peserta digabung.
- **Record payment** untuk pembayaran tunai atau transfer di luar form, dengan tampilan yang sama.
- Klik nominal di kolom Paid untuk membuka bukti transfer kapan saja, termasuk yang sudah diverifikasi.
- Kelebihan bayar dicatat terpisah dan ditandai di tabel ("+Rp X over").

**Reminder WhatsApp (H-1)**
- Sehari sebelum berangkat, detail trip menampilkan peserta yang belum lunas atau kelebihan bayar, lengkap dengan Bill, Paid, dan Balance/Overpaid.
- Tombol **Send WhatsApp** membuka chat (wa.me) dengan pesan terisi; admin yang menekan kirim dari WhatsApp-nya sendiri. Yang sudah dikirim ditandai beserta waktunya.
- Dua template (pelunasan dan kelebihan bayar) bisa diedit dengan placeholder `{name} {trip} {date} {meeting_point} {bill} {paid} {balance} {excess} {bank}`. Emoji dibuang otomatis karena tidak terbawa dengan benar lewat link WhatsApp.

**Cashflow**
- Pemasukan, pengeluaran, dan net profit per bulan/tahun dengan perbandingan opsional ke periode lain.
- Rekap per trip dan per minggu; detail trip berisi transaksi, pembayaran peserta, dan kategori pengeluaran. Export CSV.

**Inventory**
- Barang yang dipinjamkan (returnable) dan habis pakai (consumable), stok rusak, pinjaman per trip, insiden.
- Barang habis pakai hanya menampilkan sisa stok dan tidak punya hitungan rusak. Stok rendah dan habis diberi warna, dan panel Low stock menampilkan foto barang.

**Pengguna**
- Owner menambah admin dari menu Users. Registrasi publik tidak tersedia.

## Teknologi

- **Next.js 16** (App Router, Turbopack) dan **React 19**. Versi Next ini punya perubahan besar dari versi lama; baca `node_modules/next/dist/docs/` sebelum mengubah konvensi framework.
- **Supabase** untuk auth (email/password dan Google) dan database Postgres.
- **tesseract.js** untuk OCR nominal transfer, **sharp** untuk thumbnail foto, **pdf-lib** untuk PDF absensi.
- **zod** untuk validasi setiap perintah dari browser.
- CSS biasa dengan token desain di `src/styles/tokens.css` (lihat DESIGN.md); font Poppins.

## Menjalankan secara lokal

Butuh Node.js 20 atau lebih baru dan proyek Supabase.

1. Install dependency:
   ```bash
   npm ci
   ```
2. Salin `.env.example` ke `.env`, lalu isi URL, publishable key, dan secret key Supabase. Secret key hanya dipakai server.
3. Jalankan migrasi di SQL Editor Supabase secara berurutan: `supabase/migrations/0001` sampai `0004`. Migrasi tidak membuat data contoh.
4. Siapkan owner. Cara termudah: aktifkan provider Google di Supabase → Authentication → Providers (redirect ke `<url-aplikasi>/auth/callback`), isi `OWNER_EMAIL`, lalu login dengan Google memakai email itu; akun tersebut menjadi owner workspace baru. Alternatifnya, buat akun Auth dan tenant manual lalu jalankan `supabase/bootstrap-owner.sql`.
5. Di Supabase → Authentication, matikan **Allow new users to sign up** supaya akun hanya bisa dibuat owner.
6. Jalankan:
   ```bash
   npm run dev
   ```
   lalu buka http://localhost:3000/login.

### Data contoh (opsional)

```bash
npm run seed -- --reset                # trip, peserta, pembayaran contoh (Jan 2025 – Okt 2026)
npm run seed -- --proofs=bukti.csv     # sekaligus pasang link bukti transfer dari file berisi link Google Drive
npm run seed:inventory                 # inventory contoh dengan foto dari Wikimedia Commons
```

`--reset` menghapus semua trip non-contoh beserta peserta, pembayaran, dan cashflow-nya. Inventory dan akun tidak disentuh. Tanpa `--reset`, hanya trip contoh yang diganti.

## Script

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server development |
| `npm run build` / `npm start` | Build dan jalankan versi production |
| `npm test` | Semua test (`src/**/*.test.ts` dan `tests/*.test.ts`) |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run lint` | ESLint |
| `npm run check:integration` | Cek kesiapan Supabase (read-only, tidak mengubah data) |
| `npm run seed`, `npm run seed:inventory` | Data contoh, lihat di atas |

## Struktur

```
src/
  app/                    Halaman (login, dashboard/*) dan API route
    api/workspace         Satu-satunya jalur perubahan data (POST perintah)
    api/sync/import       Import Google Sheets
    api/payments/scan     OCR bukti transfer, hasil di-stream per bukti
    api/inventory/.../photo  Foto barang dengan cache dan thumbnail
    api/attendance/export PDF absensi
  components/tripdash/    Komponen layar (overview, trips, participants, finance, inventory, ...)
  lib/workspace/          Model data, perintah, import, reminder, tampilan keuangan
  lib/auth/               Session, membership, proxy
  lib/ocr/, lib/pdf/      OCR nominal dan PDF absensi
  styles/                 tokens.css, components.css, dan CSS per halaman
supabase/                 Migrasi dan bootstrap owner
scripts/                  Seed data dan cek integrasi
tests/                    Test integrasi (auth, database dengan PGlite, import)
```

## Cara data disimpan

Semua data operasional satu workspace disimpan sebagai satu dokumen JSON (`tripdash_workspaces.data`) dengan nomor `revision`.

- Browser tidak menulis langsung ke database. Setiap perubahan dikirim sebagai perintah ke `POST /api/workspace`, divalidasi zod, dijalankan di server (`applyCommand`), lalu disimpan dengan pengecekan revision. Kalau orang lain menyimpan lebih dulu, permintaan ditolak (409) supaya tidak ada perubahan yang tertimpa diam-diam.
- Setiap perintah punya request ID, jadi retry tidak menggandakan pembayaran atau perubahan stok. Riwayat tersimpan di audit log.
- Server menyimpan salinan workspace terakhir per proses dan hanya mengecek nomor revision sebelum memakainya lagi, sehingga halaman tidak perlu mengunduh ulang seluruh dokumen.
- Foto inventory disimpan di dokumen yang sama, tapi browser hanya menerima URL dan thumbnail kecil.
- Pemasukan peserta dicatat dengan tanggal pendaftaran; kelebihan bayar disimpan sebagai dana yang tidak dialokasikan ke tagihan.

Desain satu dokumen ini sederhana dan aman untuk skala Rimbaloka (ribuan peserta, ukuran beberapa MB). Kalau data tumbuh jauh lebih besar, langkah berikutnya adalah memisahkan foto dan riwayat ke tabel sendiri.

## Batasan

- Import hanya membaca spreadsheet yang dibagikan publik (Viewer). Tidak ada sinkronisasi terjadwal; import ulang dilakukan manual dari Trip Schedule.
- OCR membantu membaca nominal, tapi tidak memeriksa keaslian bukti. Admin tetap harus melihat buktinya sebelum approve.
- Reminder WhatsApp tidak terkirim otomatis; admin menekan kirim di WhatsApp. Integrasi WhatsApp Business API belum ada.
- Refund kelebihan bayar dicatat di luar aplikasi.
