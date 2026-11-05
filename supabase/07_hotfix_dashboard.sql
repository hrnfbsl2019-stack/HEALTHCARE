-- ============================================================================
-- MADANI HEALTHCARE - 07_hotfix_dashboard.sql
-- Perbaikan dashboard kosong: 4 fungsi RPC yang gagal saat dipanggil.
--
-- GEJALA (banner kuning di dashboard):
--   rpc_unit_summary / rpc_sickleave_monthly / rpc_sickleave_category
--       -> "structure of query does not match the result type"  (42P13)
--          Penyebab: kolom "hari"/"izin_hari" dideklarasikan numeric,
--          tetapi coalesce(sum(int),0) menghasilkan bigint.
--   rpc_health_status_distribution
--       -> "column x.jumlah does not exist"                     (42703)
--          Penyebab: cabang UNION ALL pertama tidak memberi alias
--          "jumlah", sehingga kolom kedua bernama "count".
--
-- CARA PAKAI: Supabase Dashboard > SQL Editor > New query > tempel
-- SELURUH isi file ini > Run. Aman dijalankan berulang (create or replace).
-- Setelah sukses, tunggu +-1 menit agar cache PostgREST menyegarkan,
-- lalu muat ulang halaman dashboard.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1/4  Distribusi status kesehatan (donut chart "ch_status")
-- ---------------------------------------------------------------------------
create or replace function public.rpc_health_status_distribution()
returns table (label text, jumlah bigint)
language plpgsql security definer set search_path = public as $$
begin
  if public.get_my_role() is null then raise exception 'Akses ditolak'; end if;
  return query
  with latest as (
    select distinct on (mc.employee_id) mc.employee_id, mc.health_status
    from medical_checkups mc
    where mc.status = 'selesai' and mc.health_status is not null
    order by mc.employee_id, mc.checkup_date desc
  )
  select x.label::text, x.jumlah
  from (
    -- alias "jumlah" wajib pada cabang pertama UNION ALL:
    -- nama kolom UNION diambil dari SELECT pertama.
    select 'Sehat' as label, count(*) as jumlah from latest where health_status = 'sehat'
    union all select 'Sehat dgn Catatan', count(*) as jumlah from latest where health_status = 'sehat_catatan'
    union all select 'Perlu Pemantauan', count(*) as jumlah from latest where health_status = 'pemantauan'
    union all select 'Perlu Tindak Lanjut', count(*) as jumlah from latest where health_status = 'tindak_lanjut'
    union all select 'Perlu Perawatan', count(*) as jumlah from latest where health_status = 'perawatan'
    union all select 'Belum MCU', count(*) as jumlah
      from employees e where e.employment_status = 'aktif'
        and not exists (select 1 from latest l where l.employee_id = e.id)
  ) x
  order by x.jumlah desc;
end $$;

-- ---------------------------------------------------------------------------
-- 2/4  Izin sakit per bulan (bar chart "ch_izin") - cast ::numeric
-- ---------------------------------------------------------------------------
create or replace function public.rpc_sickleave_monthly(p_months int default 12)
returns table (bulan text, kasus bigint, hari numeric)
language plpgsql security definer set search_path = public as $$
begin
  if public.get_my_role() is null then raise exception 'Akses ditolak'; end if;
  return query
  with months as (
    select generate_series(
      date_trunc('month', current_date) - ((p_months - 1) || ' months')::interval,
      date_trunc('month', current_date),
      interval '1 month') as m)
  -- cast ::numeric: sum(int) menghasilkan bigint, RETURN QUERY tidak
  -- mengkonversi otomatis bigint -> numeric.
  select to_char(mo.m, 'YYYY-MM'),
         count(sl.id),
         coalesce(sum(sl.duration_days) filter (where sl.status = 'terverifikasi'), 0)::numeric
  from months mo
  left join sick_leaves sl on date_trunc('month', sl.start_date) = mo.m
  group by mo.m order by mo.m;
end $$;

