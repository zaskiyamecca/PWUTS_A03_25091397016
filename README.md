# PWUTS_A03_25091397016

**UTS Pemrograman Web - Sistem Reservasi Tempat dan Pemesanan Menu**
Program Studi Manajemen Informatika, Fakultas Vokasi, Universitas Negeri Surabaya

| | |
|---|---|
| Nama | Zaskiya Dwi Adea Mecca |
| NIM | 25091397016 |
| Kelompok | A03 |
| Topik | Sistem Reservasi Tempat dan Pemesanan Menu (outlet contoh: Teman Setia Surabaya) |
| Bagian saya | **Sisi pelanggan**: cek ketersediaan meja dan reservasi mandiri + pre-order menu |

Anggota kelompok lain mengerjakan sisi yang berbeda (kasir/POS dan admin/menu) agar isi item 2.a, 2.b, dan 2.c tidak sama.

## Cara menjalankan

Halaman dimuat dengan **Ajax** (`jQuery .load()`). Cara terbaik adalah lewat **web server** agar Ajax berjalan sebenarnya:

- XAMPP/Laragon: salin folder ke `htdocs`/`www`, buka `http://localhost/PWUTS_A03_25091397016/`
- VS Code: ekstensi *Live Server* → Open with Live Server
- Python: `python -m http.server 8000` di dalam folder ini, lalu buka `http://localhost:8000`
- GitHub Pages: aktifkan di Settings → Pages (branch `main`)

Browser memblokir Ajax pada `file://` (klik dua kali `index.html`). Dalam kasus itu, `main.js` otomatis memakai **salinan fragmen** di `js/pages-fallback.js` sehingga situs tetap bisa dicoba. Berkas itu dihasilkan dari `pages/*.html`; setelah mengubah isi `pages/`, jalankan ulang `python tools/build_fallback.py`.

## Struktur folder

```
PWUTS_A03_25091397016/
├── index.html            # 2.a  layout utama + navigasi Ajax
├── pages/
│   ├── denah.html        # 2.b  denah & ketersediaan meja (fragmen)
│   └── reservasi.html    # 2.c  form reservasi + pre-order (fragmen)
├── css/style.css         # gaya + responsive (breakpoint 960 / 760 / 420 px)
├── js/
│   ├── data.js           # data simulasi (areas, tables, menus, reservations) + fungsi bantu
│   ├── main.js           # router Ajax, hash URL, menu mobile
│   ├── pages-fallback.js # salinan pages/*.html (hasil tools/build_fallback.py)
│   ├── denah.js          # logika halaman denah
│   └── reservasi.js      # logika & validasi form
├── tools/build_fallback.py
└── README.md
```

## Pemenuhan ketentuan

### 2.a - `index.html` (layout utama, responsive)
- HTML5 + CSS3 + JavaScript/jQuery 3.7.1 (CDN). Layout: header sticky, `<main id="content">`, footer.
- **Responsive**: CSS grid/flex dengan `auto-fit`, menu berubah menjadi hamburger di layar ≤ 760 px, grid meja menyesuaikan 4/3/2 kolom.
- Menu navigasi memakai **Ajax**: `Denah & Ketersediaan` dan `Reservasi & Pre-order` dimuat ke `#content` dengan `$.load()` tanpa reload halaman; ada indikator loading, penanganan error, dan hash URL (`#denah`, `#reservasi`) sehingga tombol Back/Forward berfungsi.
- Gambar: hero bergradasi coklat dan daftar menu berkategori (dibuat dari data `MENUS`), dengan tema coklat + krem dan font Nunito Sans.

### 2.b - `pages/denah.html` + `js/denah.js` (halaman interaktif)
Denah meja interaktif per area (Lt 1 Indoor, Lt 2 Indoor, Lt 2 Outdoor, Lt 2 VIP) mengikuti sistem referensi.
- Filter tanggal, jam, dan jumlah tamu; status tiap meja dihitung ulang seketika.
- Status berwarna: **kosong** (hijau), **direservasi** (kuning), **terisi** (biru), dan **kapasitas kurang** (abu-abu putus-putus).
- Ringkasan jumlah meja per status, tab area, panel detail meja (kapasitas, jadwal terisi hari itu).
- Tombol *Reservasi meja ini* membawa tanggal, jam, jumlah tamu, dan meja ke halaman form (terisi otomatis).
- Pencegahan bentrok memakai aturan: dua rentang waktu bertabrakan jika `mulaiA < selesaiB` dan `mulaiB < selesaiA` (durasi standar 2 jam).

### 2.c - `pages/reservasi.html` + `js/reservasi.js` (form + validasi)
Field mengikuti tabel `reservations` (+ `users` untuk kontak, `orders`/`order_items` untuk pre-order) pada proposal.

| Field | Aturan validasi (JavaScript/jQuery) |
|---|---|
| Nama tamu | wajib, min. 3 karakter, hanya huruf/spasi/titik/tanda hubung |
| Telepon | wajib, format Indonesia (`08…`, `62…`, `+62…`) |
| Email | wajib, format email valid |
| Tanggal | wajib, tidak boleh lampau, maks. 30 hari ke depan |
| Jam mulai | wajib, harus selesai sebelum jam tutup 22.00; untuk hari ini minimal 30 menit dari sekarang |
| Jumlah tamu | wajib, bilangan bulat 1-12, tidak melebihi kapasitas meja |
| Area & meja | wajib; daftar meja hanya berisi meja kosong dan cukup kapasitasnya; dicek ulang bentrok saat submit |
| Catatan | opsional, maks. 200 karakter (dengan penghitung) |
| Persetujuan | wajib dicentang |

Perilaku: validasi saat blur/change, pesan error per kolom, fokus ke kolom salah pertama, `aria-invalid` untuk aksesibilitas.
Pre-order: filter kategori, tombol +/−, estimasi tagihan otomatis (subtotal, **service 3%**, **pajak 10% dari subtotal+service**, total dibulatkan Rp100), sesuai aturan bisnis proposal.

Alur submit: `submit` ditahan (`preventDefault`) → semua aturan divalidasi → bila lolos dibuat **kode reservasi** (`RSV-xxxxx`, status `pending`) → payload JSON ditampilkan dan dicatat di console. Form sudah mengarah ke `proses_reservasi.php` (`method="post"`) untuk tahap implementasi server berikutnya; untuk UTS data disimpan di `localStorage` (tanpa backend), sehingga riwayat tampil, reservasi bisa **dibatalkan** (FR-06), dan meja yang dipesan langsung hilang dari pilihan (demonstrasi pencegahan double booking, FR-04).

## Catatan teknis
- Data reservasi awal dibuat otomatis relatif terhadap hari ini (seed pseudo-acak tetap) agar denah selalu terlihat terisi saat demo. Harga menu adalah contoh ilustrasi.
- Reservasi yang dibuat tersimpan di browser yang sama; hapus lewat DevTools → Application → Local Storage (kunci `tsRezervasiPelanggan`).
- Tidak ada framework CSS; seluruh gaya ditulis manual. Font: Nunito Sans (Google Fonts), dengan font sistem sebagai cadangan.

## Pengumpulan
Unggah isi folder ini ke repository GitHub dengan nama folder **`PWUTS_A03_25091397016`**, sehingga dapat diakses di `https://github.com/<id-github>/PWUTS_A03_25091397016`.
