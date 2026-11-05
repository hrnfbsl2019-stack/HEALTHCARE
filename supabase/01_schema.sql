-- ============================================================================
-- MADANI HEALTHCARE - Employee Health Monitoring System
-- YPPIM - Nurul Fikri Boarding School Lembang
-- Bagian 1/3 : SCHEMA (tabel, index, fungsi keamanan, trigger, RPC laporan)
-- Cara pakai : Supabase Dashboard > SQL Editor > New query > paste > Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
create type public.user_role as enum ('super_admin','hrd','petugas','pegawai','pimpinan');
create type public.health_status as enum ('sehat','sehat_catatan','pemantauan','tindak_lanjut','perawatan');
create type public.mcu_type as enum ('mcu_awal','mcu_periodik','mcu_khusus','mcu_keluar');
create type public.checkup_status as enum ('terjadwal','selesai','tidak_hadir','batal');
create type public.followup_status as enum ('dijadwalkan','berlangsung','selesai','ditunda');
create type public.sick_leave_status as enum ('menunggu','terverifikasi','ditolak');
create type public.consultation_status as enum ('diajukan','terjadwal','selesai','dibatalkan');
create type public.program_status as enum ('direncanakan','berlangsung','selesai','dibatalkan');
create type public.bpjs_status as enum ('aktif','nonaktif');
create type public.history_type as enum ('pribadi','keluarga');
create type public.document_type as enum ('mcu','laboratorium','surat_sakit','sertifikat','lainnya');
create type public.notification_type as enum ('info','pengingat','peringatan','tindak_lanjut');
create type public.employment_status as enum ('aktif','cuti','pensiun','keluar');
create type public.smoking_status as enum ('tidak_merokok','mantan_perokok','perokok');

-- ============================================================================
-- 1. EMPLOYEES  (integrasi E-PEGAWAI via employee_id / NIP)
-- ============================================================================
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null unique,
  full_name text not null,
  gender char(1) check (gender in ('L','P')),
  birth_date date,
  position text,
  unit text,
  phone text,
  email text,
  address text,
  join_date date,
  employment_status public.employment_status not null default 'aktif',
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_employees_employee_id on public.employees(employee_id);
create index idx_employees_full_name on public.employees(full_name);
create index idx_employees_unit on public.employees(unit);
create index idx_employees_emp_status on public.employees(employment_status);

-- ============================================================================
-- 2. HEALTH PROFILES
-- ============================================================================
create table public.health_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references public.employees(id) on delete cascade,
  blood_type text,
  height_cm numeric(5,1),
  weight_kg numeric(5,1),
  bmi numeric generated always as (
    weight_kg / nullif((height_cm / 100.0), 0) ^ 2
  ) stored,
  smoking_status public.smoking_status default 'tidak_merokok',
  allergies text,
  chronic_conditions text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_hp_employee on public.health_profiles(employee_id);

