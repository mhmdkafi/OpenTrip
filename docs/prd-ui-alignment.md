# TripDash — penerapan revisi UI client

Acuan: PDF client 18 halaman yang dilampirkan pada 13 September 2026. Bagian “Revisi UI Design” halaman 16–18 menjadi acuan navigasi dan susunan layar. Teks dan gambar anotasi halaman 16/18 telah dibaca. Dokumen berisi dua rumusan MVP dengan perbedaan pada metode impor; bagian panduan coding di dalam dokumen diperlakukan sebagai referensi, bukan perintah untuk mengganti stack aplikasi.

| Bagian revisi | Implementasi |
| --- | --- |
| Navbar kiri | Empat menu: Overview, Trip Schedule, Cashflow, Inventory. Brand “TripDash.” dan “Rimbaloka Trip”; informasi admin di bawah. Tanpa label workspace, kartu slogan, atau menu peserta/absensi terpisah. |
| General | Navbar atas dihapus. Judul browser TripDash dan ikon bulat dari logo asli. Teks operasional, tanpa banner marketing atau ilustrasi gunung berulang. |
| Overview | Total trip, Done, On coming, Cancel, At risk; dropdown status menuju detail trip; kalender interaktif; ringkasan terbatas peserta, kas, dan barang menipis. |
| Trip Schedule | Impor spreadsheet di atas, filter minggu/bulan/tahun/semua waktu, bulan → minggu → trip. Detail berisi nama/tanggal/jumlah peserta, tarif, mepo, status, impor, peserta, dan tombol PDF. |
| Peserta & absensi | Nomor urut dan pagination 10 peserta. Tagihan Full/Non/add-on, DP/lunas, serta verifikasi rombongan menggunakan logika bersama. Semua peserta aktif masuk absensi; PDF diurutkan mepo lalu nama. |
| Cashflow | Default bulanan, pilihan minggu/tahun, grafik masuk/keluar, profit berbasis kas dan perubahan terhadap periode sebelumnya. Bulan → minggu → trip; transaksi dan CRUD pengeluaran baru terlihat di detail. CSV mengikuti hasil filter. |
| Inventory | Daftar berpagination 8 barang, foto opsional, nama, tersedia/total (atau jumlah tidak dicatat), edit/hapus. Penambahan stok, peminjaman/pengembalian, dan pemakaian barang habis pakai dipisah. Panel kanan hanya mengingatkan stok habis pakai. |

## Aturan data

- At risk dihitung untuk trip aktif dengan peserta aktif di bawah minimum dalam jendela hari sebelum keberangkatan. Nilai awal minimum 7 dan H-7; keduanya dapat diatur di form trip, termasuk minimum 9 untuk tujuan tertentu. Tanggal demo adalah 13 September 2026.
- Done berarti selesai manual atau tanggal keberangkatan sudah lewat. Cancel berarti pembatalan yang ditetapkan admin. Mengarsipkan trip masa depan tidak otomatis menandainya selesai.
- Persentase profit menggunakan `(sekarang - sebelumnya) / abs(sebelumnya)`. Jika pembanding nol, UI menjelaskan bahwa persentase belum tersedia; tidak menampilkan pertumbuhan palsu.
- Pemasukan tetap berasal dari pembayaran terverifikasi dengan timestamp pendaftaran. Editor pengeluaran tidak bisa mengubah/menghapus pemasukan. Perubahan dan penghapusan dicatat di audit.
- Harga yang memengaruhi peserta yang sudah membayar tidak bisa diubah. Titik mepo yang masih digunakan tidak bisa dihapus melalui edit trip.
- Barang yang masih dipinjam tidak bisa dihapus atau diubah menjadi barang habis pakai. Pemakaian mengurangi stok total; pengembalian hanya berlaku untuk peminjaman.
- Field baru bersifat tambahan pada aggregate JSONB yang sudah dipakai aplikasi. Data lama tetap dapat dibaca menggunakan nilai default; tidak diperlukan migrasi destruktif.

