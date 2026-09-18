# TripDash

Dashboard operasional Rimbaloka Trip. Acuan UI terbaru adalah **Product Requirements Document (PRD) TripDash.pdf**, bagian **Revisi UI Design, halaman 16–18**. Pemetaan perubahan dan keputusan implementasi ada di `docs/prd-ui-alignment.md`.

## Mencoba prototipe UI Rimbaloka

Jalankan `npm run dev`, lalu buka `http://localhost:3000/prototype`. Halaman `/` juga mengarah ke prototipe. Login untuk data bisnis tetap tersedia di `/login`, dan dashboard bisnis di `/dashboard` tetap dilindungi autentikasi.

Prototipe tidak memerlukan Supabase atau OAuth Google. Empat menu utama memakai komponen yang sama dengan dashboard bisnis: Overview, Trip Schedule, Cashflow, dan Inventory. Peserta dan cetak absensi ada di detail trip (`/prototype/trips/:tripId`). Navbar atas dihapus; identitas admin berada di bagian bawah navigasi kiri. Logo asli tersimpan di `public/brand/rimbaloka-logo.jpeg`; ikon browser berbentuk bulat.

Data simulasi mengikuti struktur 19 respons/21 peserta dan tarif pada lampiran. Nama, transaksi, jadwal, dan stok bersifat fiktif; tidak menyertakan nomor telepon, kesehatan, alamat, atau bukti transfer pribadi. Perubahan prototipe tersimpan di localStorage browser dengan tombol reset. Pembayaran, pengeluaran, trip, dan stok dapat dicoba; koneksi dan sinkronisasi Google disimulasikan, tidak menghubungi API. Absensi prototipe menggunakan dialog cetak browser dengan pilihan Simpan sebagai PDF, dan diberi label SIMULASI.

Smoke test browser: jalankan aplikasi, kemudian `node scripts/prd-smoke.mjs`. Default test memakai port 3012; set `PROTOTYPE_URL` sesuai server yang berjalan. Tes memeriksa empat menu, detail trip, pagination peserta, pembayaran grup, absensi 21 peserta urut mepo, mapping spreadsheet, CRUD inventory, peminjaman/pengembalian/pemakaian, CRUD pengeluaran, grafik dan penelusuran Cashflow, CSV, persistensi, serta layar 375/768/1024/1440px dan landscape 812×375. Screenshot ada di `artifacts/prd-*.png`. Script smoke lama meneruskan ke pemeriksaan ini.

## Menjalankan

1. `npm ci`
2. Salin `.env.example` ke `.env` dan isi URL, publishable key, serta secret key Supabase milik proyek. Secret hanya dipakai server.
3. Jalankan **berurutan** `supabase/migrations/0001_auth_tenant.sql` dan `supabase/migrations/0002_tripdash_workspace.sql` melalui SQL Editor proyek Supabase. Untuk proyek yang sudah menjalankan 0001, cukup 0002. Migrasi tidak mengimpor data contoh.
4. `npx playwright install chromium` untuk generator PDF.
5. `npm run dev`, buka `http://localhost:3000/login`, daftar akun admin bisnis, konfirmasikan email jika diminta, lalu login.

## Mengaktifkan Google Sheets

