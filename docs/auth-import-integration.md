# Auth, tenant, dan Google import

Login `/login` menggunakan Supabase; registrasi publik telah dihapus. Semua route bisnis memanggil `requireWorkspace()` untuk memverifikasi pengguna aktif, role, dan membership. `workspace_id` adalah alias `tenant_id` karena satu tenant memiliki satu workspace. Header workspace dari browser tidak dipercaya. Session JSON menyediakan workspace aktif dan daftar membership; pergantian workspace di Pengaturan memuat ulang state dengan key tenant baru.

## Owner dan pengguna

1. Owner aktif adalah `admin@gmail.com`, bernama **Owner Trip**, pada workspace **Rimbaloka Trip**. Akun dan membership owner sudah dibuat serta diverifikasi setelah workspace lama dihapus. Password tidak disimpan dalam dokumentasi.
2. Migrasi [0004_owner_admin.sql](../supabase/migrations/0004_owner_admin.sql) hanya menyiapkan role dan kebijakan akses. Tidak ada email owner, perubahan password, atau promosi akun otomatis. Untuk database baru saja, buat akun Auth dan tenant, lalu isi dua UUID di [bootstrap-owner.sql](../supabase/bootstrap-owner.sql). Bootstrap menolak workspace yang sudah memiliki owner.
3. Di konfigurasi Auth Supabase, matikan **Allow new users to sign up** untuk menutup registrasi langsung melalui API Supabase juga. Pembuatan akun oleh server menggunakan Admin API tetap tersedia.
4. Login sebagai owner, buka **Pengguna** di bawah **Inventory**, lalu **Tambah admin**. Isi nama, email, dan password awal minimal 6 karakter. Sampaikan kredensial kepada pengguna; aplikasi tidak mengirim email undangan.

Owner dan admin dapat melihat daftar pengguna workspace aktif. Hanya owner dapat menambah admin; server menetapkan role dan workspace sehingga browser tidak dapat memilih role owner atau tenant lain. Email yang sudah terdaftar ditolak. Service key Supabase harus tersedia di server dan tidak boleh dikirim ke browser. Migrasi dalam repository tidak otomatis dijalankan ke database hosting.

## Aktivasi

1. Database baru: jalankan migrasi [0001](../supabase/migrations/0001_auth_tenant.sql), [0002](../supabase/migrations/0002_tripdash_workspace.sql), [0003](../supabase/migrations/0003_scheduled_sync.sql), dan [0004](../supabase/migrations/0004_owner_admin.sql) berurutan di SQL Editor Supabase. Pada database yang sudah memiliki tabel dasar, jalankan 0003–0004 untuk menyelaraskan fungsi scheduler, role, dan kebijakan akses dengan kode ini. Keduanya mempertahankan data serta role owner yang sudah ada. Keberadaan tabel belum membuktikan isi fungsi dan kebijakan RLS sudah sama.
2. Isi konfigurasi server: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (URL aplikasi + `/api/google/callback`), `GOOGLE_TOKEN_ENCRYPTION_KEY` (32 byte acak, base64), dan `CRON_SECRET` (secret acak yang panjang). Jangan memakai prefix NEXT_PUBLIC untuk secret.
3. Aktifkan Google Sheets API dan daftarkan redirect URI serta akun penguji pada OAuth consent screen. Pengguna login aplikasi dahulu, kemudian hubungkan Google dari Pengaturan. OAuth Google menghubungkan akses Sheets ke workspace; bukan pengganti login Supabase.
4. Impor tautan Google Sheet dari Trip Schedule. Koneksi Google wajib, termasuk untuk Sheet publik. Pilihan gid menentukan tab; tanpa gid aplikasi mencari tab respons. Maksimal 5.000 respons per sumber.
5. Setelah Google terhubung dan sedikitnya satu sumber sudah diimpor, aktifkan jadwal di Pengaturan. `vercel.json` memanggil worker tiap 15 menit pada deployment yang mendukung frekuensi tersebut. Pada hosting lain, konfigurasi scheduler eksternal untuk GET `/api/cron/sync` dengan `Authorization: Bearer <CRON_SECRET>`; jangan taruh secret di query string. `next dev` dan `next start` tidak menjalankan jadwal Vercel secara otomatis.

Worker mengambil satu workspace yang jatuh tempo per panggilan melalui SQL `FOR UPDATE SKIP LOCKED`, dengan lease 10 menit. Maksimal 10 sumber per workspace per job. Untuk banyak workspace, tingkatkan frekuensi panggilan worker atau gunakan antrean tambahan. Interval adalah waktu paling awal job layak dijalankan, bukan jaminan waktu selesai. Job gagal dicoba kembali pada interval berikutnya; crash dipulihkan setelah lease habis. `last_error` terlihat di Pengaturan. Route worker mempunyai durasi maksimum 300 detik; sesuaikan batas hosting.

