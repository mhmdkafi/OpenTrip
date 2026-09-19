# Auth, tenant, dan Google import

Login `/login` menggunakan Supabase; registrasi publik telah dihapus. Semua route bisnis memanggil `requireWorkspace()` untuk memverifikasi pengguna aktif, role, dan membership. `workspace_id` adalah alias `tenant_id` karena satu tenant memiliki satu workspace. Header workspace dari browser tidak dipercaya. Session JSON menyediakan workspace aktif dan daftar membership; pergantian workspace di Pengaturan memuat ulang state dengan key tenant baru.

## Owner dan pengguna

1. Owner aktif adalah `admin@gmail.com`, bernama **Owner Trip**, pada workspace **Rimbaloka Trip**. Akun dan membership owner sudah dibuat serta diverifikasi setelah workspace lama dihapus. Password tidak disimpan dalam dokumentasi.
2. Migrasi [0004_owner_admin.sql](../supabase/migrations/0004_owner_admin.sql) merupakan riwayat setup role awal dan masih menyebut akun owner lama. Jangan menjalankannya ulang untuk mengganti owner aktif. Pada database baru, sesuaikan akun bootstrap dan workspace tujuan sebelum menjalankan migrasi 0004 setelah migrasi 0001–0003.
3. Di konfigurasi Auth Supabase, matikan **Allow new users to sign up** untuk menutup registrasi langsung melalui API Supabase juga. Pembuatan akun oleh server menggunakan Admin API tetap tersedia.
4. Login sebagai owner, buka **Pengguna** di bawah **Inventory**, lalu **Tambah admin**. Isi nama, email, dan password awal minimal 6 karakter. Sampaikan kredensial kepada pengguna; aplikasi tidak mengirim email undangan.

Owner dan admin dapat melihat daftar pengguna workspace aktif. Hanya owner dapat menambah admin; server menetapkan role dan workspace sehingga browser tidak dapat memilih role owner atau tenant lain. Email yang sudah terdaftar ditolak. Service key Supabase harus tersedia di server dan tidak boleh dikirim ke browser. Migrasi dalam repository tidak otomatis dijalankan ke database hosting.

## Aktivasi

1. Jalankan migrasi 0001 dan 0002 jika belum tersedia, kemudian `supabase/migrations/0003_scheduled_sync.sql` di SQL Editor Supabase.
2. Isi konfigurasi server: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (URL aplikasi + `/api/google/callback`), `GOOGLE_TOKEN_ENCRYPTION_KEY` (32 byte acak, base64), dan `CRON_SECRET` (secret acak yang panjang). Jangan memakai prefix NEXT_PUBLIC untuk secret.
3. Aktifkan Google Sheets API dan daftarkan redirect URI serta akun penguji pada OAuth consent screen. Pengguna login aplikasi dahulu, kemudian hubungkan Google dari Pengaturan. OAuth Google menghubungkan akses Sheets ke workspace; bukan pengganti login Supabase.
4. Impor tautan Google Sheet dari Trip Schedule. Koneksi Google wajib, termasuk untuk Sheet publik. Pilihan gid menentukan tab; tanpa gid aplikasi mencari tab respons. Maksimal 5.000 respons per sumber.
5. Aktifkan jadwal di Pengaturan. `vercel.json` memanggil worker tiap 15 menit pada deployment yang mendukung frekuensi tersebut. Pada hosting lain, konfigurasi scheduler eksternal untuk GET `/api/cron/sync` dengan `Authorization: Bearer <CRON_SECRET>`; jangan taruh secret di query string.

Worker mengambil satu workspace yang jatuh tempo per panggilan melalui SQL `FOR UPDATE SKIP LOCKED`, dengan lease 10 menit. Maksimal 10 sumber per workspace per job. Untuk banyak workspace, tingkatkan frekuensi panggilan worker atau gunakan antrean tambahan. Interval adalah waktu paling awal job layak dijalankan, bukan jaminan waktu selesai. Job gagal dicoba kembali pada interval berikutnya; crash dipulihkan setelah lease habis. `last_error` terlihat di Pengaturan. Route worker mempunyai durasi maksimum 300 detik; sesuaikan batas hosting.

## Token dan konflik

Access token dan refresh token disimpan sebagai AES-256-GCM di tabel privat per tenant. Access token dipakai sampai mendekati kedaluwarsa; refresh token memperbaruinya. OAuth state terikat pada pengguna dan tenant. Token tidak dikirim ke browser. Koneksi yang dicabut memerlukan otorisasi ulang, dan kegagalan OAuth tidak dialihkan diam-diam ke pembacaan publik.

Impor menyimpan snapshot mentah per booking. Timestamp dan nama harus sama serta kandidat harus tunggal sebelum update otomatis. Field kontak, MEPO, dan referensi bukti mengikuti Sheet hanya jika nilai lokal masih sama dengan snapshot. Edit lokal menang jika keduanya berubah. Identitas, fasilitas, kuantitas, dan tagihan berubah ditahan untuk review dengan data database dipertahankan. Transaksi tidak diubah oleh sync. Baris hilang tidak menghapus booking. Booking lama tanpa snapshot ditahan untuk review jika sumber berubah. Catatan review muncul pada hasil impor; koreksi dilakukan melalui detail trip. Pembayaran yang sudah diverifikasi tetap menggunakan bukti transaksi asal.

Setiap save memakai revision compare-and-swap. Konflik dengan edit pengguna menghasilkan 409, bukan menimpa perubahan. Scheduled sync memuat ulang workspace setelah jaringan selesai dan memvalidasi bahwa mapping belum berubah.

## Validasi operasional

Jalankan `npm run typecheck`, `npm run lint`, dan `npm run build`. Setelah migrasi serta OAuth diaktifkan, verifikasi dengan dua tenant: akses tenant lain ditolak, impor ulang tidak menggandakan booking, edit MEPO lokal bertahan saat Sheet berubah, perubahan tagihan ditandai review, dan dua pemanggilan cron bersamaan tidak mengambil job yang sama. Tanpa persetujuan OAuth dan migrasi di database target, pengujian lokal tidak membuktikan integrasi live.

Referensi: [Google OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server), [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser).
