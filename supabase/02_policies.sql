-- ============================================================================
-- MADANI HEALTHCARE - Bagian 2/3 : ROW LEVEL SECURITY (RBAC 5 Peran)
-- Peran: super_admin | hrd | petugas | pegawai | pimpinan
-- Prinsip:
--   - HRD      : data administratif + agregat, TANPA akses rekam medis personal
--   - PIMPINAN : hanya agregat/anonim (via RPC), tanpa akses tabel individual
--   - PEGAWAI  : hanya data miliknya sendiri
-- Jalankan SETELAH 01_schema.sql
-- ============================================================================

-- Aktifkan RLS di SEMUA tabel
alter table public.employees                  enable row level security;
alter table public.health_profiles            enable row level security;
alter table public.medical_checkups           enable row level security;
alter table public.physical_examinations      enable row level security;
alter table public.laboratory_results         enable row level security;
alter table public.medical_histories          enable row level security;
alter table public.health_consultations       enable row level security;
alter table public.health_followups           enable row level security;
alter table public.sick_leaves                enable row level security;
alter table public.health_programs            enable row level security;
alter table public.health_program_participants enable row level security;
alter table public.bpjs_health                enable row level security;
alter table public.health_documents           enable row level security;
alter table public.notifications              enable row level security;
alter table public.user_roles                 enable row level security;
alter table public.audit_logs                 enable row level security;

-- ============================================================================
-- 1. EMPLOYEES
-- ============================================================================
create policy emp_select on public.employees for select to authenticated using (
  public.role_in(array['super_admin','hrd','petugas']::user_role[])
  or id = public.get_my_employee_id());
create policy emp_insert on public.employees for insert to authenticated with check (
  public.role_in(array['super_admin','hrd']::user_role[]));
create policy emp_update on public.employees for update to authenticated
  using (public.role_in(array['super_admin','hrd']::user_role[]))
  with check (public.role_in(array['super_admin','hrd']::user_role[]));
create policy emp_delete on public.employees for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