## Batas prototipe dan integrasi

- Prototipe tetap memakai data fiktif dan localStorage, bukan data bisnis Supabase. Data demo yang sudah tersimpan tidak direset otomatis. Tombol Reset data simulasi memuat contoh terbaru, termasuk barang habis pakai.
- Impor URL Google Sheets yang sudah ada dipertahankan mengikuti overview awal dan tombol “impor spreadsheet” pada revisi terakhir. Bagian tengah PDF menyebut upload XLSX sebagai alternatif MVP; upload XLSX belum diterapkan oleh revisi UI ini.
- Di prototipe, tombol absensi membuka dialog cetak browser untuk Simpan sebagai PDF. Di dashboard terautentikasi, tombol mengunduh PDF dari server. Tidak ada halaman absensi terpisah dalam navigasi utama.
- Foto inventory dapat diunggah melalui edit barang (JPG/PNG/WebP ≤280 KB). Barang tanpa foto menampilkan placeholder, bukan foto produk yang dibuat-buat.
- Migrasi Supabase dan konfigurasi Google OAuth tetap diperlukan sebelum memakai integrasi live; lihat README. Revisi ini tidak mengaktifkan atau mengklaim keberhasilan koneksi tersebut.

## Verifikasi

`npm test` mencakup batas periode WIB, konsistensi total grafik, risiko trip, perubahan harga, perlindungan pemasukan, dan siklus stok. `node scripts/prd-smoke.mjs` menguji alur UI dan responsive menggunakan browser lokal. Tidak ada klaim pengujian pada perangkat fisik.

## Revisi lanjutan dari pengguna

Instruksi percakapan setelah review prototype memperbarui acuan UI sebelumnya:

- Status trip memiliki warna dan label konsisten: mendatang biru, selesai hijau, berisiko kuning, batal merah; diterapkan pada statistik, badge, dan kalender.
- Overview tidak lagi memuat teks “Seluruh perjalanan”, “Lihat perjalanan”, “Di bawah minimum peserta”, maupun tiga ringkasan operasional di bawah kalender.
- Impor hanya meminta tautan. Endpoint `/api/sync/import` mendeteksi baris header dan tab respons, membuat trip dari judul spreadsheet, serta mengimpor peserta secara atomik. Mengulang sumber yang sama memakai trip yang sudah ada. Header wajib yang tidak dikenali perlu diperbaiki di sumber.
- Tombol Buat Trip dihapus. Tanggal dan tarif yang belum tersedia harus dilengkapi melalui Edit trip; tanggal pendaftaran tidak dijadikan tanggal keberangkatan. Tagihan tanpa tarif belum ditandai ditinjau.
- Cashflow menampilkan saldo awal/akhir dari transaksi tercatat, kategori pengeluaran, saldo berjalan trip, dan tagihan/sisa pembayaran peserta. Ringkasan pembayaran mencakup seluruh trip dan dibedakan dari filter periode kas.
- Inventory menyimpan uraian peminjaman dan catatan kejadian, misalnya “Tenda hilang”. Kejadian dapat berupa catatan saja, hilang, atau rusak. Jumlah tetap digunakan untuk integritas stok; barang hilang dari peminjaman tidak dapat dikembalikan lagi.
- Halaman awal menuju login. Sidebar demo menyediakan Login akun dan Keluar demo; sidebar akun bisnis menyediakan Logout langsung. Keluar demo tidak menghapus data simulasi. Autentikasi bisnis tetap memakai Supabase, dan belum diverifikasi dengan kredensial akun live pada revisi ini.

## Revisi kalender, profil, dan inventory

