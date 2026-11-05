# 💚 MADANI HEALTHCARE — Employee Health Monitoring System

Sistem Pemantauan Kesehatan Pegawai untuk **YPPIM — Nurul Fikri Boarding School Lembang**.

Aplikasi web **100% fungsional** (bukan mockup): semua tombol, form, tabel, filter,
grafik, CRUD, laporan & ekspor terhubung langsung ke **Supabase** (PostgreSQL + Auth + Storage).

![Stack](https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Supabase-166534)
![Security](https://img.shields.io/badge/Security-RLS%20%2B%20Audit%20Log-d97706)

---

## ✨ Fitur

> 🆕 **Analisis Kondisi Kesehatan (Hijau/Orange/Merah)**: hasil MCU terakhir tiap pegawai
> dipetakan ke 3 level lampu lalu lintas — HIJAU = `sehat`, ORANGE = `sehat_catatan` + `pemantauan`,
> MERAH = `tindak_lanjut` + `perawatan`. Klasifikasi tetap ditetapkan **petugas kesehatan**
> (bukan diagnosis otomatis); HRD & pimpinan hanya melihat **agregat anonim**.

| Modul | Fungsi |
|---|---|
| **Dashboard** | Kartu statistik + **Grafik Analisis Kondisi Pegawai (Hijau/Orange/Merah)** + 4 grafik interaktif; tampilan personal untuk pegawai, agregat untuk pimpinan |
| **Analisis Kesehatan** ⭐ | Grafik level **HIJAU** (sehat & baik-baik saja) · **ORANGE** (ada yang kurang baik) · **MERAH** (perlu penanganan lebih & tindak lanjut): donut komposisi, sebaran bertumpuk per unit, tren bulanan, daftar pegawai per level (khusus petugas/admin), filter unit & periode, ekspor Excel/PDF |
| **Data Pegawai** | Terintegrasi E-PEGAWAI via `employee_id` (NIP) — **tidak menduplikasi** sistem kepegawaian; impor CSV sinkronisasi |
| **Profil Kesehatan** | Gol. darah, antropometri (BMI otomatis), kebiasaan, kontak darurat |
| **Medical Check Up** | Jadwal & hasil MCU; klasifikasi kesehatan **5 tingkat** oleh petugas; detail berisi fisik + lab + tindak lanjut |
| **Pemeriksaan Fisik** | Tensi, nadi, antropometri (BMI live), visus, pendengaran |
| **Laboratorium** | 14+ parameter dengan penanda rentang referensi umum (bukan diagnosis) |
| **Riwayat Kesehatan** | Riwayat penyakit pribadi & keluarga |
| **Izin Sakit** | Pengajuan → verifikasi → statistik; **kolom diagnosis tersembunyi dari HRD** |
| **Program Kesehatan** | Senam, edukasi gizi, screening, imunisasi + pendaftaran & kehadiran peserta |
| **BPJS Kesehatan** | Monitoring kepesertaan (tanpa menyimpan kredensial) |
| **AI Health Assistant** | Edukasi kesehatan, hitung BMI, arti parameter, hasil lab pribadi — **menolak diagnosis/obat/keputusan SDM** |
| **Laporan** | 6 laporan + **ekspor Excel & PDF**; pimpinan hanya melihat agregat anonim |
| **Notifikasi** | In-app (trigger database + pengingat MCU); opsi WhatsApp via Edge Function |
| **Pengaturan** | Manajemen pengguna 5 peran, audit log, pengingat, ganti sandi |

## 🔐 Keamanan & Kepatuhan

- **Row Level Security** di semua 16 tabel — 5 peran: `super_admin · hrd · petugas · pegawai · pimpinan`
- HRD = administratif + agregat, **tanpa rekam medis individual** (jadwal MCU & izin sakit lewat RPC tanpa kolom medis)
- Pimpinan = **agregat anonim** (RPC), identitas individual tidak pernah tampil
- Pegawai = **hanya data miliknya**
- **Audit log otomatis** semua perubahan data sensitif
- Mengikuti prinsip **UU No. 27 Tahun 2022** (PDP): pembatasan tujuan, minimalisasi data, hak subjek data
- Klasifikasi kesehatan **hanya oleh petugas kesehatan** — tidak ada diagnosis otomatis
- Frekuensi izin sakit **tidak** dijadikan dasar tunggal penilaian kinerja

## 🏁 Mulai Cepat

### Opsi A — Mode Demo instan (tanpa konfigurasi)

Buka `index.html` di browser → banner **MODE DEMO** aktif → klik tombol akun demo
(`super_admin / hrd / petugas / pegawai / pimpinan`, sandi `demo123`).
Data contoh 12 pegawai dimuat lokal (hilang saat refresh) — cocok untuk melihat-lihat dulu.

### Opsi B — Supabase sungguhan (produksi)

```text
1. Buat proyek di supabase.com
2. SQL Editor → jalankan supabase/01_schema.sql → 02_policies.sql → 03_seed.sql
3. Buat user admin (Authentication → Add user) → set role super_admin (snippet di seed)
4. Isi js/config.js dengan Project URL + anon key
5. Buka index.html → login
```

> Sudah punya database versi lama? Cukup jalankan `supabase/06_analisis_kondisi.sql`
> untuk menambah Grafik Analisis Kondisi (Hijau/Orange/Merah).

Panduan lengkap bergambar langkah:

- 📗 [`docs/PANDUAN-SUPABASE.md`](docs/PANDUAN-SUPABASE.md) — koneksi database & auth
- 🚀 [`docs/PANDUAN-GITHUB.md`](docs/PANDUAN-GITHUB.md) — online gratis via GitHub Pages
- 💬 [`docs/INTEGRASI-WHATSAPP.md`](docs/INTEGRASI-WHATSAPP.md) — notifikasi WhatsApp (opsional)

## 📁 Struktur

```
madani-healthcare/
├── index.html                 # halaman tunggal: login + seluruh aplikasi
├── css/style.css              # tema hijau madani, responsif
├── js/
│   ├── config.js              # ← ISI kredensial Supabase di sini
│   ├── demo-data.js           # mode demo (aktif otomatis bila config kosong)
│   ├── db.js · auth.js · rbac.js · ui.js · charts.js · export.js · app.js
│   └── modules/               # 15 modul (dashboard, analisis, pegawai … pengaturan)
├── supabase/
│   ├── 01_schema.sql          # 16 tabel + trigger + RPC laporan + RPC analisis triase
│   ├── 02_policies.sql        # RLS 5 peran + storage privat
│   ├── 03_seed.sql            # data contoh sekolah
│   └── 06_analisis_kondisi.sql # upgrade utk DB lama: RPC analisis hijau/orange/merah
└── docs/                      # panduan instalasi & deployment
```

## 👥 Peran & Hak Akses

| Fitur | Super Admin | HRD | Petugas Kesehatan | Pegawai | Pimpinan |
|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard agregat | ✅ | ✅ | ✅ | personal | ✅ anonim |
| Analisis Kesehatan (hijau/orange/merah) | ✅ + nama | agregat | ✅ + nama | level pribadi | ✅ anonim |
| Kelola data pegawai | ✅ | ✅ | lihat | — | — |
| Input hasil MCU/fisik/lab/riwayat | ✅ | ❌ | ✅ | lihat miliknya | — |
| Klasifikasi kesehatan 5 tingkat | ✅ | ❌ | ✅ | — | — |
| Jadwalkan MCU | ✅ | ✅ (RPC) | ✅ | — | — |
| Izin sakit: ajukan | ✅ | via RPC | ✅ | ✅ (miliknya) | — |
| Izin sakit: verifikasi | ✅ | ✅ (tanpa diagnosis) | ✅ | — | agregat |
| Program kesehatan | ✅ | ✅ | ✅ | ikut program | lihat |
| Laporan + ekspor | ✅ | ✅ | ✅ | — | ✅ agregat |
| Manajemen pengguna & audit log | ✅ | — | — | — | — |

## ⚠️ Disclaimer

AI Health Assistant menyediakan **edukasi kesehatan umum** dan **tidak** mendiagnosis,
tidak memberikan/mengubah resep obat, tidak menilai kelayakan kerja, dan tidak
menggantikan tenaga medis profesional.
