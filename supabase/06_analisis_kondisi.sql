-- ============================================================================
-- MADANI HEALTHCARE - [BARU] ANALISIS KONDISI KESEHATAN: HIJAU / ORANGE / MERAH
-- Grafik "lampu lalu lintas" kondisi pegawai berdasarkan klasifikasi 5 tingkat
-- yang DITETAPKAN PETUGAS KESEHATAN pada hasil MCU terakhir:
--   HIJAU  = sehat                                   -> sehat & baik-baik saja
--   ORANGE = sehat_catatan, pemantauan               -> ada yang kurang baik
--   MERAH  = tindak_lanjut, perawatan                -> perlu penanganan lebih &
--                                                       tindak lanjut
-- Akses:
--   super_admin / petugas  : agregat + daftar nama per level (medis)
--   hrd / pimpinan         : HANYA agregat anonim (UU No. 27/2022)
-- Catatan: create or replace -> aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RINGKASAN TRIASE (hijau/orange/merah/belum MCU) — bisa difilter per unit
-- ---------------------------------------------------------------------------
create or replace function public.rpc_health_triage(p_unit text default null)
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_hijau bigint; v_orange bigint; v_merah bigint; v_total bigint;
begin
  if not public.role_in(array['super_admin','hrd','petugas','pimpinan']::user_role[]) then
    raise exception 'Akses ditolak';
  end if;

  with latest as (
    select distinct on (mc.employee_id) mc.employee_id, mc.health_status
    from medical_checkups mc
    where mc.status = 'selesai' and mc.health_status is not null
    order by mc.employee_id, mc.checkup_date desc
  )
  select
    count(*) filter (where l.health_status = 'sehat'),
    count(*) filter (where l.health_status in ('sehat_catatan','pemantauan')),
    count(*) filter (where l.health_status in ('tindak_lanjut','perawatan')),
    count(e.id)
  into v_hijau, v_orange, v_merah, v_total
  from employees e
  left join latest l on l.employee_id = e.id
  where e.employment_status = 'aktif'
    and (p_unit is null or e.unit = p_unit);

  return json_build_object(
    'total_aktif', v_total,
    'hijau',  v_hijau,
    'orange', v_orange,
    'merah',  v_merah,
    'belum_mcu', v_total - v_hijau - v_orange - v_merah
  );
end $$;

-- ---------------------------------------------------------------------------
-- 2. TRIASE PER UNIT KERJA
-- ---------------------------------------------------------------------------
create or replace function public.rpc_health_triage_by_unit()
returns table (unit text, total_pegawai bigint, hijau bigint, orange bigint, merah bigint, belum bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.role_in(array['super_admin','hrd','petugas','pimpinan']::user_role[]) then
    raise exception 'Akses ditolak';
  end if;
  return query
  with latest as (
    select distinct on (mc.employee_id) mc.employee_id, mc.health_status
    from medical_checkups mc
    where mc.status = 'selesai' and mc.health_status is not null
    order by mc.employee_id, mc.checkup_date desc
  )
  select e.unit::text,
         count(e.id),
         count(l.employee_id) filter (where l.health_status = 'sehat'),
         count(l.employee_id) filter (where l.health_status in ('sehat_catatan','pemantauan')),
         count(l.employee_id) filter (where l.health_status in ('tindak_lanjut','perawatan')),
         count(e.id) filter (where l.employee_id is null)
  from employees e
  left join latest l on l.employee_id = e.id
  where e.employment_status = 'aktif'
  group by e.unit
  order by count(e.id) desc;
end $$;

-- ---------------------------------------------------------------------------
-- 3. TREN TRIASE BULANAN (jumlah hasil MCU selesai per level per bulan)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_health_triage_trend(p_months int default 6, p_unit text default null)
returns table (bulan text, hijau bigint, orange bigint, merah bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.role_in(array['super_admin','hrd','petugas','pimpinan']::user_role[]) then
    raise exception 'Akses ditolak';
  end if;
  return query
  with months as (
    select generate_series(
      date_trunc('month', current_date) - ((p_months - 1) || ' months')::interval,
      date_trunc('month', current_date),
      interval '1 month') as m)
  select to_char(mo.m, 'YYYY-MM'),
         count(mc.id) filter (where mc.health_status = 'sehat'),
         count(mc.id) filter (where mc.health_status in ('sehat_catatan','pemantauan')),
         count(mc.id) filter (where mc.health_status in ('tindak_lanjut','perawatan'))
  from months mo
  left join medical_checkups mc
    on date_trunc('month', mc.checkup_date) = mo.m
   and mc.status = 'selesai'
   and (p_unit is null or mc.employee_id in
        (select e.id from employees e where e.unit = p_unit))
  group by mo.m
  order by mo.m;
end $$;

-- ---------------------------------------------------------------------------
-- 4. DAFTAR PEGAWAI PER LEVEL — KHUSUS super_admin & petugas kesehatan
--    (HRD & pimpinan sengaja TIDAK diberi akses nama individual)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_health_triage_list(p_level text)
returns table (employee_id uuid, nip text, nama text, unit text,
               health_status public.health_status, tanggal date,
               perlu_tl boolean, catatan text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.role_in(array['super_admin','petugas']::user_role[]) then
    raise exception 'Akses ditolak — hanya petugas kesehatan / super admin';
  end if;
  if p_level not in ('hijau','orange','merah') then
    raise exception 'Parameter level tidak valid (gunakan hijau/orange/merah)';
  end if;
  return query
  with latest as (
    select distinct on (mc.employee_id) mc.employee_id, mc.health_status,
           mc.checkup_date, mc.follow_up_required, mc.follow_up_notes
    from medical_checkups mc
    where mc.status = 'selesai' and mc.health_status is not null
    order by mc.employee_id, mc.checkup_date desc
  )
  select e.id, e.employee_id, e.full_name, e.unit,
         l.health_status, l.checkup_date, l.follow_up_required, l.follow_up_notes
  from employees e
  join latest l on l.employee_id = e.id
  where e.employment_status = 'aktif'
    and (
      (p_level = 'hijau'  and l.health_status = 'sehat')
      or (p_level = 'orange' and l.health_status in ('sehat_catatan','pemantauan'))
      or (p_level = 'merah'  and l.health_status in ('tindak_lanjut','perawatan'))
    )
  order by case l.health_status
            when 'perawatan' then 0 when 'tindak_lanjut' then 1
            when 'pemantauan' then 2 when 'sehat_catatan' then 3 else 4 end,
         e.full_name;
end $$;

-- ---------------------------------------------------------------------------
-- GRANT eksekusi
-- ---------------------------------------------------------------------------
grant execute on function
  public.rpc_health_triage(text),
  public.rpc_health_triage_by_unit(),
  public.rpc_health_triage_trend(int, text),
  public.rpc_health_triage_list(text)
to authenticated;