-- ============================================================================
-- 3. MEDICAL CHECKUPS (MCU)
-- ============================================================================
create table public.medical_checkups (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  checkup_date date not null default current_date,
  mcu_type public.mcu_type not null default 'mcu_periodik',
  status public.checkup_status not null default 'terjadwal',
  health_status public.health_status,          -- ditetapkan oleh petugas kesehatan
  doctor_name text,
  notes text,
  follow_up_required boolean not null default false,
  follow_up_notes text,
  next_mcu_date date,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_mcu_employee on public.medical_checkups(employee_id);
create index idx_mcu_date on public.medical_checkups(checkup_date);
create index idx_mcu_status on public.medical_checkups(status);
create index idx_mcu_health_status on public.medical_checkups(health_status);

-- ============================================================================
-- 4. PHYSICAL EXAMINATIONS
-- ============================================================================
create table public.physical_examinations (
  id uuid primary key default gen_random_uuid(),
  mcu_id uuid unique references public.medical_checkups(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  systolic int,
  diastolic int,
  pulse int,
  height_cm numeric(5,1),
  weight_kg numeric(5,1),
  bmi numeric generated always as (
    weight_kg / nullif((height_cm / 100.0), 0) ^ 2
  ) stored,
  vision_left text,
  vision_right text,
  hearing text,
  physical_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_pe_employee on public.physical_examinations(employee_id);
create index idx_pe_mcu on public.physical_examinations(mcu_id);

-- ============================================================================
-- 5. LABORATORY RESULTS
-- ============================================================================
create table public.laboratory_results (
  id uuid primary key default gen_random_uuid(),
  mcu_id uuid unique references public.medical_checkups(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  examined_at date,
  hemoglobin numeric(5,1),
  leukocytes numeric(6,2),
  hematocrit numeric(5,1),
  trombosit numeric(7,1),
  gula_darah_puasa numeric(6,1),
  gula_darah_2jpp numeric(6,1),
  cholesterol_total numeric(6,1),
  ldl numeric(6,1),
  hdl numeric(6,1),
  trigliserida numeric(6,1),
  asam_urat numeric(6,1),
  creatinine numeric(6,2),
  sgot numeric(6,1),
  sgpt numeric(6,1),
  urine_protein text,
  urine_glucose text,
  urine_blood text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_lab_employee on public.laboratory_results(employee_id);
create index idx_lab_mcu on public.laboratory_results(mcu_id);

-- ============================================================================
-- 6. MEDICAL HISTORIES
-- ============================================================================
create table public.medical_histories (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  history_type public.history_type not null default 'pribadi',
  condition_name text not null,
  diagnosed_year int,
  treatment text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_mh_employee on public.medical_histories(employee_id);

-- ============================================================================
-- 7. HEALTH CONSULTATIONS
-- ============================================================================
create table public.health_consultations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  requested_by uuid,
  topic text not null,
  description text,
  status public.consultation_status not null default 'diajukan',
  scheduled_at timestamptz,
  handler text,
  result_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_hc_employee on public.health_consultations(employee_id);
create index idx_hc_status on public.health_consultations(status);

-- ============================================================================
-- 8. HEALTH FOLLOWUPS (klasifikasi 5 tingkat -> tindak lanjut)
-- ============================================================================
create table public.health_followups (
  id uuid primary key default gen_random_uuid(),
  mcu_id uuid references public.medical_checkups(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  classification public.health_status,
  action text not null,
  description text,
  due_date date,
  status public.followup_status not null default 'dijadwalkan',
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_hf_employee on public.health_followups(employee_id);
create index idx_hf_mcu on public.health_followups(mcu_id);
create index idx_hf_status on public.health_followups(status);
create index idx_hf_due on public.health_followups(due_date);

-- ============================================================================
-- 9. SICK LEAVES  (izin sakit; kolom diagnosis DIBATASI aksesnya)
-- ============================================================================
create table public.sick_leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  duration_days int generated always as ((end_date - start_date) + 1) stored,
  reason_category text not null default 'Lainnya',
  diagnosis text,                               -- hanya petugas/super_admin/pemilik
  doctor_name text,
  facility text,
  attachment_url text,
  status public.sick_leave_status not null default 'menunggu',
  verified_by uuid,
  verified_at timestamptz,
  verification_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sl_dates_check check (end_date >= start_date)
);
create index idx_sl_employee on public.sick_leaves(employee_id);
create index idx_sl_start on public.sick_leaves(start_date);
create index idx_sl_status on public.sick_leaves(status);

-- ============================================================================
-- 10. HEALTH PROGRAMS
-- ============================================================================
create table public.health_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  program_type text not null default 'edukasi',
  description text,
  start_date date,
  end_date date,
  location text,
  target_participants int default 0,
  status public.program_status not null default 'direncanakan',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_hp2_status on public.health_programs(status);

-- ============================================================================
-- 11. HEALTH PROGRAM PARTICIPANTS
-- ============================================================================
create table public.health_program_participants (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.health_programs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  joined_at timestamptz not null default now(),
  attendance_count int not null default 0,
  status text not null default 'aktif',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hpp_unique unique (program_id, employee_id)
);
create index idx_hpp_program on public.health_program_participants(program_id);
create index idx_hpp_employee on public.health_program_participants(employee_id);

-- ============================================================================
-- 12. BPJS HEALTH  (TANPA password / kredensial akun!)
-- ============================================================================
create table public.bpjs_health (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references public.employees(id) on delete cascade,
  bpjs_number text not null,
  bpjs_class text,
  faskes_tingkat1 text,
  participant_since date,
  status public.bpjs_status not null default 'aktif',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_bpjs_employee on public.bpjs_health(employee_id);
create index idx_bpjs_number on public.bpjs_health(bpjs_number);

-- ============================================================================
-- 13. HEALTH DOCUMENTS (Supabase Storage: bucket "health-documents")
-- ============================================================================
create table public.health_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  uploaded_by uuid,
  document_type public.document_type not null default 'lainnya',
  title text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_hd_employee on public.health_documents(employee_id);

-- ============================================================================
-- 14. NOTIFICATIONS
-- ============================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  notification_type public.notification_type not null default 'info',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notif_user on public.notifications(user_id);
create index idx_notif_unread on public.notifications(user_id, is_read);

-- ============================================================================
-- 15. USER ROLES (RBAC 5 peran)
-- ============================================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.user_role not null default 'pegawai',
  employee_id uuid references public.employees(id) on delete set null,
  is_active boolean not null default true,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ur_employee on public.user_roles(employee_id);

-- ============================================================================
-- 16. AUDIT LOGS
-- ============================================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_audit_user on public.audit_logs(user_id);
create index idx_audit_table on public.audit_logs(table_name);
create index idx_audit_created on public.audit_logs(created_at);

-- ============================================================================
-- FUNGSI KEAMANAN (security definer - menghindari rekursi RLS)
-- ============================================================================
create or replace function public.get_my_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = auth.uid() and is_active limit 1;
$$;

create or replace function public.get_my_employee_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select employee_id from public.user_roles where user_id = auth.uid() and is_active limit 1;
$$;

create or replace function public.role_in(roles public.user_role[])
returns boolean
language sql stable security definer set search_path = public as $$
  select public.get_my_role() = any(roles);
$$;

-- ============================================================================
-- TRIGGER: updated_at otomatis
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['employees','health_profiles','medical_checkups','physical_examinations',
    'laboratory_results','medical_histories','health_consultations','health_followups','sick_leaves',
    'health_programs','health_program_participants','bpjs_health','health_documents','user_roles']
  loop
    execute format('create trigger trg_%s_updated before update on public.%I
      for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- ============================================================================
-- TRIGGER: user baru dari Supabase Auth -> user_roles (menunggu aktivasi)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role, is_active)
  values (new.id, 'pegawai', false)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- TRIGGER: audit log otomatis (tabel sensitif)
-- ============================================================================
create or replace function public.log_audit()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text; v_rid text;
begin
  if v_uid is null then return coalesce(new, old); end if;  -- seed tanpa user tidak diaudit
  select email into v_email from auth.users where id = v_uid;
  v_rid := (to_jsonb(coalesce(new, old)) ->> 'id');
  insert into public.audit_logs (user_id, user_email, action, table_name, record_id, old_data, new_data, user_agent)
  values (v_uid, v_email, tg_op, tg_table_name, v_rid,
          case when tg_op = 'DELETE' then to_jsonb(old) else null end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
          current_setting('request.headers', true)::jsonb->>'user-agent');
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['employees','health_profiles','medical_checkups','physical_examinations',
    'laboratory_results','medical_histories','health_consultations','health_followups','sick_leaves',
    'health_programs','bpjs_health','health_documents','user_roles']
  loop
    execute format('create trigger trg_%s_audit after insert or update or delete on public.%I
      for each row execute function public.log_audit();', t, t);
  end loop;
end $$;

-- ============================================================================
-- TRIGGER: notifikasi saat tindak lanjut baru dibuat
-- ============================================================================
create or replace function public.notify_followup()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_name text; v_action text;
begin
  select ur.user_id, e.full_name into v_uid, v_name
  from public.user_roles ur join public.employees e on e.id = ur.employee_id
  where ur.employee_id = new.employee_id limit 1;
  if v_uid is not null then
    insert into public.notifications (user_id, title, message, notification_type, link)
    values (v_uid, 'Tindak Lanjut Kesehatan Baru',
            'Halo ' || coalesce(v_name,'') || ', ada tindak lanjut kesehatan baru: ' || coalesce(new.action,'') || '. Batas waktu: ' || coalesce(new.due_date::text,'-'),
            'tindak_lanjut', '#/notifikasi');
  end if;
  return new;
end $$;

create trigger trg_followup_notify after insert on public.health_followups
  for each row execute function public.notify_followup();

-- ============================================================================
-- RPC : STATISTIK AGREGAT (aman untuk HRD & PIMPINAN - hanya angka agregat)
-- ============================================================================
create or replace function public.rpc_dashboard_counts()
returns json
language plpgsql security definer set search_path = public as $$
begin
  if public.get_my_role() is null then raise exception 'Akses ditolak'; end if;
  return json_build_object(
    'total_pegawai',      (select count(*) from employees where employment_status = 'aktif'),
    'mcu_bulan_ini',      (select count(*) from medical_checkups where date_trunc('month', checkup_date) = date_trunc('month', current_date)),
    'mcu_terjadwal',      (select count(*) from medical_checkups where status = 'terjadwal' and checkup_date >= current_date),
    'perlu_tindak_lanjut',(select count(*) from medical_checkups where health_status in ('pemantauan','tindak_lanjut','perawatan')),
    'izin_bulan_ini',     (select count(*) from sick_leaves where start_date >= date_trunc('month', current_date) and status = 'terverifikasi'),
    'izin_hari_bulan_ini',(select coalesce(sum(duration_days),0) from sick_leaves where start_date >= date_trunc('month', current_date) and status = 'terverifikasi'),
    'izin_menunggu',      (select count(*) from sick_leaves where status = 'menunggu'),
    'program_aktif',      (select count(*) from health_programs where status = 'berlangsung'),
    'konsultasi_menunggu',(select count(*) from health_consultations where status = 'diajukan'),
    'bpjs_aktif',         (select count(*) from bpjs_health where status = 'aktif')
  );
end $$;

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
    -- PENTING: alias "jumlah" wajib pada cabang pertama UNION ALL —
    -- nama kolom UNION diambil dari SELECT pertama; tanpa alias, kolom
    -- kedua bernama "count" sehingga "x.jumlah" tidak ada (error 42703).
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

create or replace function public.rpc_mcu_monthly(p_months int default 12)
returns table (bulan text, total bigint, selesai bigint, terjadwal bigint)
language plpgsql security definer set search_path = public as $$
begin
  if public.get_my_role() is null then raise exception 'Akses ditolak'; end if;
  return query
  with months as (
    select generate_series(
      date_trunc('month', current_date) - ((p_months - 1) || ' months')::interval,
      date_trunc('month', current_date),
      interval '1 month') as m)
  select to_char(mo.m, 'YYYY-MM'),
         count(mc.id),
         count(mc.id) filter (where mc.status = 'selesai'),
         count(mc.id) filter (where mc.status = 'terjadwal')
  from months mo
  left join medical_checkups mc on date_trunc('month', mc.checkup_date) = mo.m
  group by mo.m order by mo.m;
end $$;

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
  -- PENTING: cast ::numeric — "sum(int)" menghasilkan bigint; RETURN QUERY
  -- tidak mengkonversi otomatis bigint->numeric (error 42P13).
  select to_char(mo.m, 'YYYY-MM'),
         count(sl.id),
         coalesce(sum(sl.duration_days) filter (where sl.status = 'terverifikasi'), 0)::numeric
  from months mo
  left join sick_leaves sl on date_trunc('month', sl.start_date) = mo.m
  group by mo.m order by mo.m;
end $$;

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

create or replace function public.rpc_program_stats()
returns table (nama text, jenis text, status text, mulai date, peserta bigint, target int)
language plpgsql security definer set search_path = public as $$
begin
  if public.get_my_role() is null then raise exception 'Akses ditolak'; end if;
  return query
  select p.name, p.program_type, p.status::text, p.start_date, count(pp.id), p.target_participants
  from health_programs p
  left join health_program_participants pp on pp.program_id = p.id
  group by p.id
  order by p.start_date desc nulls last;
end $$;

-- ============================================================================
-- RPC : JADWAL MCU UNTUK HRD (tanpa kolom hasil medis)
-- ============================================================================
create or replace function public.rpc_mcu_schedule()
returns table (id uuid, nip text, nama text, unit text, tanggal date,
               jenis public.mcu_type, status public.checkup_status, perlu_tl boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not public.role_in(array['super_admin','hrd','petugas']::user_role[]) then
    raise exception 'Akses ditolak';
  end if;
  return query
  select mc.id, e.employee_id, e.full_name, e.unit, mc.checkup_date,
         mc.mcu_type, mc.status, mc.follow_up_required
  from medical_checkups mc join employees e on e.id = mc.employee_id
  order by mc.checkup_date desc;
end $$;

-- HRD/super_admin/petugas dapat MEMBUAT jadwal MCU (tanpa menyentuh hasil medis)
create or replace function public.rpc_schedule_mcu(p_employee uuid, p_date date, p_type public.mcu_type)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.role_in(array['super_admin','hrd','petugas']::user_role[]) then
    raise exception 'Akses ditolak';
  end if;
  insert into medical_checkups (employee_id, checkup_date, mcu_type, status, created_by)
  values (p_employee, p_date, p_type, 'terjadwal', auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- ============================================================================
-- RPC : IZIN SAKIT UNTUK HRD (TANPA kolom diagnosis) + verifikasi
-- ============================================================================
create or replace function public.rpc_sick_leaves_admin()
returns table (id uuid, nip text, nama text, unit text, mulai date, selesai date,
               durasi int, kategori text, status public.sick_leave_status,
               fasilitas text, dokter text, diverifikasi timestamptz, catatan_verifikasi text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.role_in(array['super_admin','hrd','petugas']::user_role[]) then
    raise exception 'Akses ditolak';
  end if;
  return query
  select sl.id, e.employee_id, e.full_name, e.unit, sl.start_date, sl.end_date,
         sl.duration_days, sl.reason_category, sl.status, sl.facility, sl.doctor_name,
         sl.verified_at, sl.verification_notes
  from sick_leaves sl join employees e on e.id = sl.employee_id
  order by sl.start_date desc;
end $$;

create or replace function public.rpc_verify_sick_leave(p_id uuid, p_status public.sick_leave_status, p_notes text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.role_in(array['super_admin','hrd']::user_role[]) then
    raise exception 'Hanya Super Admin / HRD yang dapat memverifikasi';
  end if;
  update sick_leaves
  set status = p_status, verified_by = auth.uid(), verified_at = now(), verification_notes = p_notes
  where id = p_id;
end $$;

-- ============================================================================
-- RPC : DASHBOARD PERSONAL (pegawai - hanya data miliknya)
-- ============================================================================
create or replace function public.rpc_my_dashboard()
returns json
language plpgsql security definer set search_path = public as $$
declare v_emp uuid := public.get_my_employee_id(); v_mcu uuid; result json;
begin
  if v_emp is null then return json_build_object('no_profile', true); end if;

  select mc.id into v_mcu from medical_checkups mc
  where mc.employee_id = v_emp and mc.status = 'selesai'
  order by mc.checkup_date desc limit 1;

  select json_build_object(
    'no_profile', false,
    'last_mcu', (select json_build_object('tanggal', mc.checkup_date, 'status', mc.health_status, 'jenis', mc.mcu_type)
                 from medical_checkups mc where mc.id = v_mcu),
    'next_mcu', (select json_build_object('tanggal', mc.checkup_date, 'jenis', mc.mcu_type)
                 from medical_checkups mc
                 where mc.employee_id = v_emp and mc.status = 'terjadwal' and mc.checkup_date >= current_date
                 order by mc.checkup_date limit 1),
    'izin_tahun_ini', (select coalesce(sum(duration_days),0) from sick_leaves
                       where employee_id = v_emp and status = 'terverifikasi'
                         and start_date >= date_trunc('year', current_date)),
    'izin_kasus_tahun_ini', (select count(*) from sick_leaves
                       where employee_id = v_emp and start_date >= date_trunc('year', current_date)),
    'program_diikuti', (select count(*) from health_program_participants where employee_id = v_emp),
    'lab_terakhir', (select json_build_object('tanggal', l.examined_at,
                       'gdp', l.gula_darah_puasa, 'kolesterol', l.cholesterol_total,
                       'asam_urat', l.asam_urat, 'hb', l.hemoglobin, 'sgpt', l.sgpt)
                     from laboratory_results l where l.employee_id = v_emp
                     order by coalesce(l.examined_at, l.created_at::date) desc limit 1)
  ) into result;
  return result;
end $$;

-- ============================================================================
-- RPC : MANAJEMEN PENGGUNA (Super Admin)
-- ============================================================================
create or replace function public.rpc_users_list()
returns table (user_id uuid, email text, role public.user_role,
               is_active boolean, employee_id uuid, nama_pegawai text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.role_in(array['super_admin']::user_role[]) then raise exception 'Akses ditolak'; end if;
  return query
  select ur.user_id, au.email, ur.role, ur.is_active, ur.employee_id, e.full_name
  from user_roles ur
  left join auth.users au on au.id = ur.user_id
  left join employees e on e.id = ur.employee_id
  order by ur.created_at desc;
end $$;

create or replace function public.rpc_user_set_role(p_user uuid, p_role public.user_role, p_employee uuid default null, p_active boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.role_in(array['super_admin']::user_role[]) then raise exception 'Akses ditolak'; end if;
  update user_roles
  set role = p_role, employee_id = p_employee, is_active = p_active, approved_by = auth.uid()
  where user_id = p_user;
end $$;

-- ============================================================================
-- RPC : PENGINGAT MCU (dipanggil petugas/admin dari halaman Notifikasi/Pengaturan)
-- ============================================================================
create or replace function public.rpc_generate_mcu_reminders(p_days int default 7)
returns int
language plpgsql security definer set search_path = public as $$
declare rec record; v_uid uuid; v_count int := 0;
begin
  if not public.role_in(array['super_admin','petugas']::user_role[]) then
    raise exception 'Akses ditolak';
  end if;
  for rec in
    select mc.id, mc.checkup_date, mc.mcu_type, e.full_name, ur.user_id
    from medical_checkups mc
    join employees e on e.id = mc.employee_id
    left join user_roles ur on ur.employee_id = e.id and ur.is_active
    where mc.status = 'terjadwal'
      and mc.checkup_date between current_date and current_date + p_days
  loop
    if rec.user_id is not null
       and not exists (select 1 from notifications
                       where user_id = rec.user_id and link = 'mcu:' || rec.id::text
                         and created_at::date = current_date) then
      insert into notifications (user_id, title, message, notification_type, link)
      values (rec.user_id,
              'Pengingat Jadwal MCU',
              'MCU Anda dijadwalkan pada ' || rec.checkup_date::text || ' (' || rec.mcu_type || '). Mohon hadir tepat waktu.',
              'pengingat', 'mcu:' || rec.id::text);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;

-- ============================================================================
-- STORAGE BUCKET untuk dokumen kesehatan (privat)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('health-documents', 'health-documents', false)
on conflict (id) do nothing;

-- ============================================================================
-- GRANT eksekusi RPC ke authenticated
-- ============================================================================
grant execute on function
  public.rpc_dashboard_counts(), public.rpc_health_status_distribution(),
  public.rpc_mcu_monthly(int), public.rpc_sickleave_monthly(int),
  public.rpc_sickleave_category(), public.rpc_unit_summary(), public.rpc_program_stats(),
  public.rpc_mcu_schedule(), public.rpc_schedule_mcu(uuid, date, public.mcu_type),
  public.rpc_sick_leaves_admin(),
  public.rpc_verify_sick_leave(uuid, public.sick_leave_status, text),
  public.rpc_my_dashboard(), public.rpc_users_list(),
  public.rpc_user_set_role(uuid, public.user_role, uuid, boolean),
  public.rpc_generate_mcu_reminders(int)
to authenticated;

-- ============================================================================
-- RPC : ANALISIS KONDISI KESEHATAN (BARU) — Level HIJAU / ORANGE / MERAH
-- Pemetaan klasifikasi 5 tingkat -> 3 level:
--   HIJAU  = sehat | ORANGE = sehat_catatan + pemantauan | MERAH = tindak_lanjut + perawatan
-- HRD & pimpinan hanya agregat; nama individual hanya utk petugas/super_admin.
-- (File terpisah supabase/06_analisis_kondisi.sql tersedia utk instalasi lama.)
-- ============================================================================

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
  return json_build_object('total_aktif', v_total, 'hijau', v_hijau, 'orange', v_orange,
    'merah', v_merah, 'belum_mcu', v_total - v_hijau - v_orange - v_merah);
end $$;

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

grant execute on function
  public.rpc_health_triage(text),
  public.rpc_health_triage_by_unit(),
  public.rpc_health_triage_trend(int, text),
  public.rpc_health_triage_list(text)
to authenticated;
