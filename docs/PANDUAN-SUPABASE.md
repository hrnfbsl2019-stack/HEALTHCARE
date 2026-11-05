# 📗 PANDUAN KONEKSI SUPABASE — MADANI HEALTHCARE

Ikuti langkah 1–6 secara berurutan (± 15 menit). Setelah selesai, aplikasi
terhubung penuh ke database Supabase: login, semua modul CRUD, laporan, dan
notifikasi akan berfungsi nyata.

---

## Langkah 1 — Buat Proyek Supabase

1. Buka **https://supabase.com** → **Start your project** → daftar/login (bisa pakai GitHub).
2. Klik **New project**:
   - **Name**: `madani-healthcare`
   - **Database Password**: buat password kuat → **SIMPAN** (dipakai sekali lagi bila perlu reset).
   - **Region**: pilih yang terdekat, mis. `Singapore (ap-southeast-1)`.
   - **Plan**: Free sudah cukup untuk memulai.
3. Tunggu ± 2 menit hingga proyek aktif.

## Langkah 2 — Jalankan 3 File SQL

Buka **SQL Editor** (ikon terminal di sidebar kiri Supabase) → **New query**.

Jalankan **satu per satu dan berurutan** (copy seluruh isi file → paste → **Run**):

| Urutan | File | Isi |
|---|---|---|
| 1 | `supabase/01_schema.sql` | 16 tabel, index, fungsi keamanan, trigger, RPC laporan + **RPC Analisis Kondisi (hijau/orange/merah)**, storage bucket |
| 2 | `supabase/02_policies.sql` | Row Level Security (5 peran) + kebijakan storage |
| 3 | `supabase/03_seed.sql` | Data contoh 12 pegawai, MCU 12 bulan, lab, izin sakit, program, BPJS |
| 4 | `supabase/08_branding.sql` | Tabel `app_settings` — identitas organisasi & logo (fitur Pengaturan → Identitas Sekolah) |

✅ Setelah langkah ini, di **Table Editor** akan muncul 16 tabel terisi data contoh (+ `app_settings`).

> Jalankan ulang `03_seed.sql` tidak akan menduplikasi data (ada pengaman).

### Upgrade dari versi lama (database sudah terpasang sebelum fitur Analisis Kesehatan)

Jika database Anda sudah berjalan dan hanya ingin menambah **Grafik Analisis Kondisi Pegawai
(Hijau / Orange / Merah)**, cukup jalankan SATU file:

| File | Isi |
|---|---|
| `supabase/06_analisis_kondisi.sql` | 4 fungsi RPC baru (`rpc_health_triage`, `rpc_health_triage_by_unit`, `rpc_health_triage_trend`, `rpc_health_triage_list`) + grant |

File ini `create or replace` — aman dijalankan berulang, tidak mengubah data. Untuk instalasi
baru, `01_schema.sql` sudah memuat fungsi yang sama (tidak perlu jalankan 06).

### Ganti nama organisasi & logo tidak bisa disimpan (database lama)

Jika pada **Pengaturan → Identitas Sekolah** muncul pesan bahwa tabel `app_settings` belum ada,
jalankan SATU file berikut (instalasi baru sudah mencakupnya di Langkah 2):

| File | Isi |
|---|---|
| `supabase/08_branding.sql` | Tabel `app_settings` (1 baris) + RLS: semua pengguna boleh baca, super_admin/hrd boleh ubah + verifikasi otomatis |

### Dashboard kosong / banner "Sebagian data tidak dapat dimuat" (database lama)

Jika setelah login dashboard menampilkan banner kuning dengan error seperti
`structure of query does not match the result type` pada `rpc_unit_summary`,
`rpc_sickleave_monthly`, `rpc_sickleave_category`, atau `column x.jumlah does not exist`
pada `rpc_health_status_distribution` — database Anda dibuat dari `01_schema.sql` versi
lama yang memiliki bug tipe kolom pada 4 fungsi RPC dashboard. Perbaiki dengan SATU file:

| File | Isi |
|---|---|
| `supabase/07_hotfix_dashboard.sql` | Perbaikan 4 fungsi RPC dashboard + verifikasi otomatis |

File ini `create or replace` — aman dijalankan berulang, tidak mengubah data. Bila panel
hasil menampilkan `VERIFIKASI OK ...`, keempat fungsi sudah sehat; tunggu ±1 menit agar
cache API menyegarkan, lalu muat ulang dashboard (F5). Grafik dan tabel akan terisi kembali.

## Langkah 3 — Buat Akun Super Admin