-- ---------------------------------------------------------------------------
-- 3/4  Izin sakit per kategori (bar chart "ch_kat") - cast ::numeric
-- ---------------------------------------------------------------------------
create or replace function public.rpc_sickleave_category()
returns table (kategori text, kasus bigint, hari numeric)
language plpgsql security definer set search_path = public as $$
begin
  if public.get_my_role() is null then raise exception 'Akses ditolak'; end if;
  return query
  select sl.reason_category, count(*), coalesce(sum(sl.duration_days), 0)::numeric
  from sick_leaves sl
  where sl.status = 'terverifikasi' and sl.start_date >= current_date - 365
  group by sl.reason_category
  order by count(*) desc;
end $$;

-- ---------------------------------------------------------------------------
-- 4/4  Rekap per unit kerja (tabel "Rekap per Unit") - cast ::numeric
-- ---------------------------------------------------------------------------
create or replace function public.rpc_unit_summary()
returns table (
  unit text, total_pegawai bigint, sehat bigint, sehat_catatan bigint,
  pemantauan bigint, tindak_lanjut bigint, perawatan bigint, belum_mcu bigint, izin_hari numeric)
language plpgsql security definer set search_path = public as $$
begin
  if public.get_my_role() is null then raise exception 'Akses ditolak'; end if;
  return query
  with latest as (
    select distinct on (mc.employee_id) mc.employee_id, mc.health_status
    from medical_checkups mc
    where mc.status = 'selesai' and mc.health_status is not null
    order by mc.employee_id, mc.checkup_date desc)
  select e.unit::text,
         count(e.id),
         count(l.employee_id) filter (where l.health_status = 'sehat'),
         count(l.employee_id) filter (where l.health_status = 'sehat_catatan'),
         count(l.employee_id) filter (where l.health_status = 'pemantauan'),
         count(l.employee_id) filter (where l.health_status = 'tindak_lanjut'),
         count(l.employee_id) filter (where l.health_status = 'perawatan'),
         count(e.id) filter (where l.employee_id is null),
         coalesce((select sum(sl.duration_days) from sick_leaves sl
                   join employees e2 on e2.id = sl.employee_id
                   where e2.unit = e.unit and sl.status = 'terverifikasi'
                     and sl.start_date >= current_date - 365), 0)::numeric
  from employees e
  left join latest l on l.employee_id = e.id
  where e.employment_status = 'aktif'
  group by e.unit
  order by count(e.id) desc;
end $$;

-- ---------------------------------------------------------------------------
-- VERIFIKASI (jalankan otomatis bersama file ini)
-- Catatan: fungsi RPC memeriksa peran via auth.uid(), yang di SQL Editor
-- bernilai null. Blok ini "meniru" login super_admin aktif agar verifikasi
-- benar-benar mengeksekusi keempat fungsi seperti saat dipanggil dashboard.
-- ---------------------------------------------------------------------------
do $ver$
declare v_uid uuid; v_dist int; v_bln int; v_kat int; v_unit int;
begin
  select user_id into v_uid
  from public.user_roles
  where role = 'super_admin'
  order by (is_active is true) desc, user_id
  limit 1;

  if v_uid is null then
    raise notice 'VERIFIKASI DILEWATI: belum ada super_admin di user_roles.';
    raise notice 'Fungsi tetap sudah diperbaiki. Jalankan blok promosi admin (PANDUAN-SUPABASE.md Langkah 3), lalu muat ulang dashboard.';
    return;
  end if;

  -- dua-duanya diset: Supabase (request.jwt.claims) & stub lokal (madani.uid)
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid)::text, false);
  perform set_config('madani.uid', v_uid::text, false);

  select count(*) into v_dist from public.rpc_health_status_distribution();
  select count(*) into v_bln  from public.rpc_sickleave_monthly(12);
  select count(*) into v_kat  from public.rpc_sickleave_category();
  select count(*) into v_unit from public.rpc_unit_summary();

  raise notice 'VERIFIKASI OK (sebagai %) - distribusi: % baris | izin/bulan: % | kategori: % | unit: %',
    v_uid, v_dist, v_bln, v_kat, v_unit;
  raise notice 'Semua 4 fungsi sehat. Tunggu +-1 menit (cache API), lalu muat ulang dashboard (F5).';
end $ver$;
