-- ============================================================================
-- MADANI HEALTHCARE - Bagian 3/3 : DATA CONTOH (SEED)
-- 12 pegawai YPPIM Nurul Fikri Lembang + profil kesehatan + MCU 12 bulan
-- + hasil lab + pemeriksaan fisik + izin sakit + program + BPJS.
-- Tanggal dibuat RELATIF terhadap hari ini agar demo selalu relevan.
-- Aman dijalankan berulang: hanya mengisi jika tabel masih kosong.
-- ============================================================================

do $$
declare
  e1 uuid := 'e0000000-0000-4000-8000-000000000001';
  e2 uuid := 'e0000000-0000-4000-8000-000000000002';
  e3 uuid := 'e0000000-0000-4000-8000-000000000003';
  e4 uuid := 'e0000000-0000-4000-8000-000000000004';
  e5 uuid := 'e0000000-0000-4000-8000-000000000005';
  e6 uuid := 'e0000000-0000-4000-8000-000000000006';
  e7 uuid := 'e0000000-0000-4000-8000-000000000007';
  e8 uuid := 'e0000000-0000-4000-8000-000000000008';
  e9 uuid := 'e0000000-0000-4000-8000-000000000009';
  e10 uuid := 'e0000000-0000-4000-8000-000000000010';
  e11 uuid := 'e0000000-0000-4000-8000-000000000011';
  e12 uuid := 'e0000000-0000-4000-8000-000000000012';
  -- ID MCU & program ditetapkan di sini (DECLARE) agar bisa direferensikan
  -- oleh tabel pemeriksaan fisik, laboratorium, dan peserta program.
  m1 uuid := 'c0000000-0000-4000-8000-000000000001';
  m2 uuid := 'c0000000-0000-4000-8000-000000000002';
  m3 uuid := 'c0000000-0000-4000-8000-000000000003';
  m4 uuid := 'c0000000-0000-4000-8000-000000000004';
  m5 uuid := 'c0000000-0000-4000-8000-000000000005';
  m6 uuid := 'c0000000-0000-4000-8000-000000000006';
  m7 uuid := 'c0000000-0000-4000-8000-000000000007';
  m8 uuid := 'c0000000-0000-4000-8000-000000000008';
  m9 uuid := 'c0000000-0000-4000-8000-000000000009';
  m10 uuid := 'c0000000-0000-4000-8000-000000000010';
  m11 uuid := 'c0000000-0000-4000-8000-000000000011';
  m12 uuid := 'c0000000-0000-4000-8000-000000000012';
  p1 uuid := 'b0000000-0000-4000-8000-000000000001';
  p2 uuid := 'b0000000-0000-4000-8000-000000000002';
  p3 uuid := 'b0000000-0000-4000-8000-000000000003';
