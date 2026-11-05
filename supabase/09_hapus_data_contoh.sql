-- ============================================================================
-- MADANI HEALTHCARE - 09_hapus_data_contoh.sql
-- HAPUS SELURUH DATA CONTOH / DATA UJI → database siap diisi data REAL
-- (input manual atau impor Excel dari menu Tambah Pegawai)
--
-- YANG DIHAPUS  : pegawai contoh, profil kesehatan, MCU, pemeriksaan fisik,
--                 hasil lab, riwayat medis, izin sakit, program kesehatan,
--                 peserta program, BPJS, konsultasi, dokumen, notifikasi,
--                 audit log, dan file uji di bucket "health-documents".
--
-- YANG DIPERTAHANKAN (PENTING):
--   - user_roles        : semua akun login + perannya (Anda tetap bisa masuk
--                         sebagai super_admin; hubungan akun→pegawai dilepas
--                         dan dihubungkan ulang lewat Pengaturan →
--                         Manajemen Pengguna setelah data real dimasukkan)
--   - app_settings      : identitas sekolah + logo (fitur Pengaturan)
--   - auth.users        : akun di Authentication tidak disentuh
--   - Struktur database : tabel, RLS, fungsi RPC, trigger, bucket
--
-- CARA PAKAI (SQL Editor Supabase):
--   1. (Disarankan) Backup dulu: Table Editor → pilih tabel → Export CSV,
--      atau Database → Backups.
--   2. Ubah pengaman di bagian DECLARE: ganti nilai "false" menjadi "true".
--   3. Jalankan seluruh isi file ini → lihat laporan di panel Messages.
--   4. JANGAN jalankan 03_seed.sql lagi — data contoh akan kembali masuk
--      (bila terlanjur, jalankan 09 ini sekali lagi).
-- ============================================================================

do $purge$
declare
  -- ================================================================
  --  PENGAMAN: ganti "false" menjadi "true" untuk benar-benar hapus.
  -- ================================================================
  v_confirm boolean := false;

  t        text;
  v_n      bigint;
  v_total  bigint := 0;
  v_roles  int;
  v_org    text;
  -- Urutan tidak wajib, hanya agar laporan mudah dibaca
  v_tables text[] := array[
    'health_documents','bpjs_health','health_program_participants',
    'health_programs','health_followups','sick_leaves','health_consultations',
    'medical_histories','laboratory_results','physical_examinations',
    'medical_checkups','health_profiles','employees','notifications','audit_logs'
  ];
begin
  ---------------------------------------------------------------
  -- 0. PENGAMAN KONFIRMASI
  ---------------------------------------------------------------
  if not v_confirm then
    raise exception using errcode = 'P0001', message =
      'DIBATALKAN (aman): data belum dihapus. '
      || 'Buka file ini, ubah baris "v_confirm boolean := false" menjadi ":= true", '
      || 'lalu jalankan lagi. Tindakan ini TIDAK BISA dibatalkan (undo) — backup dulu bila perlu.';
  end if;

  raise notice '=== MADANI HEALTHCARE — PENGHAPUSAN DATA CONTOH DIMULAI ===';

  ---------------------------------------------------------------
  -- 1. LAPORAN ISI SAAT INI
  ---------------------------------------------------------------
  foreach t in array v_tables loop
    execute format('select count(*) from public.%I', t) into v_n;
    v_total := v_total + v_n;
    raise notice '  % : % baris', rpad(t, 32, '.'), v_n;
  end loop;

  if v_total = 0 then
    raise notice 'Semua tabel sudah kosong - tidak ada yang perlu dihapus.';
  else
    raise notice 'Total % baris data contoh/uji akan dihapus...', v_total;

    -------------------------------------------------------------
    -- 2. HAPUS (urutan aman terhadap foreign key)
    -------------------------------------------------------------
    -- 2a. Notifikasi masa uji
    delete from public.notifications;

    -- 2b. Program kesehatan (peserta ikut terhapus via ON DELETE CASCADE)
    delete from public.health_programs;

    -- 2c. Pegawai — satu baris ini menghapus OTOMATIS (cascade):
    --     profil kesehatan, MCU, pemeriksaan fisik, hasil lab, riwayat,
    --     konsultasi, tindak lanjut, izin sakit, BPJS, dokumen, peserta program.
    --     user_roles TIDAK ikut terhapus (employee_id hanya menjadi NULL).
    delete from public.employees;

    -- 2d. File uji di Storage (abaikan bila kunci tidak cukup —
    --     bisa dihapus manual via Dashboard → Storage → health-documents)
    begin
      delete from storage.objects where bucket_id = 'health-documents';
    exception when others then
      raise warning 'File storage tidak dapat dihapus via SQL (%). Hapus manual: Dashboard > Storage > health-documents.', sqlerrm;
    end;

    -- 2e. Log audit dibersihkan TERAKHIR — jika pembersihan berjalan dengan
    --     konten login aktif, trigger audit mencatat penghapusan di atas;
    --     menghapus audit_logs paling akhir memastikan tabel benar-benar kosong.
    delete from public.audit_logs;
  end if;

  ---------------------------------------------------------------
  -- 3. VERIFIKASI HASIL
  ---------------------------------------------------------------
  v_total := 0;
  foreach t in array v_tables loop
    execute format('select count(*) from public.%I', t) into v_n;
    v_total := v_total + v_n;
    if v_n > 0 then
      raise exception 'VERIFIKASI GAGAL: tabel % masih berisi % baris.', t, v_n;
    end if;
  end loop;

  select count(*) into v_roles from public.user_roles;
  if to_regclass('public.app_settings') is not null then
    select org_name into v_org from public.app_settings where id = 1;
  end if;

  raise notice '============================================================';
  raise notice 'VERIFIKASI OK — semua tabel data sudah KOSONG (0 baris).';
  raise notice '  Akun & peran dipertahankan : % akun di user_roles', v_roles;
  raise notice '  Identitas sekolah dipertahankan: %', coalesce(v_org, '(app_settings belum terpasang)');
  if v_roles = 0 then
    raise warning 'user_roles KOSONG - tidak ada akun berperan. Jalankan ulang blok super_admin (Langkah 3 PANDUAN-SUPABASE.md).';
  end if;
  raise notice '------------------------------------------------------------';
  raise notice 'LANGKAH BERIKUTNYA:';
  raise notice '  1. JANGAN jalankan 03_seed.sql lagi (data contoh akan kembali).';
  raise notice '  2. Masukkan data real: menu Tambah Pegawai (impor Excel/CSV)';
  raise notice '     atau input manual satu per satu.';
  raise notice '  3. Hubungkan ulang akun user ke pegawai: Pengaturan >';
  raise notice '     Manajemen Pengguna > Atur (karena tautan lama sudah dilepas).';
  raise notice '  4. Dashboard/grafik akan menampilkan angka 0 sampai data real ada.';
  raise notice '============================================================';
end
$purge$;
