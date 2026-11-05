# 🚀 PANDUAN ONLINE KE GITHUB — MADANI HEALTHCARE

Aplikasi ini **100% statis** (HTML/CSS/JS) sehingga bisa online **gratis** dengan
**GitHub Pages**. Backend tetap Supabase (database, auth, storage).

Ada 2 cara: **A) GitHub Desktop (tanpa perintah teks)** atau **B) Git CLI**.

---

## Cara A — GitHub Desktop (paling mudah)

1. Unduh **GitHub Desktop** → https://desktop.github.com → login.
2. **File → Add Local Repository** → pilih folder `madani-healthcare`
   (jika ditanya "not a repository" → klik **Create a repository here**).
3. Isi nama repositori: `madani-healthcare` → **Publish repository**
   → biarkan **Public** (diperlukan agar GitHub Pages gratis berjalan; anon key
   Anda memang aman dipublikasikan — proteksi data ada di RLS Supabase).
4. Selesai — kode sudah online di `https://github.com/<username>/madani-healthcare`.

## Cara B — Git CLI

```bash
cd madani-healthcare

# inisialisasi repo
git init
git add .
git commit -m "MADANI HEALTHCARE - sistem pemantauan kesehatan pegawai"

# buat repo di akun Anda (butuh GitHub CLI) atau buat manual di github.com
gh repo create madani-healthcare --public --source=. --push
# --- atau cara manual ---
# 1. Buka github.com → New repository → nama: madani-healthcare → Public → Create
# 2. Hubungkan & unggah:
git branch -M main
git remote add origin https://github.com/<USERNAME>/madani-healthcare.git
git push -u origin main
```

## Aktifkan GitHub Pages

1. Buka repo di GitHub → **Settings → Pages** (menu kiri).
2. **Source**: `Deploy from a branch`.
3. **Branch**: pilih `main` → folder `/ (root)` → **Save**.
4. Tunggu 1–2 menit. Alamat online Anda:

   **`https://<USERNAME>.github.io/madani-healthcare/`**

5. Bagikan alamat tersebut ke pegawai. Login tetap melalui Supabase Auth.

> File `.nojekyll` sudah disertakan di folder aplikasi — **jangan dihapus**
> (mencegah GitHub mengabaikan file/folder berawalan garis bawah).

## Memperbarui Aplikasi

Setiap kali mengubah kode:

```bash
git add .
git commit -m "update: <deskripsi singkat>"
git push
```

GitHub Pages otomatis membangun ulang (± 1 menit). Di GitHub Desktop cukup
**Commit → Push origin**.

## Custom Domain (Opsional)

1. Beli domain (mis. `kesehatan.yayasan-anda.sch.id`).
2. **Settings → Pages → Custom domain** → isi domain → **Save**.
3. Di DNS domain Anda, tambahkan:
   - `CNAME` → `www` → `<USERNAME>.github.io`
   - `A` record (apex) → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
4. Centang **Enforce HTTPS** setelah sertifikat terbit.

## ✅ Checklist Keamanan Sebelum Online

- [ ] Hanya **anon key** di `js/config.js` — **service_role key TIDAK ada di repo** ✔
- [ ] `supabase/02_policies.sql` sudah dijalankan (RLS aktif di semua tabel) ✔
- [ ] Akun pengguna dibuat lewat aplikasi + diaktifkan Super Admin ✔
- [ ] Password Supabase database **tidak** ditulis di mana pun di repo ✔
- [ ] Token WhatsApp/API pihak ketiga hanya di Supabase Edge Function secrets ✔

> **Kenapa anon key aman di GitHub?** Anon key bersifat publik by design. Orang
> yang memilikinya tetap tidak bisa membaca data, karena setiap permintaan
> dievaluasi **Row Level Security** dengan identitas login Supabase Auth — bukan
> sekadar memiliki key. Inilah pola resmi Supabase untuk aplikasi frontend.

## Struktur Repo yang Diunggah

```
madani-healthcare/
├── index.html            ← halaman utama (login + aplikasi)
├── css/style.css
├── js/                   ← config, demo-data, db, rbac, ui, charts, export, auth, app + 15 modul
├── supabase/             ← 4 file SQL (diunggah boleh — berisi struktur, BUKAN kredensial)
├── docs/                 ← panduan
├── .nojekyll             ← wajib ada (sudah disertakan)
└── README.md
```