begin
  if exists (select 1 from public.employees) then
    raise notice 'Data contoh sudah ada - dilewati.';
    return;
  end if;

  -- ===================== PEGAWAI =====================
  insert into public.employees (id, employee_id, full_name, gender, birth_date, position, unit, phone, email, join_date, employment_status) values
  (e1, 'NF-2015-001', 'Ahmad Fauzi, S.Pd.I',      'L', '1980-04-12', 'Kepala Sekolah',            'Pendidikan',  '0812-1000-0001', 'ahmad.fauzi@nurulfikri.sch.id',  '2015-07-01', 'aktif'),
  (e2, 'NF-2016-002', 'Siti Nurhaliza, S.Pd',     'P', '1985-09-03', 'Guru Tahfidz',              'Pendidikan',  '0812-1000-0002', 'siti.n@nurulfikri.sch.id',       '2016-07-01', 'aktif'),
  (e3, 'NF-2016-003', 'Budi Santoso, S.Si',       'L', '1982-01-20', 'Guru Matematika',           'Pendidikan',  '0812-1000-0003', 'budi.s@nurulfikri.sch.id',       '2016-07-01', 'aktif'),
  (e4, 'NF-2018-004', 'Dewi Lestari, A.Md',       'P', '1990-06-15', 'Staf Tata Usaha',           'Administrasi','0812-1000-0004', 'dewi.l@nurulfikri.sch.id',       '2018-01-10', 'aktif'),
  (e5, 'NF-2017-005', 'Rudi Hartono',             'L', '1979-11-08', 'Mudirul Mahad (Pengasuh)',  'Asrama',      '0812-1000-0005', 'rudi.h@nurulfikri.sch.id',       '2017-07-16', 'aktif'),
  (e6, 'NF-2019-006', 'Nur Aisyah, S.Pd',         'P', '1988-03-25', 'Pengasuh Asrama Putri',     'Asrama',      '0812-1000-0006', 'aisyah.n@nurulfikri.sch.id',     '2019-07-01', 'aktif'),
  (e7, 'NF-2019-007', 'Joko Prasetyo',            'L', '1992-08-30', 'Petugas Keamanan',          'Umum',        '0812-1000-0007', 'joko.p@nurulfikri.sch.id',       '2019-01-15', 'aktif'),
  (e8, 'NF-2020-008', 'Fitri Handayani',          'P', '1995-02-14', 'Staf Dapur',                'Umum',        '0812-1000-0008', 'fitri.h@nurulfikri.sch.id',      '2020-02-03', 'aktif'),
  (e9, 'NF-2018-009', 'Agus Setiawan, S.Hum',     'L', '1986-12-05', 'Guru Bahasa Arab',          'Pendidikan',  '0812-1000-0009', 'agus.s@nurulfikri.sch.id',       '2018-07-02', 'aktif'),
  (e10,'NF-2016-010','Ratna Sari, S.E',           'P', '1984-07-19', 'Bendahara',                 'Administrasi','0812-1000-0010', 'ratna.s@nurulfikri.sch.id',      '2016-01-11', 'aktif'),
  (e11,'NF-2021-011','Hendra Gunawan',            'L', '1993-05-22', 'Petugas Kebersihan',        'Umum',        '0812-1000-0011', 'hendra.g@nurulfikri.sch.id',     '2021-03-01', 'aktif'),
  (e12,'NF-2020-012','Maya Anggraini, S.Psi',     'P', '1991-10-09', 'Guru BK',                   'Pendidikan',  '0812-1000-0012', 'maya.a@nurulfikri.sch.id',       '2020-07-13', 'aktif');

  -- ===================== PROFIL KESEHATAN =====================
  insert into public.health_profiles (employee_id, blood_type, height_cm, weight_kg, smoking_status, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone) values
  (e1,  'O',  170, 74, 'tidak_merokok',  null,          null,                    'Halimah (istri)',   '0813-2000-0001'),
  (e2,  'A',  158, 52, 'tidak_merokok',  'Debu',        null,                    'Rahmat (suami)',    '0813-2000-0002'),
  (e3,  'B',  168, 82, 'mantan_perokok', 'Seafood',     'Hipertensi (2019)',     'Lina (istri)',      '0813-2000-0003'),
  (e4,  'AB', 160, 55, 'tidak_merokok',  null,          null,                    'Sari (saudara)',    '0813-2000-0004'),
  (e5,  'O',  172, 88, 'tidak_merokok',  null,          'Diabetes Tipe 2 (2021)','Umi (istri)',       '0813-2000-0005'),
  (e6,  'A',  155, 50, 'tidak_merokok',  null,          null,                    'Yusuf (suami)',     '0813-2000-0006'),
  (e7,  'B',  175, 70, 'perokok',        null,          null,                    'Siti (istri)',      '0813-2000-0007'),
  (e8,  'O',  157, 46, 'tidak_merokok',  'Rumput laut', 'Anemia ringan',         'Ibu Wati',          '0813-2000-0008'),
  (e9,  'A',  165, 65, 'tidak_merokok',  null,          null,                    'Aminah (istri)',    '0813-2000-0009'),
  (e10, 'B',  162, 68, 'tidak_merokok',  'Debu',        'Hepatitis (riwayat)',   'Dewi (saudara)',    '0813-2000-0010'),
  (e11, 'O',  170, 62, 'tidak_merokok',  null,          null,                    'Rudi (saudara)',    '0813-2000-0011'),
  (e12, 'AB', 163, 58, 'tidak_merokok',  null,          null,                    'Andi (suami)',      '0813-2000-0012');

  -- ===================== MCU 12 BULAN TERAKHIR =====================
  -- (id MCU memakai variabel dari DECLARE di atas)
  insert into public.medical_checkups (id, employee_id, checkup_date, mcu_type, status, health_status, doctor_name, follow_up_required, follow_up_notes, next_mcu_date, created_by) values
  (m1, e1,  current_date - 330, 'mcu_periodik', 'selesai', 'sehat',            'dr. Sarah Amalia',      false, null, null, null),
  (m2, e2,  current_date - 300, 'mcu_periodik', 'selesai', 'sehat',            'dr. Sarah Amalia',      false, null, null, null),
  (m3, e3,  current_date - 360, 'mcu_periodik', 'selesai', 'pemantauan',       'dr. Sarah Amalia',      true,  'Kontrol tekanan darah rutin tiap bulan', (current_date + interval '25 days')::date, null),
  (m4, e4,  current_date - 270, 'mcu_periodik', 'selesai', 'sehat',            'dr. Bagus Prakoso',     false, null, null, null),
  (m5, e5,  current_date - 240, 'mcu_periodik', 'selesai', 'tindak_lanjut',    'dr. Sarah Amalia',      true,  'Rujukan ke internis untuk gula darah tinggi', (current_date + interval '10 days')::date, null),
  (m6, e6,  current_date - 210, 'mcu_awal',     'selesai', 'sehat',            'dr. Bagus Prakoso',     false, null, null, null),
  (m7, e7,  current_date - 180, 'mcu_periodik', 'selesai', 'sehat_catatan',    'dr. Sarah Amalia',      true,  'Edukasi berhenti merokok', null, null),
  (m8, e8,  current_date - 150, 'mcu_periodik', 'selesai', 'sehat_catatan',    'dr. Bagus Prakoso',     true,  'Konsultasi gizi: anemia ringan', (current_date + interval '5 days')::date, null),
  (m9, e9,  current_date - 120, 'mcu_periodik', 'selesai', 'sehat',            'dr. Sarah Amalia',      false, null, null, null),
  (m10, e10, current_date - 90,  'mcu_periodik', 'selesai', 'perawatan',        'dr. Sarah Amalia',      true,  'Program pengobatan hepatitis, monitoring lab berkala', (current_date + interval '15 days')::date, null),
  (m11, e11, current_date - 60,  'mcu_awal',     'selesai', 'sehat',            'dr. Bagus Prakoso',     false, null, null, null),
  (m12, e12, current_date - 30,  'mcu_periodik', 'selesai', 'sehat',            'dr. Sarah Amalia',      false, null, null, null);

  -- MCU terjadwal (akan memicu fitur pengingat)
  insert into public.medical_checkups (employee_id, checkup_date, mcu_type, status, doctor_name, created_by) values
  (e3, (current_date + interval '20 days')::date, 'mcu_periodik', 'terjadwal', 'dr. Sarah Amalia', null),
  (e5, (current_date + interval '12 days')::date, 'mcu_khusus',   'terjadwal', 'dr. Bagus Prakoso', null),
  (e10,(current_date + interval '7 days')::date,  'mcu_khusus',   'terjadwal', 'dr. Sarah Amalia', null);

  -- ===================== PEMERIKSAAN FISIK (untuk MCU selesai) =====================
  insert into public.physical_examinations (mcu_id, employee_id, systolic, diastolic, pulse, height_cm, weight_kg, vision_left, vision_right, hearing, physical_notes) values
  (m1,  e1,  122, 80, 76, 170, 74, '1.0', '1.0', 'normal', 'Kondisi umum baik'),
  (m2,  e2,  110, 75, 80, 158, 52, '1.2', '1.2', 'normal', 'Kondisi umum baik'),
  (m3,  e3,  150, 95, 84, 168, 82, '0.9', '1.0', 'normal', 'Tekanan darah tinggi, perlu pemantauan'),
  (m4,  e4,  115, 78, 82, 160, 55, '1.0', '1.0', 'normal', 'Kondisi umum baik'),
  (m5,  e5,  135, 88, 88, 172, 88, '1.0', '0.8', 'normal', 'Berat badan berlebih, kadar gula perlu kontinuitas'),
  (m6,  e6,  108, 70, 78, 155, 50, '1.2', '1.2', 'normal', 'Kondisi umum baik'),
  (m7,  e7,  128, 84, 74, 175, 70, '1.0', '1.0', 'normal', 'Perlu edukasi berhenti merokok'),
  (m8,  e8,  105, 70, 86, 157, 46, '1.2', '1.2', 'normal', 'BB kurang, anemia ringan'),
  (m9,  e9,  118, 76, 72, 165, 65, '1.0', '1.0', 'normal', 'Kondisi umum baik'),
  (m10, e10, 120, 80, 80, 162, 68, '1.0', '1.0', 'normal', 'Terapi hepatitis berjalan'),
  (m11, e11, 125, 82, 78, 170, 62, '1.0', '1.0', 'normal', 'Kondisi umum baik'),
  (m12, e12, 112, 74, 76, 163, 58, '1.2', '1.2', 'normal', 'Kondisi umum baik');

  -- ===================== HASIL LABORATORIUM =====================
  insert into public.laboratory_results (mcu_id, employee_id, examined_at, hemoglobin, leukocytes, hematocrit, trombosit, gula_darah_puasa, gula_darah_2jpp, cholesterol_total, ldl, hdl, trigliserida, asam_urat, creatinine, sgot, sgpt, urine_protein, urine_glucose, urine_blood, notes) values
  (m1,  e1,  current_date - 330, 14.5, 7.2, 42, 250, 92,  118, 185, 110, 48, 140, 5.8, 0.9, 26, 30, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'),
  (m2,  e2,  current_date - 300, 12.8, 6.8, 38, 260, 88,  110, 170,  98, 52, 120, 4.5, 0.8, 22, 24, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'),
  (m3,  e3,  current_date - 360, 15.2, 7.5, 45, 240, 105, 140, 240, 150, 40, 210, 6.9, 1.0, 30, 38, 'negatif', 'negatif', 'negatif', 'Kolesterol total & LDL tinggi'),
  (m4,  e4,  current_date - 270, 13.0, 7.0, 40, 270, 90,  112, 175, 105, 50, 135, 4.8, 0.8, 24, 28, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'),
  (m5,  e5,  current_date - 240, 14.8, 8.1, 44, 235, 178, 260, 220, 135, 38, 260, 7.4, 1.1, 34, 44, 'negatif', 'positif', 'negatif', 'Gula darah tinggi - rujuk internis'),
  (m6,  e6,  current_date - 210, 12.5, 6.5, 37, 265, 85,  105, 160,  92, 55, 110, 4.2, 0.7, 20, 22, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'),
  (m7,  e7,  current_date - 180, 15.0, 7.4, 44, 245, 95,  120, 200, 120, 45, 160, 6.5, 0.9, 28, 32, 'negatif', 'negatif', 'negatif', 'Asam urat batas atas'),
  (m8,  e8,  current_date - 150, 10.5, 6.9, 33, 255, 86,  108, 165,  95, 48, 125, 4.0, 0.7, 21, 25, 'negatif', 'negatif', 'negatif', 'Hemoglobin rendah - anemia ringan'),
  (m9,  e9,  current_date - 120, 14.2, 7.1, 43, 248, 93,  115, 180, 108, 47, 138, 5.6, 0.9, 25, 29, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'),
  (m10, e10, current_date - 90,  13.2, 7.8, 41, 240, 96,  122, 190, 112, 44, 150, 5.9, 1.3, 52, 78, 'negatif', 'negatif', 'negatif', 'SGOT/SGPT tinggi - monitoring hepatitis'),
  (m11, e11, current_date - 60,  14.6, 7.3, 43, 252, 91,  116, 178, 106, 49, 142, 5.7, 0.9, 26, 31, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'),
  (m12, e12, current_date - 30,  12.9, 6.7, 39, 262, 87,  109, 168,  96, 51, 118, 4.4, 0.8, 23, 26, 'negatif', 'negatif', 'negatif', 'Dalam batas normal');

  -- ===================== RIWAYAT KESEHATAN =====================
  insert into public.medical_histories (employee_id, history_type, condition_name, diagnosed_year, treatment, notes, is_active) values
  (e3,  'pribadi',  'Hipertensi',           2019, 'Amlodipin 5mg harian',  'Kontrol rutin bulanan', true),
  (e3,  'keluarga','Stroke (ayah)',         null, null,                    'Riwayat keluarga',      false),
  (e5,  'pribadi',  'Diabetes Melitus Tipe 2', 2021, 'Metformin 500mg',     'Diet & obat rutin',     true),
  (e5,  'keluarga','Diabetes (ayah)',       2010, null,                    'Riwayat keluarga',      false),
  (e8,  'pribadi',  'Anemia defisiensi besi', 2023, 'Tablet tambah darah',   'Perbaikan pola makan',  true),
  (e10, 'pribadi',  'Hepatitis B',          2024, 'Terapi antiviral',      'Monitoring lab tiap 3 bulan', true),
  (e7,  'pribadi',  'Batuk berkepanjangan', 2022, 'Terapi simtomatik',     'Berhenti merokok disarankan', false);

  -- ===================== IZIN SAKIT =====================
  insert into public.sick_leaves (employee_id, start_date, end_date, reason_category, diagnosis, doctor_name, facility, status, verified_by, verified_at, verification_notes) values
  (e2,  current_date - 320, current_date - 318, 'Demam',        'Demam berdarah dengue', 'dr. Sarah Amalia', 'Klinik Lembang',   'terverifikasi', null, now() - interval '317 days', 'Surat dokter lengkap'),
  (e7,  current_date - 280, current_date - 278, 'Flu & Batuk',  'ISPA',                  'dr. Bagus Prakoso','Puskesmas Lembang','terverifikasi', null, now() - interval '277 days', null),
  (e3,  current_date - 200, current_date - 198, 'Nyeri Punggung','Nyeri punggung bawah (myalgia)', 'dr. Sarah Amalia', 'Klinik Lembang', 'terverifikasi', null, now() - interval '197 days', 'Sarankan peregangan rutin'),
  (e8,  current_date - 170, current_date - 168, 'Gastritis',    'Gastritis akut',        'dr. Bagus Prakoso','Puskesmas Lembang','terverifikasi', null, now() - interval '167 days', null),
  (e6,  current_date - 150, current_date - 90,  'Melahirkan',   'Persalinan normal',     'dr. Ratna Dewi',   'RSUD Bandung',     'terverifikasi', null, now() - interval '149 days', 'Cuti melahirkan 2 bulan'),
  (e11, current_date - 120, current_date - 117, 'Cedera',       'Tersprain pergelangan kaki', 'dr. Sarah Amalia', 'Klinik Lembang', 'terverifikasi', null, now() - interval '116 days', null),
  (e4,  current_date - 95,  current_date - 94,  'Flu & Batuk',  'Pharyngitis',           'dr. Bagus Prakoso','Puskesmas Lembang','terverifikasi', null, now() - interval '93 days', null),
  (e5,  current_date - 60,  current_date - 58,  'Komplikasi',   'Kontrol gula darah tinggi', 'dr. Sarah Amalia', 'Klinik Lembang', 'terverifikasi', null, now() - interval '57 days', null),
  (e9,  current_date - 25,  current_date - 24,  'Demam',        'Demam tifoid suspek',   'dr. Bagus Prakoso','Puskesmas Lembang','terverifikasi', null, now() - interval '23 days', null),
  (e12, current_date - 3,   current_date - 2,   'Flu & Batuk',  'ISPA',                  null,               null,               'menunggu',      null, null, null),
  (e1,  current_date - 1,   current_date,       'Demam',        'Demam',                 null,               null,               'menunggu',      null, null, null);

  -- ===================== PROGRAM KESEHATAN =====================
  insert into public.health_programs (id, name, program_type, description, start_date, end_date, location, target_participants, status, created_by) values
  (p1, 'Senam Sehat Jumat', 'senam',     'Senam bersama seluruh pegawai setiap Jumat pagi untuk menjaga kebugaran.', current_date - 90, null, 'Lapangan Utama', 30, 'berlangsung', null),
  (p2, 'Edukasi Gizi Seimbang', 'edukasi','Sosialisasi Isi Piringku & pengendalian gula-garam-lemak untuk pegawai dapur dan asrama.', current_date - 150, current_date - 150, 'Aula YPPIM', 25, 'selesai', null),
  (p3, 'Screening Kesehatan Gratis', 'screening', 'Pemeriksaan tekanan darah, gula darah, dan asam urat gratis untuk seluruh pegawai.', current_date + 21, current_date + 21, 'Aula YPPIM', 40, 'direncanakan', null);

  insert into public.health_program_participants (program_id, employee_id, attendance_count, status) values
  (p1, e1, 10, 'aktif'), (p1, e2, 11, 'aktif'), (p1, e3, 8, 'aktif'), (p1, e4, 12, 'aktif'),
  (p1, e6, 9, 'aktif'),  (p1, e9, 10, 'aktif'), (p1, e12, 11, 'aktif'), (p1, e7, 6, 'aktif'),
  (p2, e2, 1, 'selesai'), (p2, e4, 1, 'selesai'), (p2, e8, 1, 'selesai'), (p2, e6, 1, 'selesai'), (p2, e10, 1, 'selesai'),
  (p3, e3, 0, 'aktif'),  (p3, e5, 0, 'aktif'),  (p3, e10, 0, 'aktif');

  -- ===================== BPJS =====================
  insert into public.bpjs_health (employee_id, bpjs_number, bpjs_class, faskes_tingkat1, participant_since, status) values
  (e1,  '0001234567891', 'Kelas 1', 'Puskesmas Lembang', '2015-08-01', 'aktif'),
  (e2,  '0001234567892', 'Kelas 2', 'Puskesmas Lembang', '2016-08-01', 'aktif'),
  (e3,  '0001234567893', 'Kelas 2', 'Puskesmas Lembang', '2016-08-01', 'aktif'),
  (e4,  '0001234567894', 'Kelas 3', 'Puskesmas Lembang', '2018-02-01', 'aktif'),
  (e5,  '0001234567895', 'Kelas 1', 'Puskesmas Lembang', '2017-08-01', 'aktif'),
  (e6,  '0001234567896', 'Kelas 2', 'Puskesmas Lembang', '2019-08-01', 'aktif'),
  (e7,  '0001234567897', 'Kelas 3', 'Puskesmas Lembang', '2019-02-01', 'aktif'),
  (e8,  '0001234567898', 'Kelas 3', 'Puskesmas Lembang', '2020-03-01', 'aktif'),
  (e9,  '0001234567899', 'Kelas 2', 'Puskesmas Lembang', '2018-08-01', 'aktif'),
  (e10, '0001234567900', 'Kelas 1', 'Puskesmas Lembang', '2016-02-01', 'aktif'),
  (e11, '0001234567901', 'Kelas 3', 'Puskesmas Lembang', '2021-04-01', 'aktif'),
  (e12, '0001234567902', 'Kelas 2', 'Puskesmas Lembang', '2020-08-01', 'aktif');

  -- ===================== KONSULTASI =====================
  insert into public.health_consultations (employee_id, requested_by, topic, description, status, handler) values
  (e8, null, 'Pola makan untuk anemia', 'Ingin konsultasi menu makanan yang cocok untuk penderita anemia ringan.', 'diajukan', null),
  (e3, null, 'Kontrol tekanan darah', 'Minta jadwal kontrol tekanan darah rutin bulanan.', 'terjadwal', 'Bidan Ratna');

  raise notice 'Data contoh MADANI HEALTHCARE berhasil dimasukkan (12 pegawai, MCU, lab, izin sakit, program, BPJS).';
end $$;

-- ============================================================================
-- LANGKAH TERAKHIR (WAJIB) - setelah membuat akun admin di:
-- Supabase Dashboard > Authentication > Users > "Add user"
--
-- Jalankan di SQL Editor. Ganti HANYA alamat email di bawah ini dengan email
-- akun yang tadi dibuat (tidak perlu menyalin UUID apa pun):
--
--   do $$
--   declare v_uid uuid;
--   begin
--     select id into v_uid from auth.users where email = 'admin@nurulfikri.sch.id';
--     if v_uid is null then
--       raise exception 'Email tidak ditemukan. Cek daftar user di Authentication > Users.';
--     end if;
--     insert into public.user_roles (user_id, role, is_active)
--     values (v_uid, 'super_admin', true)
--     on conflict (user_id) do update set role = 'super_admin', is_active = true;
--     raise notice 'OK: % sekarang super_admin.', v_uid;
--   end $$;
--
-- Ingin melihat daftar user beserta perannya dulu? Jalankan:
--
--   select u.id, u.email,
--          coalesce(ur.role::text, '(belum ada)') as role_sekarang
--     from auth.users u
--     left join public.user_roles ur on ur.user_id = u.id
--    order by u.created_at;
--
-- Catatan: '<UUID-USER>' di contoh lama adalah PLACEHOLDER - jika ditempel
-- tanpa diganti akan muncul error: invalid input syntax for type uuid.
-- ============================================================================