- Sel kalender dengan perjalanan kini berwarna sesuai status, disertai legenda. Jika beberapa status berada pada tanggal yang sama, prioritas warna adalah At risk, On coming, Cancel, lalu Done; label masing-masing trip tetap tersedia.
- Tombol ringkas/perluas sidebar dipindahkan ke tepi. Profil administrator dapat dibuka dari nama/avatar; nama dan nomor telepon bisa diedit. Profil prototype disimpan di browser, sedangkan akun bisnis menggunakan metadata pengguna Supabase melalui endpoint terautentikasi.
- Inventory menampilkan kartu dengan foto 190–230 px dan dialog pembesaran. Form tambah/edit dibagi menjadi foto, identitas, cara pencatatan, dan stok. Upload JPG/PNG/WebP menerima hingga 8 MB lalu dioptimalkan di browser, dengan batas hasil sesuai penyimpanan gambar yang sudah ada.
- Prototype kini benar-benar membaca spreadsheet publik melalui endpoint stateless, bukan menggunakan respons contoh. Endpoint tersebut tidak menyimpan data bisnis ke Supabase. Impor dashboard tetap membutuhkan autentikasi; spreadsheet publik dapat dibaca tanpa Google OAuth, sementara sumber privat menggunakan koneksi Google.
- Nama, volume, tanggal keberangkatan, tarif, lokasi, rekening, dan mepo dibaca bila tersedia dalam judul, header/kolom, atau baris informasi sebelum header. Detail admin yang sudah terisi dipertahankan. Timestamp pendaftaran tidak pernah dijadikan tanggal keberangkatan.
- Locale spreadsheet digunakan untuk urutan tanggal. Contoh client menggunakan en_US sehingga tanggal seperti 8/14/2026 dipahami sebagai 14 Agustus 2026.
- Tautan contoh Malabar Vol 12 telah diuji langsung: 19 pendaftaran, 21 peserta, tarif jas hujan Rp15.000, dan impor ulang tidak menggandakan peserta. Tanggal keberangkatan serta tarif Full/Non tidak tersedia di sumber tersebut; admin perlu menambahkannya di sumber atau detail trip.
- Verifikasi: 202 tes unit, build, tes browser lintas halaman, serta tes khusus profil/foto inventory/responsif. Penyimpanan profil Supabase belum diuji dengan kredensial akun live.

## Revisi grafik profit bersih — 16 September 2026

- Grafik batang pemasukan/pengeluaran diganti dua garis profit bersih: periode terpilih dan periode sebelumnya.
- Bulanan membandingkan nilai harian berdasarkan tanggal; tahunan membandingkan nilai bulanan Januari–Desember. Grafik hanya tampil pada ringkasan bulanan/tahunan, tanpa grafik pada mingguan dan detail trip.
- Angka mengikuti transaksi tercatat dan batas tanggal WIB. Nilai negatif tetap terlihat; tanggal yang tidak ada pada bulan pembanding ditandai tidak tersedia. Nilai grafik bukan saldo kumulatif.
- Grafik dapat dipilih dengan pointer, sentuhan, atau slider keyboard; tabel menyediakan angka kedua periode dan selisih.
- Verifikasi revisi ini: 207 tes lolos, build berhasil, lint tanpa error (dua warning library yang sudah ada), smoke test cashflow dan lintas halaman lolos; layout diperiksa pada 375/768/1024/1440 px.

## Penyederhanaan grafik — 16 September 2026

- Garis profit bersih kini menampilkan akumulasi dari awal bulan/tahun, sehingga perubahan setelah transaksi dan jarak antara dua periode mudah dibandingkan.
- Dua ringkasan hasil akhir ditempatkan di atas grafik. Pemilihan titik menggunakan pilihan tanggal/bulan yang dapat dipakai lewat keyboard maupun sentuhan; angka pada titik terpilih berada langsung di bawah grafik.
- Rentang sumbu memakai interval rapi dan garis nol tetap terlihat. Angka/tabel dan label grafik menyatakan bahwa hasilnya akumulatif.