-- ============================================================================
-- 2. HEALTH PROFILES  (pegawai boleh lihat & perbarui data miliknya)
-- ============================================================================
create policy prof_select on public.health_profiles for select to authenticated using (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy prof_insert on public.health_profiles for insert to authenticated with check (
  public.role_in(array['super_admin','petugas']::user_role[]));
create policy prof_update on public.health_profiles for update to authenticated
  using (public.role_in(array['super_admin','petugas']::user_role[])
         or employee_id = public.get_my_employee_id())
  with check (public.role_in(array['super_admin','petugas']::user_role[])
         or employee_id = public.get_my_employee_id());
create policy prof_delete on public.health_profiles for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

-- ============================================================================
-- 3-6. MCU, PEMERIKSAAN FISIK, LABORATORIUM, RIWAYAT
--      (HRD & PIMPINAN: TIDAK ADA akses baris individual)
-- ============================================================================
create policy mcu_select on public.medical_checkups for select to authenticated using (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy mcu_write on public.medical_checkups for insert to authenticated with check (
  public.role_in(array['super_admin','petugas']::user_role[]));
create policy mcu_update on public.medical_checkups for update to authenticated
  using (public.role_in(array['super_admin','petugas']::user_role[]))
  with check (public.role_in(array['super_admin','petugas']::user_role[]));
create policy mcu_delete on public.medical_checkups for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

create policy pe_select on public.physical_examinations for select to authenticated using (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy pe_write on public.physical_examinations for insert to authenticated with check (
  public.role_in(array['super_admin','petugas']::user_role[]));
create policy pe_update on public.physical_examinations for update to authenticated
  using (public.role_in(array['super_admin','petugas']::user_role[]))
  with check (public.role_in(array['super_admin','petugas']::user_role[]));
create policy pe_delete on public.physical_examinations for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

create policy lab_select on public.laboratory_results for select to authenticated using (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy lab_write on public.laboratory_results for insert to authenticated with check (
  public.role_in(array['super_admin','petugas']::user_role[]));
create policy lab_update on public.laboratory_results for update to authenticated
  using (public.role_in(array['super_admin','petugas']::user_role[]))
  with check (public.role_in(array['super_admin','petugas']::user_role[]));
create policy lab_delete on public.laboratory_results for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

create policy mh_select on public.medical_histories for select to authenticated using (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy mh_write on public.medical_histories for insert to authenticated with check (
  public.role_in(array['super_admin','petugas']::user_role[]));
create policy mh_update on public.medical_histories for update to authenticated
  using (public.role_in(array['super_admin','petugas']::user_role[]))
  with check (public.role_in(array['super_admin','petugas']::user_role[]));
create policy mh_delete on public.medical_histories for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

-- ============================================================================
-- 7. HEALTH CONSULTATIONS  (pegawai mengajukan untuk dirinya sendiri)
-- ============================================================================
create policy hc_select on public.health_consultations for select to authenticated using (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy hc_insert on public.health_consultations for insert to authenticated with check (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy hc_update on public.health_consultations for update to authenticated
  using (public.role_in(array['super_admin','petugas']::user_role[]))
  with check (public.role_in(array['super_admin','petugas']::user_role[]));
create policy hc_delete on public.health_consultations for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

-- ============================================================================
-- 8. HEALTH FOLLOWUPS
-- ============================================================================
create policy hf_select on public.health_followups for select to authenticated using (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy hf_write on public.health_followups for insert to authenticated with check (
  public.role_in(array['super_admin','petugas']::user_role[]));
create policy hf_update on public.health_followups for update to authenticated
  using (public.role_in(array['super_admin','petugas']::user_role[]))
  with check (public.role_in(array['super_admin','petugas']::user_role[]));
create policy hf_delete on public.health_followups for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

-- ============================================================================
-- 9. SICK LEAVES
--    diagnosis HANYA: petugas/super_admin/pemilik.
--    HRD memverifikasi via RPC (rpc_sick_leaves_admin / rpc_verify_sick_leave)
--    sehingga kolom diagnosis tidak pernah terbuka untuk HRD.
-- ============================================================================
create policy sl_select on public.sick_leaves for select to authenticated using (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy sl_insert on public.sick_leaves for insert to authenticated with check (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy sl_update on public.sick_leaves for update to authenticated
  using (public.role_in(array['super_admin','petugas']::user_role[]))
  with check (public.role_in(array['super_admin','petugas']::user_role[]));
create policy sl_delete on public.sick_leaves for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

-- ============================================================================
-- 10. HEALTH PROGRAMS (semua pengguna aktif boleh melihat)
-- ============================================================================
create policy prg_select on public.health_programs for select to authenticated using (true);
create policy prg_insert on public.health_programs for insert to authenticated with check (
  public.role_in(array['super_admin','hrd','petugas']::user_role[]));
create policy prg_update on public.health_programs for update to authenticated
  using (public.role_in(array['super_admin','hrd','petugas']::user_role[]))
  with check (public.role_in(array['super_admin','hrd','petugas']::user_role[]));
create policy prg_delete on public.health_programs for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

-- ============================================================================
-- 11. PROGRAM PARTICIPANTS (pegawai boleh mendaftarkan dirinya)
-- ============================================================================
create policy hpp_select on public.health_program_participants for select to authenticated using (
  public.role_in(array['super_admin','hrd','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy hpp_insert on public.health_program_participants for insert to authenticated with check (
  public.role_in(array['super_admin','hrd','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy hpp_update on public.health_program_participants for update to authenticated
  using (public.role_in(array['super_admin','hrd','petugas']::user_role[]))
  with check (public.role_in(array['super_admin','hrd','petugas']::user_role[]));
create policy hpp_delete on public.health_program_participants for delete to authenticated using (
  public.role_in(array['super_admin','hrd','petugas']::user_role[]));

-- ============================================================================
-- 12. BPJS HEALTH (tanpa kredensial; akses administratif)
-- ============================================================================
create policy bpjs_select on public.bpjs_health for select to authenticated using (
  public.role_in(array['super_admin','hrd','petugas']::user_role[]));
create policy bpjs_write on public.bpjs_health for insert to authenticated with check (
  public.role_in(array['super_admin','hrd','petugas']::user_role[]));
create policy bpjs_update on public.bpjs_health for update to authenticated
  using (public.role_in(array['super_admin','hrd','petugas']::user_role[]))
  with check (public.role_in(array['super_admin','hrd','petugas']::user_role[]));
create policy bpjs_delete on public.bpjs_health for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

-- ============================================================================
-- 13. HEALTH DOCUMENTS
-- ============================================================================
create policy hd_select on public.health_documents for select to authenticated using (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy hd_insert on public.health_documents for insert to authenticated with check (
  public.role_in(array['super_admin','petugas']::user_role[])
  or employee_id = public.get_my_employee_id());
create policy hd_update on public.health_documents for update to authenticated
  using (public.role_in(array['super_admin','petugas']::user_role[]))
  with check (public.role_in(array['super_admin','petugas']::user_role[]));
create policy hd_delete on public.health_documents for delete to authenticated using (
  public.role_in(array['super_admin','petugas']::user_role[]));

-- ============================================================================
-- 14. NOTIFICATIONS (hanya milik sendiri)
-- ============================================================================
create policy notif_select on public.notifications for select to authenticated using (
  user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on public.notifications for delete to authenticated using (
  user_id = auth.uid());

-- ============================================================================
-- 15. USER ROLES
-- ============================================================================
create policy ur_select on public.user_roles for select to authenticated using (
  user_id = auth.uid()
  or public.role_in(array['super_admin']::user_role[]));
create policy ur_update on public.user_roles for update to authenticated
  using (public.role_in(array['super_admin']::user_role[]))
  with check (public.role_in(array['super_admin']::user_role[]));
create policy ur_insert on public.user_roles for insert to authenticated with check (
  public.role_in(array['super_admin']::user_role[]));
create policy ur_delete on public.user_roles for delete to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

-- ============================================================================
-- 16. AUDIT LOGS (hanya super_admin yang bisa membaca)
-- ============================================================================
create policy audit_select on public.audit_logs for select to authenticated using (
  public.role_in(array['super_admin']::user_role[]));

-- ============================================================================
-- STORAGE: bucket privat "health-documents"
-- Konvensi path: {uuid-pegawai}/{nama-file}
-- ============================================================================
create policy storage_hd_select on storage.objects for select to authenticated using (
  bucket_id = 'health-documents'
  and ( public.role_in(array['super_admin','petugas']::user_role[])
        or (storage.foldername(name))[1] = public.get_my_employee_id()::text ));
create policy storage_hd_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'health-documents'
  and ( public.role_in(array['super_admin','petugas']::user_role[])
        or (storage.foldername(name))[1] = public.get_my_employee_id()::text ));
create policy storage_hd_update on storage.objects for update to authenticated
  using ( bucket_id = 'health-documents'
          and ( public.role_in(array['super_admin','petugas']::user_role[])
                or (storage.foldername(name))[1] = public.get_my_employee_id()::text ))
  with check ( bucket_id = 'health-documents' );
create policy storage_hd_delete on storage.objects for delete to authenticated using (
  bucket_id = 'health-documents'
  and public.role_in(array['super_admin','petugas']::user_role[]));

-- ============================================================================
-- SELESAI - Keamanan aktif:
--  * Semua tabel sensitif terlindungi RLS
--  * HRD hanya melihat jadwal MCU & izin sakit TANPA hasil medis (via RPC)
--  * Pimpinan hanya melihat agregat anonim (via RPC)
--  * Pegawai hanya melihat datanya sendiri
--  * Audit log otomatis merekam perubahan data sensitif
-- ============================================================================