1. Aktifkan Google Sheets API pada proyek Google Cloud.
2. Konfigurasikan OAuth consent screen dan tambahkan akun penguji apabila aplikasi masih Testing.
3. Buat OAuth client bertipe Web Application. Daftarkan redirect URI persis sama dengan `GOOGLE_REDIRECT_URI`, contoh `http://localhost:3000/api/google/callback`.
4. Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`. Buat kunci 32 byte dengan `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` lalu simpan sebagai `GOOGLE_TOKEN_ENCRYPTION_KEY`. Pertahankan kunci ini ketika deploy ulang; menggantinya mengharuskan koneksi Google diulang.
5. Login → Pengaturan → Hubungkan akun Google yang dapat membaca spreadsheet privat.
6. Trip → buat trip dan konfirmasi tarif → pilih trip → tempel URL spreadsheet → preview → pilih tab/baris header → konfirmasi mapping → sinkronkan.

Token refresh dienkripsi AES-256-GCM dan disimpan per ruang kerja, tidak dikirim ke browser. Scope `spreadsheets.readonly` memberi akses baca spreadsheet yang diizinkan akun. Aplikasi tidak menulis spreadsheet. Foto bukti dibuka pada viewer Drive menggunakan izin akun pengguna; tidak ada OCR atau pemeriksaan keaslian otomatis.

Referensi implementasi: [Google OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server), [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser).

## Fitur sesuai PRD client

- Satu jenis admin, login Supabase dan pemeriksaan keanggotaan bisnis di server.
- Trip dan tarif Full/Non Transport/jas hujan; arsip trip.
- Impor Google Sheets dengan mapping, split nama `+`, koma, dan baris baru. Respons berbeda dipisah dari peserta. Sinkron ulang tidak menggandakan respons identik; perubahan ambigu ditampilkan untuk diperiksa dan data lama dipertahankan.
- Tabel pencarian, filter trip/MEPO/fasilitas/status, pengurutan dan pagination 50 baris. Koreksi per peserta dan konfirmasi kuantitas jas hujan.
- Verifikasi nominal DP/lunas, kandidat rombongan dari file Drive yang sama, satu transfer menjadi satu kas. Alokasi grup mengikuti urutan peserta yang ditampilkan hingga sisa terpenuhi; kelebihan dipisahkan dari alokasi. Lunas ditolak jika nilai belum mencukupi.
- Kas masuk menggunakan timestamp pendaftaran sesuai **PRD client §6.5**, bukan tanggal verifikasi. Untuk satu transfer lintas booking, timestamp paling awal dipakai dan ditampilkan sebelum persetujuan. DP terverifikasi juga masuk kas. Aturan ini perlu dikonfirmasi client saat UAT karena PRD tidak merinci DP/lintas-booking.
- Pengeluaran kategori bebas, gabungan filter trip/minggu/bulan/tahun berbasis WIB. Surplus kas tidak dinyatakan sebagai saldo rekening atau laba akuntansi.
- PDF absensi enam kolom untuk seluruh peserta aktif, termasuk belum bayar; nama dan MEPO wajib lengkap. PDF tidak diganti diam-diam dengan HTML saat Chromium gagal.
- Inventaris operasional/sewaan, stok total/rusak/tersedia, peminjaman per trip dan pengembalian, validasi stok tidak negatif.
- Riwayat aktivitas dan request ID persisten untuk retry pembayaran dan perubahan stok.

## Penyimpanan dan batas implementasi

Data operasional MVP disimpan sebagai aggregate JSONB per tenant pada `tripdash_workspaces`. Penulisan hanya melalui backend tervalidasi menggunakan service role, dengan conditional update `tenant_id + revision`; satu perubahan menyimpan pembayaran, alokasi, kas, audit dan request ID secara atomik. RLS membatasi pembacaan langsung ke anggota tenant dan melarang penulisan browser. Token Google berada di tabel privat terpisah.

Pilihan aggregate ini menghindari penyimpanan prototipe di memori dan mencegah konflik diam-diam, tetapi belum di-benchmark untuk beban besar. Seluruh workspace dimuat ke browser; pagination dilakukan di sisi browser. Untuk skala besar, migrasikan ke tabel entitas terpisah dan pagination server. Skema Drizzle dan helper ledger lama belum menjadi jalur penyimpanan aplikasi ini. API mutasi utama adalah `POST /api/workspace`; beberapa endpoint prototipe lama mengembalikan 410 atau menerima kontrak baru.

Sinkronisasi berjalan manual, maksimal 5.000 respons per impor. Identitas sumber ambigu diperingatkan dan tidak ditimpa otomatis; belum ada UI rekonsiliasi khusus. File bukti tidak diunduh/cache oleh server. Refund, perubahan tarif setelah pembayaran, rekonsiliasi alokasi lanjutan, job terjadwal, WhatsApp, payment gateway, dan AI deteksi struk tidak diimplementasikan pada lingkup client ini.

## Verifikasi

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

Smoke test UI memakai `node scripts/prototype-smoke.mjs` seperti petunjuk prototipe di atas. Pemeriksaan revisi navigasi, kalender, filter stok, pencarian transaksi, dan layout desktop/tablet/mobile tersedia lewat `node scripts/ui-revision-smoke.mjs` dengan konfigurasi `PROTOTYPE_URL` yang sama. Ini tidak menggantikan UAT integrasi live.

Uji domain baru di `src/lib/workspace/workspace.test.ts`: 19 respons/21 peserta, sinkron ulang dan reorder, DP/pelunasan, satu kas grup, kelebihan alokasi, penolakan tagihan belum pasti, batas minggu WIB, sumber berubah, stok keluar/kembali, dan validasi URL.

UAT dengan Supabase dan Google nyata wajib dilakukan setelah migrasi serta konfigurasi OAuth tersedia: login, buat trip, impor respons client, verifikasi bukti, cek kas, pinjam/kembalikan inventaris, lalu unduh PDF. Tes lokal tidak membuktikan integrasi live atau isolasi RLS pada database yang belum dimigrasikan.