1. Buka **Authentication → Users → Add user → Create new user**.
2. Isi email + password (min. 6 karakter) → centang **Auto Confirm User** → **Create user**.
3. Kembali ke **SQL Editor**, jalankan blok berikut. **Ganti hanya alamat email**
   dengan email akun yang tadi dibuat (tidak perlu menyalin UUID):

```sql
do $$
declare v_uid uuid;
begin
  select id into v_uid from auth.users where email = 'admin@nurulfikri.sch.id';
  if v_uid is null then
    raise exception 'Email tidak ditemukan. Cek daftar user di Authentication > Users.';
  end if;
  insert into public.user_roles (user_id, role, is_active)
  values (v_uid, 'super_admin', true)
  on conflict (user_id) do update set role = 'super_admin', is_active = true;
  raise notice 'OK: % sekarang super_admin.', v_uid;
end $$;
```

4. Jika muncul notice `OK: <uuid> sekarang super_admin.` → berhasil. Untuk melihat
   daftar user beserta perannya:

```sql
select u.id, u.email,
       coalesce(ur.role::text, '(belum ada)') as role_sekarang
  from auth.users u
  left join public.user_roles ur on ur.user_id = u.id
 order by u.created_at;
```

> Jangan tempel `'<UUID-USER>'` apa adanya — itu placeholder contoh dan akan
> memunculkan error `invalid input syntax for type uuid`.

5. (Opsional) Buat akun untuk peran lain dengan cara sama, lalu ganti `role`-nya:
   `hrd`, `petugas`, `pegawai`, `pimpinan`.
   Atau lebih mudah: aktifkan lewat aplikasi → **Pengaturan → Manajemen Pengguna** (khusus Super Admin).

## Langkah 4 — Ambil Kredensial API

Buka **Project Settings (⚙️) → API**:

- **Project URL** → bentuknya `https://xxxxxxxx.supabase.co`
- **anon / public key** → kunci panjang di bawah Project URL

> ⚠️ Gunakan **hanya anon/public key**. Key ini memang didesain untuk frontend dan
> aman berada di GitHub, karena seluruh proteksi data ditangani **Row Level
> Security** di database. **JANGAN PERNAH** menaruh **service_role key** di frontend.

## Langkah 5 — Isi Konfigurasi Aplikasi

Edit file **`js/config.js`**:

```js
const SUPABASE_CONFIG = {
  url: 'https://xxxxxxxx.supabase.co',        // ← Project URL
  anonKey: 'eyJhbGciOiJI... (anon public)'    // ← anon public key
};
```

Buka `index.html` di browser — banner peringatan konfigurasi akan hilang dan
halaman **Masuk** tampil normal.

## Langkah 6 — Login Uji Coba

1. Masuk dengan akun Super Admin (Langkah 3).
2. Dashboard menampilkan data contoh (12 pegawai, MCU, izin sakit, program).
3. Coba tiap modul: Data Pegawai → MCU → detail → Tindak Lanjut → Laporan → ekspor Excel/PDF.

### Mendaftarkan akun PEGAWAI baru
1. Pegawai membuka aplikasi → **Daftar sebagai Pegawai**.
2. Akun dibuat dengan status *menunggu aktivasi* (otomatis oleh trigger database).
3. Super Admin login → **Pengaturan → Manajemen Pengguna** → **Atur** →
   tetapkan peran + **hubungkan dengan data pegawai** + aktifkan.

---

## Menghapus Data Contoh — Mulai Data Real (Go-Live)

Setelah uji coba selesai dan sistem siap dipakai dengan **data real** (input manual
atau impor Excel dari menu **Tambah Pegawai**), bersihkan seluruh data contoh dengan
SATU file:

| File | Isi |
|---|---|
| `supabase/09_hapus_data_contoh.sql` | Menghapus 12 pegawai contoh + seluruh data kesehatan, MCU, lab, izin sakit, program, BPJS, notifikasi, audit log, dan file uji di bucket `health-documents` |

**Yang DIPERTAHANKAN** (tidak perlu setup ulang):

- ✅ **Akun & peran login** (`user_roles`) — Anda tetap masuk sebagai super_admin.
  Tautan akun → pegawai otomatis dilepas; hubungkan ulang lewat
  **Pengaturan → Manajemen Pengguna** setelah data real dimasukkan.
- ✅ **Identitas sekolah & logo** (`app_settings`) — branding Pengaturan tidak berubah.
- ✅ Seluruh struktur: tabel, RLS, fungsi RPC, trigger, storage bucket.

**Cara menjalankan:**

1. *(Disarankan)* Backup dulu bila data contoh ingin disimpan: **Table Editor →
   pilih tabel → Export CSV** (atau Database → Backups pada plan berbayar).