## Token dan konflik

Access token dan refresh token disimpan sebagai AES-256-GCM di tabel privat per tenant. Access token dipakai sampai mendekati kedaluwarsa; refresh token memperbaruinya. OAuth state terikat pada pengguna dan tenant. Token tidak dikirim ke browser. Koneksi yang dicabut memerlukan otorisasi ulang, dan kegagalan OAuth tidak dialihkan diam-diam ke pembacaan publik.

Impor menyimpan snapshot mentah per booking. Timestamp dan nama harus sama serta kandidat harus tunggal sebelum update otomatis. Dua baris dengan identitas sama tetapi isi berbeda ditahan untuk review. Field kontak, MEPO, dan referensi bukti mengikuti Sheet hanya jika nilai lokal masih sama dengan snapshot. Edit lokal menang jika keduanya berubah. Identitas, fasilitas, kuantitas, dan tagihan berubah ditahan untuk review dengan data database dipertahankan. Koreksi tagihan peserta yang belum bayar juga dipertahankan. Transaksi tidak diubah oleh sync. Baris hilang tidak menghapus booking. Booking lama tanpa snapshot ditahan untuk review jika sumber berubah atau fingerprint lama tidak dapat dicocokkan. Fingerprint membedakan huruf besar/kecil pada ID bukti Drive. Catatan review muncul pada hasil impor; koreksi dilakukan melalui detail trip. Pembayaran yang sudah diverifikasi tetap menggunakan bukti transaksi asal.

Setiap save memakai revision compare-and-swap. Konflik dengan edit pengguna menghasilkan 409, bukan menimpa perubahan. Scheduled sync memuat ulang workspace setelah jaringan selesai dan memvalidasi bahwa mapping belum berubah.

## Validasi operasional

Jalankan `npm test`, `npm run typecheck`, `npm run lint`, dan `npm run build`. Tes memakai PostgreSQL lokal terisolasi melalui PGlite, dua tenant, serta respons OAuth tiruan. Cakupan: RLS, akun nonaktif, pembatasan role, CAS, klaim/lease dan pemulihan job, penolakan cron tanpa secret, re-sync, koreksi lokal, serta OAuth gagal tanpa fallback publik. PGlite mengeksekusi kueri secara serial; tes ini tidak mengklaim membuktikan konkurensi multi-koneksi pada hosting.

`npm run check:integration` memeriksa Supabase secara read-only: keberadaan kolom, fungsi scheduler pada API, jumlah koneksi Google, jadwal aktif, dan status registrasi publik. Perintah tidak memanggil worker, mengimpor data, atau menampilkan kredensial. Exit code 1 berarti masih ada prasyarat yang belum terpenuhi. Pemeriksaan struktur melalui REST tidak mengaudit definisi RLS atau isi fungsi SQL di hosting.

Setelah migrasi serta OAuth diaktifkan, verifikasi dengan dua tenant live: akses tenant lain ditolak, impor ulang tidak menggandakan booking, edit MEPO lokal bertahan saat Sheet berubah, perubahan tagihan ditandai review, dan dua pemanggilan cron bersamaan tidak mengambil job yang sama. Tanpa persetujuan OAuth dan migrasi di database target, pengujian lokal tidak membuktikan integrasi live.

### Hasil pemeriksaan 20 September 2026

- 23 tes otomatis, typecheck, lint, dan build berhasil.
- Enam tabel yang dipakai Auth/Import dan fungsi `claim_tripdash_sync_job` tersedia pada Supabase target. Variabel konfigurasi terisi; kunci enkripsi memiliki panjang yang benar. Persetujuan Google belum diuji.
- Koneksi Google tersimpan: **0**. Jadwal aktif: **0**. Registrasi publik Supabase: **masih terbuka**.
- Migrasi baru belum diterapkan ke hosting: `DATABASE_URL` lokal masih contoh, dan kredensial manajemen/SQL target tidak tersedia. Pemeriksaan ini hanya menggunakan API baca Supabase.
- Langkah operasional yang tersisa: terapkan 0003–0004 di SQL Editor, matikan **Allow new users to sign up**, login lalu hubungkan Google di Pengaturan, impor sumber, dan aktifkan jadwal. Persetujuan Google harus dilakukan pemilik akun melalui browser; aplikasi tidak dapat menyetujuinya sendiri.

Referensi: [Google OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server), [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgreSQL row locking](https://www.postgresql.org/docs/current/sql-select.html), [PGlite API](https://pglite.dev/docs/api).
