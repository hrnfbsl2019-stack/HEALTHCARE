-- ============================================================================
-- MADANI HEALTHCARE - 08_branding.sql
-- Tabel pengaturan aplikasi (identitas organisasi + logo) untuk fitur
-- Pengaturan > Identitas Sekolah: ganti nama organisasi & unggah logo.
--
-- CARA PAKAI:
--   - Instalasi baru : jalankan setelah 01, 02, 03.
--   - Database lama  : cukup jalankan file ini saja (create if not exists).
-- Aman dijalankan berulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabel pengaturan — selalu tepat 1 baris (id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  org_name text not null default 'YPPIM Nurul Fikri Boarding School Lembang',
  org_tagline text not null default 'Sistem Pemantauan Kesehatan Pegawai',
  logo_url text,  -- data URL gambar logo (dikecilkan s/d 320px oleh aplikasi)
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. RLS: semua orang (termasuk anonim utk halaman login) boleh MEMBACA,
--    hanya super_admin / hrd boleh MENGUBAH
-- ---------------------------------------------------------------------------
alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select" on public.app_settings;
create policy "app_settings_select" on public.app_settings
  for select to anon, authenticated using (true);

drop policy if exists "app_settings_insert" on public.app_settings;
create policy "app_settings_insert" on public.app_settings
  for insert to authenticated with check (id = 1);

drop policy if exists "app_settings_update" on public.app_settings;
create policy "app_settings_update" on public.app_settings
  for update to authenticated
  using (public.role_in(array['super_admin','hrd']::user_role[]))
  with check (public.role_in(array['super_admin','hrd']::user_role[]));

grant select on public.app_settings to anon, authenticated;
grant insert, update on public.app_settings to authenticated;

-- ---------------------------------------------------------------------------
-- 3. updated_at otomatis
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_app_settings_touch on public.app_settings;
create trigger trg_app_settings_touch before update on public.app_settings
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- VERIFIKASI
-- ---------------------------------------------------------------------------
do $ver$
declare v_org text;
begin
  select org_name into v_org from public.app_settings where id = 1;
  if v_org is null then
    raise exception 'app_settings baris id=1 tidak ditemukan';
  end if;
  raise notice 'VERIFIKASI OK - app_settings siap. Nama organisasi saat ini: "%"', v_org;
end $ver$;