2. Buka **SQL Editor** → paste seluruh isi `09_hapus_data_contoh.sql`.
3. Di bagian `DECLARE`, ubah pengaman `v_confirm boolean := false` menjadi `true`.
4. **Run** → panel Messages menampilkan jumlah baris per tabel yang terhapus
   lalu `VERIFIKASI OK — semua tabel data sudah KOSONG (0 baris).`
5. Masukkan data real: **Tambah Pegawai** (unduh template Excel → isi → impor)
   atau input manual. Dashboard akan menampilkan angka 0 sampai data real ada.

> ⚠️ **Jangan jalankan `03_seed.sql` lagi** setelah pembersihan — data contoh akan
> masuk kembali (tabelnya memang kosong). Bila terlanjur, jalankan `09_...sql`
> sekali lagi. Tanpa mengubah `v_confirm` menjadi `true`, skrip MENOLAK berjalan
> (pengaman anti-hapus-kecelakaan).

<details>
<summary><b>Opsi Nuklir — reset database total (hanya bila database sangat berantakan)</b></summary>

Menghapus seluruh tabel + fungsi + kebijakan lalu membangun ulang dari nol. Data
login tetap ada di Authentication, tetapi semua peran & data hilang:

```sql
drop schema public cascade;
create schema public;
```

Lalu jalankan ulang berurutan: `01_schema.sql` → `02_policies.sql` →
`06_analisis_kondisi.sql` *(opsional, sudah termasuk di 01)* → `08_branding.sql`
→ blok super_admin (Langkah 3). **Jangan jalankan `03_seed.sql`.**
Logo & nama organisasi kembali ke bawaan — atur ulang di Pengaturan.

</details>

---

## Keamanan yang Sudah Aktif Otomatis

| Mekanisme | Penjelasan |
|---|---|
| **RLS 5 peran** | HRD tidak melihat hasil medis; Pimpinan hanya agregat anonim (RPC); Pegawai hanya data miliknya |
| **Audit log** | Semua perubahan data sensitif terekam otomatis (siapa/kapan/apa) |
| **Kolom diagnosis** | Tersembunyi dari HRD (via RPC `rpc_sick_leaves_admin`) |
| **Storage privat** | Bucket `health-documents` hanya bisa dibaca pemilik/petugas |
| **Tanpa kredensial BPJS** | Modul BPJS hanya menyimpan nomor kartu — bukan password |
| **AI Assistant** | Hanya edukasi; menolak diagnosis/obat/keputusan kepegawaian |

## Penjadwalan Pengingat (Opsional)

Pengingat MCU bisa dijalankan manual dari **Pengaturan → Pengingat MCU**.
Untuk otomatis harian, buat **Supabase Cron** (ekstensi `pg_cron`):

```sql
select cron.schedule('pengingat-mcu-harian', '0 7 * * *',
  $$select public.rpc_generate_mcu_reminders(7)$$);
```

Aktifkan lewat **Database → Extensions → pg_cron** terlebih dahulu.

## Integrasi WhatsApp (Opsional)

Lihat **`docs/INTEGRASI-WHATSAPP.md`** — dikirim via Supabase Edge Function
agar token API tidak pernah ada di frontend/GitHub.

## Troubleshooting

| Masalah | Solusi |
|---|---|
| "Akses ditolak oleh kebijakan keamanan (RLS)" | Peran belum aktif / akun belum dihubungkan pegawai. Cek **Pengaturan → Manajemen Pengguna** |
| Login gagal "Invalid login credentials" | Email/password salah, atau user belum *Auto Confirm* di Authentication |
| Banner "Supabase belum terhubung" | `js/config.js` masih placeholder — isi URL & anon key |
| Banner "Sebagian data tidak dapat dimuat" (4 RPC gagal) | Jalankan `supabase/07_hotfix_dashboard.sql` di SQL Editor, tunggu ±1 menit, muat ulang dashboard |
| Tabel RPC error `schema cache` | Jalankan ulang `01_schema.sql`, tunggu 1 menit (reload API schema) |
| Data contoh tidak muncul | Pastikan `03_seed.sql` dijalankan **setelah** kedua file lain |
| Ingin mulai dengan data real (hapus semua data contoh) | Jalankan `supabase/09_hapus_data_contoh.sql` — lihat bagian **Menghapus Data Contoh (Go-Live)** di atas |
| Terlanjur jalankan `03_seed.sql` setelah go-live | Jalankan ulang `09_hapus_data_contoh.sql` (dengan `v_confirm := true`) |
