/* ============================================================================
 * MADANI HEALTHCARE - MODE DEMO (data contoh lokal, tanpa Supabase)
 * ----------------------------------------------------------------------------
 * Aktif otomatis HANYA bila js/config.js masih berisi placeholder.
 * Mengemulasi subset supabase-js (auth / from() / rpc()) yang dipakai aplikasi,
 * dengan dataset yang MENCERMINKAN supabase/03_seed.sql sehingga demo = produksi.
 * Semua data hilang saat halaman dimuat ulang (in-memory).
 * ========================================================================== */

(function () {
  'use strict';

  /* ---------- util ---------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
  const daysAhead = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const nowIso = () => new Date().toISOString();
  const U = i => 'd0000000-0000-4000-8000-' + String(i).padStart(12, '0');
  let _seq = 9000;
  const nid = () => U(++_seq);

  /* ---------- PEMETAAN 3 LEVEL (harus sama dengan RPC SQL) ---------- */
  const TRIAGE_MAP = {
    hijau:  ['sehat'],
    orange: ['sehat_catatan', 'pemantauan'],
    merah:  ['tindak_lanjut', 'perawatan']
  };
  const levelOf = st => { for (const k in TRIAGE_MAP) if (TRIAGE_MAP[k].includes(st)) return k; return null; };

  /* ============================ DATASET ============================ */
  const EMP = [
    // id, nip, nama, JK, lahir, jabatan, unit, telp, email, masuk
    [1, 'NF-2015-001', 'Ahmad Fauzi, S.Pd.I', 'L', '1980-04-12', 'Kepala Sekolah', 'Pendidikan', '0812-1000-0001', 'ahmad.fauzi@nurulfikri.sch.id', '2015-07-01'],
    [2, 'NF-2016-002', 'Siti Nurhaliza, S.Pd', 'P', '1985-09-03', 'Guru Tahfidz', 'Pendidikan', '0812-1000-0002', 'siti.n@nurulfikri.sch.id', '2016-07-01'],
    [3, 'NF-2016-003', 'Budi Santoso, S.Si', 'L', '1982-01-20', 'Guru Matematika', 'Pendidikan', '0812-1000-0003', 'budi.s@nurulfikri.sch.id', '2016-07-01'],
    [4, 'NF-2018-004', 'Dewi Lestari, A.Md', 'P', '1990-06-15', 'Staf Tata Usaha', 'Administrasi', '0812-1000-0004', 'dewi.l@nurulfikri.sch.id', '2018-01-10'],
    [5, 'NF-2017-005', 'Rudi Hartono', 'L', '1979-11-08', 'Mudirul Mahad (Pengasuh)', 'Asrama', '0812-1000-0005', 'rudi.h@nurulfikri.sch.id', '2017-07-16'],
    [6, 'NF-2019-006', 'Nur Aisyah, S.Pd', 'P', '1988-03-25', 'Pengasuh Asrama Putri', 'Asrama', '0812-1000-0006', 'aisyah.n@nurulfikri.sch.id', '2019-07-01'],
    [7, 'NF-2019-007', 'Joko Prasetyo', 'L', '1992-08-30', 'Petugas Keamanan', 'Umum', '0812-1000-0007', 'joko.p@nurulfikri.sch.id', '2019-01-15'],
    [8, 'NF-2020-008', 'Fitri Handayani', 'P', '1995-02-14', 'Staf Dapur', 'Umum', '0812-1000-0008', 'fitri.h@nurulfikri.sch.id', '2020-02-03'],
    [9, 'NF-2018-009', 'Agus Setiawan, S.Hum', 'L', '1986-12-05', 'Guru Bahasa Arab', 'Pendidikan', '0812-1000-0009', 'agus.s@nurulfikri.sch.id', '2018-07-02'],
    [10, 'NF-2016-010', 'Ratna Sari, S.E', 'P', '1984-07-19', 'Bendahara', 'Administrasi', '0812-1000-0010', 'ratna.s@nurulfikri.sch.id', '2016-01-11'],
    [11, 'NF-2021-011', 'Hendra Gunawan', 'L', '1993-05-22', 'Petugas Kebersihan', 'Umum', '0812-1000-0011', 'hendra.g@nurulfikri.sch.id', '2021-03-01'],
    [12, 'NF-2020-012', 'Maya Anggraini, S.Psi', 'P', '1991-10-09', 'Guru BK', 'Pendidikan', '0812-1000-0012', 'maya.a@nurulfikri.sch.id', '2020-07-13']
  ].map(r => ({
    id: U(r[0]), employee_id: r[1], full_name: r[2], gender: r[3], birth_date: r[4], position: r[5],
    unit: r[6], phone: r[7], email: r[8], join_date: r[9], employment_status: 'aktif',
    photo_url: null, created_at: nowIso(), updated_at: nowIso()
  }));
  const emp = i => EMP.find(e => e.id === U(i));

  const HP = [ // profil kesehatan: [emp, gol, tinggi, berat, rokok, alergi, kronis, kontak, telp]
    [1, 'O', 170, 74, 'tidak_merokok', null, null, 'Halimah (istri)', '0813-2000-0001'],
    [2, 'A', 158, 52, 'tidak_merokok', 'Debu', null, 'Rahmat (suami)', '0813-2000-0002'],
    [3, 'B', 168, 82, 'mantan_perokok', 'Seafood', 'Hipertensi (2019)', 'Lina (istri)', '0813-2000-0003'],
    [4, 'AB', 160, 55, 'tidak_merokok', null, null, 'Sari (saudara)', '0813-2000-0004'],
    [5, 'O', 172, 88, 'tidak_merokok', null, 'Diabetes Tipe 2 (2021)', 'Umi (istri)', '0813-2000-0005'],
    [6, 'A', 155, 50, 'tidak_merokok', null, null, 'Yusuf (suami)', '0813-2000-0006'],
    [7, 'B', 175, 70, 'perokok', null, null, 'Siti (istri)', '0813-2000-0007'],
    [8, 'O', 157, 46, 'tidak_merokok', 'Rumput laut', 'Anemia ringan', 'Ibu Wati', '0813-2000-0008'],
    [9, 'A', 165, 65, 'tidak_merokok', null, null, 'Aminah (istri)', '0813-2000-0009'],
    [10, 'B', 162, 68, 'tidak_merokok', 'Debu', 'Hepatitis (riwayat)', 'Dewi (saudara)', '0813-2000-0010'],
    [11, 'O', 170, 62, 'tidak_merokok', null, null, 'Rudi (saudara)', '0813-2000-0011'],
    [12, 'AB', 163, 58, 'tidak_merokok', null, null, 'Andi (suami)', '0813-2000-0012']
  ].map(r => ({
    id: nid(), employee_id: U(r[0]), blood_type: r[1], height_cm: r[2], weight_kg: r[3],
    bmi: +(r[3] / Math.pow(r[2] / 100, 2)).toFixed(1), smoking_status: r[4], allergies: r[5],
    chronic_conditions: r[6], emergency_contact_name: r[7], emergency_contact_phone: r[8],
    notes: null, created_at: nowIso(), updated_at: nowIso()
  }));

  // MCU selesai: [emp, hariLalu, jenis, statusKesehatan(5 tingkat), dokter, perluTL, catatanTL, mcuBerikutnya(hari)]
  const MCU_DONE = [
    [1, 330, 'mcu_periodik', 'sehat', 'dr. Sarah Amalia', false, null, null],
    [2, 300, 'mcu_periodik', 'sehat', 'dr. Sarah Amalia', false, null, null],
    [3, 360, 'mcu_periodik', 'pemantauan', 'dr. Sarah Amalia', true, 'Kontrol tekanan darah rutin tiap bulan', 25],
    [4, 270, 'mcu_periodik', 'sehat', 'dr. Bagus Prakoso', false, null, null],
    [5, 240, 'mcu_periodik', 'tindak_lanjut', 'dr. Sarah Amalia', true, 'Rujukan ke internis untuk gula darah tinggi', 10],
    [6, 210, 'mcu_awal', 'sehat', 'dr. Bagus Prakoso', false, null, null],
    [7, 180, 'mcu_periodik', 'sehat_catatan', 'dr. Sarah Amalia', true, 'Edukasi berhenti merokok', null],
    [8, 150, 'mcu_periodik', 'sehat_catatan', 'dr. Bagus Prakoso', true, 'Konsultasi gizi: anemia ringan', 5],
    [9, 120, 'mcu_periodik', 'sehat', 'dr. Sarah Amalia', false, null, null],
    [10, 90, 'mcu_periodik', 'perawatan', 'dr. Sarah Amalia', true, 'Program pengobatan hepatitis, monitoring lab berkala', 15],
    [11, 60, 'mcu_awal', 'sehat', 'dr. Bagus Prakoso', false, null, null],
    [12, 30, 'mcu_periodik', 'sehat', 'dr. Sarah Amalia', false, null, null]
  ];
  const MCU = MCU_DONE.map((r, i) => ({
    id: U(100 + i + 1), employee_id: U(r[0]), checkup_date: daysAgo(r[1]), mcu_type: r[2], status: 'selesai',
    health_status: r[3], doctor_name: r[4], notes: null, follow_up_required: r[5], follow_up_notes: r[6],
    next_mcu_date: r[7] ? daysAhead(r[7]) : null, created_by: null, created_at: nowIso(), updated_at: nowIso()
  }));
  // MCU terjadwal (memicu fitur pengingat)
  [[3, 20, 'mcu_periodik'], [5, 12, 'mcu_khusus'], [10, 7, 'mcu_khusus']].forEach((r, i) =>
    MCU.push({
      id: U(120 + i + 1), employee_id: U(r[0]), checkup_date: daysAhead(r[1]), mcu_type: r[2], status: 'terjadwal',
      health_status: null, doctor_name: 'dr. Sarah Amalia', notes: null, follow_up_required: false,
      follow_up_notes: null, next_mcu_date: null, created_by: null, created_at: nowIso(), updated_at: nowIso()
    }));

  // Pemeriksaan fisik: [mcuIdx1based, emp, sys, dia, nadi, tinggi, berat, visusL, visusR, dengar, catatan]
  const FISIK = [
    [1, 1, 122, 80, 76, 170, 74, '1.0', '1.0', 'normal', 'Kondisi umum baik'],
    [2, 2, 110, 75, 80, 158, 52, '1.2', '1.2', 'normal', 'Kondisi umum baik'],
    [3, 3, 150, 95, 84, 168, 82, '0.9', '1.0', 'normal', 'Tekanan darah tinggi, perlu pemantauan'],
    [4, 4, 115, 78, 82, 160, 55, '1.0', '1.0', 'normal', 'Kondisi umum baik'],
    [5, 5, 135, 88, 88, 172, 88, '1.0', '0.8', 'normal', 'Berat badan berlebih, kadar gula perlu kontinuitas'],
    [6, 6, 108, 70, 78, 155, 50, '1.2', '1.2', 'normal', 'Kondisi umum baik'],
    [7, 7, 128, 84, 74, 175, 70, '1.0', '1.0', 'normal', 'Perlu edukasi berhenti merokok'],
    [8, 8, 105, 70, 86, 157, 46, '1.2', '1.2', 'normal', 'BB kurang, anemia ringan'],
    [9, 9, 118, 76, 72, 165, 65, '1.0', '1.0', 'normal', 'Kondisi umum baik'],
    [10, 10, 120, 80, 80, 162, 68, '1.0', '1.0', 'normal', 'Terapi hepatitis berjalan'],
    [11, 11, 125, 82, 78, 170, 62, '1.0', '1.0', 'normal', 'Kondisi umum baik'],
    [12, 12, 112, 74, 76, 163, 58, '1.2', '1.2', 'normal', 'Kondisi umum baik']
  ].map((r, i) => ({
    id: U(200 + i + 1), mcu_id: U(100 + r[0]), employee_id: U(r[1]), systolic: r[2], diastolic: r[3],
    pulse: r[4], height_cm: r[5], weight_kg: r[6], bmi: +(r[6] / Math.pow(r[5] / 100, 2)).toFixed(1),
    vision_left: r[7], vision_right: r[8], hearing: r[9], physical_notes: r[10],
    created_at: nowIso(), updated_at: nowIso()
  }));

  // Lab: [mcu, emp, tglLalu, hb, leuko, hct, trom, gdp, 2jpp, kol, ldl, hdl, tg, ua, crea, sgot, sgpt, up, ug, ub, notes]
  const LAB = [
    [1, 1, 330, 14.5, 7.2, 42, 250, 92, 118, 185, 110, 48, 140, 5.8, 0.9, 26, 30, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'],
    [2, 2, 300, 12.8, 6.8, 38, 260, 88, 110, 170, 98, 52, 120, 4.5, 0.8, 22, 24, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'],
    [3, 3, 360, 15.2, 7.5, 45, 240, 105, 140, 240, 150, 40, 210, 6.9, 1.0, 30, 38, 'negatif', 'negatif', 'negatif', 'Kolesterol total & LDL tinggi'],
    [4, 4, 270, 13.0, 7.0, 40, 270, 90, 112, 175, 105, 50, 135, 4.8, 0.8, 24, 28, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'],
    [5, 5, 240, 14.8, 8.1, 44, 235, 178, 260, 220, 135, 38, 260, 7.4, 1.1, 34, 44, 'negatif', 'positif', 'negatif', 'Gula darah tinggi - rujuk internis'],
    [6, 6, 210, 12.5, 6.5, 37, 265, 85, 105, 160, 92, 55, 110, 4.2, 0.7, 20, 22, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'],
    [7, 7, 180, 15.0, 7.4, 44, 245, 95, 120, 200, 120, 45, 160, 6.5, 0.9, 28, 32, 'negatif', 'negatif', 'negatif', 'Asam urat batas atas'],
    [8, 8, 150, 10.5, 6.9, 33, 255, 86, 108, 165, 95, 48, 125, 4.0, 0.7, 21, 25, 'negatif', 'negatif', 'negatif', 'Hemoglobin rendah - anemia ringan'],
    [9, 9, 120, 14.2, 7.1, 43, 248, 93, 115, 180, 108, 47, 138, 5.6, 0.9, 25, 29, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'],
    [10, 10, 90, 13.2, 7.8, 41, 240, 96, 122, 190, 112, 44, 150, 5.9, 1.3, 52, 78, 'negatif', 'negatif', 'negatif', 'SGOT/SGPT tinggi - monitoring hepatitis'],
    [11, 11, 60, 14.6, 7.3, 43, 252, 91, 116, 178, 106, 49, 142, 5.7, 0.9, 26, 31, 'negatif', 'negatif', 'negatif', 'Dalam batas normal'],
    [12, 12, 30, 12.9, 6.7, 39, 262, 87, 109, 168, 96, 51, 118, 4.4, 0.8, 23, 26, 'negatif', 'negatif', 'negatif', 'Dalam batas normal']
  ].map((r, i) => ({
    id: U(300 + i + 1), mcu_id: U(100 + r[0]), employee_id: U(r[1]), examined_at: daysAgo(r[2]),
    hemoglobin: r[3], leukocytes: r[4], hematocrit: r[5], trombosit: r[6], gula_darah_puasa: r[7],
    gula_darah_2jpp: r[8], cholesterol_total: r[9], ldl: r[10], hdl: r[11], trigliserida: r[12],
    asam_urat: r[13], creatinine: r[14], sgot: r[15], sgpt: r[16], urine_protein: r[17],
    urine_glucose: r[18], urine_blood: r[19], notes: r[20], created_at: nowIso(), updated_at: nowIso()
  }));

  const HIST = [
    [3, 'pribadi', 'Hipertensi', 2019, 'Amlodipin 5mg harian', 'Kontrol rutin bulanan', true],
    [3, 'keluarga', 'Stroke (ayah)', null, null, 'Riwayat keluarga', false],
    [5, 'pribadi', 'Diabetes Melitus Tipe 2', 2021, 'Metformin 500mg', 'Diet & obat rutin', true],
    [5, 'keluarga', 'Diabetes (ayah)', 2010, null, 'Riwayat keluarga', false],
    [8, 'pribadi', 'Anemia defisiensi besi', 2023, 'Tablet tambah darah', 'Perbaikan pola makan', true],
    [10, 'pribadi', 'Hepatitis B', 2024, 'Terapi antiviral', 'Monitoring lab tiap 3 bulan', true],
    [7, 'pribadi', 'Batuk berkepanjangan', 2022, 'Terapi simtomatik', 'Berhenti merokok disarankan', false]
  ].map(r => ({
    id: nid(), employee_id: U(r[0]), history_type: r[1], condition_name: r[2], diagnosed_year: r[3],
    treatment: r[4], notes: r[5], is_active: r[6], created_at: nowIso(), updated_at: nowIso()
  }));

  // Izin sakit: [emp, mulai(-hari), selesai(-hari), kategori, diagnosis, dokter, fasilitas, status, catatanVer]
  const IZIN = [
    [2, 320, 318, 'Demam', 'Demam berdarah dengue', 'dr. Sarah Amalia', 'Klinik Lembang', 'terverifikasi', 'Surat dokter lengkap'],
    [7, 280, 278, 'Flu & Batuk', 'ISPA', 'dr. Bagus Prakoso', 'Puskesmas Lembang', 'terverifikasi', null],
    [3, 200, 198, 'Nyeri Punggung', 'Nyeri punggung bawah (myalgia)', 'dr. Sarah Amalia', 'Klinik Lembang', 'terverifikasi', 'Sarankan peregangan rutin'],
    [8, 170, 168, 'Gastritis', 'Gastritis akut', 'dr. Bagus Prakoso', 'Puskesmas Lembang', 'terverifikasi', null],
    [6, 150, 90, 'Melahirkan', 'Persalinan normal', 'dr. Ratna Dewi', 'RSUD Bandung', 'terverifikasi', 'Cuti melahirkan 2 bulan'],
    [11, 120, 117, 'Cedera', 'Tersprain pergelangan kaki', 'dr. Sarah Amalia', 'Klinik Lembang', 'terverifikasi', null],
    [4, 95, 94, 'Flu & Batuk', 'Pharyngitis', 'dr. Bagus Prakoso', 'Puskesmas Lembang', 'terverifikasi', null],
    [5, 60, 58, 'Komplikasi', 'Kontrol gula darah tinggi', 'dr. Sarah Amalia', 'Klinik Lembang', 'terverifikasi', null],
    [9, 25, 24, 'Demam', 'Demam tifoid suspek', 'dr. Bagus Prakoso', 'Puskesmas Lembang', 'terverifikasi', null],
    [12, 3, 2, 'Flu & Batuk', 'ISPA', null, null, 'menunggu', null],
    [3, 1, 0, 'Demam', 'Demam', null, null, 'menunggu', null]
  ].map((r, i) => ({
    id: U(500 + i + 1), employee_id: U(r[0]), start_date: daysAgo(r[1]), end_date: daysAgo(r[2]),
    duration_days: r[1] - r[2] + 1, reason_category: r[3], diagnosis: r[4], doctor_name: r[5],
    facility: r[6], attachment_url: null, status: r[7], verified_by: null,
    verified_at: r[7] === 'terverifikasi' ? new Date(Date.now() - (r[2] - 1) * 864e5).toISOString() : null,
    verification_notes: r[8], created_at: nowIso(), updated_at: nowIso()
  }));

  const PROG = [
    [1, 'Senam Sehat Jumat', 'senam', 'Senam bersama seluruh pegawai setiap Jumat pagi untuk menjaga kebugaran.', -90, null, 'Lapangan Utama', 30, 'berlangsung'],
    [2, 'Edukasi Gizi Seimbang', 'edukasi', 'Sosialisasi Isi Piringku & pengendalian gula-garam-lemak untuk pegawai dapur dan asrama.', -150, -150, 'Aula YPPIM', 25, 'selesai'],
    [3, 'Screening Kesehatan Gratis', 'screening', 'Pemeriksaan tekanan darah, gula darah, dan asam urat gratis untuk seluruh pegawai.', 21, 21, 'Aula YPPIM', 40, 'direncanakan']
  ].map(r => ({
    id: U(600 + r[0]), name: r[1], program_type: r[2], description: r[3],
    start_date: r[4] < 0 ? daysAgo(-r[4]) : daysAhead(r[4]),
    end_date: r[5] === null ? null : (r[5] < 0 ? daysAgo(-r[5]) : daysAhead(r[5])),
    location: r[6], target_participants: r[7], status: r[8], created_by: null, created_at: nowIso(), updated_at: nowIso()
  }));

  const PROG_PART = [
    [1, 1, 10], [1, 2, 11], [1, 3, 8], [1, 4, 12], [1, 6, 9], [1, 9, 10], [1, 12, 11], [1, 7, 6],
    [2, 2, 1], [2, 4, 1], [2, 8, 1], [2, 6, 1], [2, 10, 1],
    [3, 3, 0], [3, 5, 0], [3, 10, 0]
  ].map(r => ({
    id: nid(), program_id: U(600 + r[0]), employee_id: U(r[1]), attendance_count: r[2],
    joined_at: nowIso(), status: 'aktif', created_at: nowIso(), updated_at: nowIso()
  }));

  const BPJS = EMP.map((e, i) => ({
    id: U(700 + i + 1), employee_id: e.id, bpjs_number: '000123456789' + (i + 1),
    bpjs_class: i % 3 === 0 ? 'Kelas 1' : i % 3 === 1 ? 'Kelas 2' : 'Kelas 3',
    faskes_tingkat1: 'Puskesmas Lembang', participant_since: e.join_date, status: 'aktif',
    notes: null, created_at: nowIso(), updated_at: nowIso()
  }));

  const KONSUL = [
    [8, 'Pola makan untuk anemia', 'Ingin konsultasi menu makanan yang cocok untuk penderita anemia ringan.', 'diajukan', null],
    [3, 'Kontrol tekanan darah', 'Minta jadwal kontrol tekanan darah rutin bulanan.', 'terjadwal', 'Bidan Ratna']
  ].map(r => ({
    id: nid(), employee_id: U(r[0]), requested_by: null, topic: r[1], description: r[2],
    status: r[3], scheduled_at: null, handler: r[4], result_notes: null, created_at: nowIso(), updated_at: nowIso()
  }));

  const FOLLOW = [
    [5, 100 + 5, 'tindak_lanjut', 'Rujuk ke internis (gula darah tinggi)', 10, 'dijadwalkan'],
    [10, 100 + 10, 'perawatan', 'Monitoring lab hepatitis tiap 3 bulan', 15, 'berlangsung'],
    [3, 100 + 3, 'pemantauan', 'Kontrol tekanan darah bulanan di klinik', 25, 'dijadwalkan']
  ].map(r => ({
    id: nid(), mcu_id: U(r[1]), employee_id: U(r[0]), classification: r[2], action: r[3],
    description: null, due_date: daysAhead(r[4]), status: r[5], completed_at: null,
    created_by: null, created_at: nowIso(), updated_at: nowIso()
  }));

  /* ---------- pengguna demo (5 peran) ---------- */
  const DEMO_USERS = [
    { id: U(9991), email: 'superadmin@demo.id', pass: 'demo123', display: 'H. Muhammad Rizal, S.Kom', role: 'super_admin', active: true, employee_id: null },
    { id: U(9992), email: 'hrd@demo.id', pass: 'demo123', display: 'Rina Marlina, S.E', role: 'hrd', active: true, employee_id: null },
    { id: U(9993), email: 'petugas@demo.id', pass: 'demo123', display: 'Ns. Dewi Anggraini, A.Md.Kep', role: 'petugas', active: true, employee_id: null },
    { id: U(9994), email: 'pegawai@demo.id', pass: 'demo123', display: 'Budi Santoso, S.Si', role: 'pegawai', active: true, employee_id: U(3) },
    { id: U(9995), email: 'pimpinan@demo.id', pass: 'demo123', display: 'H. Drs. Abdul Karim, M.Pd.', role: 'pimpinan', active: true, employee_id: null }
  ];

  const NOTIF = [
    { user: U(9994), title: 'Pengingat Jadwal MCU', msg: 'MCU Anda dijadwalkan pada ' + daysAhead(20) + ' (mcu_periodik). Mohon hadir tepat waktu.', tipe: 'pengingat', link: 'mcu:x', read: false, umur: 2 },
    { user: U(9994), title: 'Tindak Lanjut Kesehatan', msg: 'Halo Budi Santoso, ada tindak lanjut kesehatan baru: Kontrol tekanan darah rutin tiap bulan.', tipe: 'tindak_lanjut', link: '#/notifikasi', read: false, umur: 5 },
    { user: U(9994), title: 'Program Kesehatan', msg: 'Screening Kesehatan Gratis akan diselenggarakan. Anda terdaftar sebagai peserta.', tipe: 'info', link: '#/program', read: true, umur: 12 }
  ].map(r => ({
    id: nid(), user_id: r.user, title: r.title, message: r.msg, notification_type: r.tipe,
    link: r.link, is_read: r.read, created_at: new Date(Date.now() - r.umur * 864e5).toISOString()
  }));

  const AUDIT = [
    ['INSERT', 'medical_checkups', 1], ['INSERT', 'sick_leaves', 2], ['UPDATE', 'health_profiles', 3]
  ].map((r, i) => ({
    id: nid(), user_id: U(9993), user_email: 'petugas@demo.id', action: r[0], table_name: r[1],
    record_id: U(r[2]), old_data: null, new_data: null, user_agent: 'demo',
    created_at: new Date(Date.now() - (i + 1) * 36e5).toISOString()
  }));

  const D = {
    employees: EMP, health_profiles: HP, medical_checkups: MCU, physical_examinations: FISIK,
    laboratory_results: LAB, medical_histories: HIST, health_consultations: KONSUL,
    health_followups: FOLLOW, sick_leaves: IZIN, health_programs: PROG,
    health_program_participants: PROG_PART, bpjs_health: BPJS, health_documents: [],
    notifications: NOTIF, audit_logs: AUDIT,
    user_roles: DEMO_USERS.map(u => ({
      id: nid(), user_id: u.id, role: u.role, employee_id: u.employee_id,
      is_active: u.active, approved_by: null, created_at: nowIso(), updated_at: nowIso()
    }))
  };

  /* ==================== EMBARDED RESOURCES (select "*, rel(...)") ==================== */
  const FK = { employees: 'employee_id', health_programs: 'program_id', medical_checkups: 'mcu_id' };

  function parseSelect(sel) {
    const cols = [], embeds = [];
    let depth = 0, cur = '';
    (sel || '*').split('').forEach(ch => {
      if (ch === '(') { depth++; cur += ch; }
      else if (ch === ')') { depth--; cur += ch; }
      else if (ch === ',' && depth === 0) { cols.push(cur); cur = ''; }
      else cur += ch;
    });
    if (cur.trim()) cols.push(cur);
    cols.forEach(c => {
      c = c.trim(); if (!c) return;
      const m = c.match(/^([a-z_]+)\((.*)\)$/);
      if (m && FK[m[1]] !== undefined) embeds.push({ rel: m[1], fields: m[2].split(',').map(s => s.trim()) });
      else if (c !== '*') cols._plain = (cols._plain || []).concat(c);
    });
    return { embeds };
  }

  function attachEmbeds(rows, embeds) {
    rows.forEach(r => embeds.forEach(e => {
      const fk = FK[e.rel];
      const target = (D[e.rel] || []).find(t => t.id === r[fk]) || null;
      if (target && e.fields.length && !(e.fields.length === 1 && e.fields[0] === '*')) {
        const slim = {}; e.fields.forEach(f => slim[f] = target[f]);
        r[e.rel] = slim;
      } else r[e.rel] = target;
    }));
  }

  /* ==================== QUERY BUILDER ==================== */
  function matches(r, st) {
    for (const f of st.filters) if (!f(r)) return false;
    if (st.orRaw) {
      const toks = st.orRaw.split(',').map(s => s.trim()).filter(Boolean);
      const ok = toks.some(t => {
        const m = t.match(/^([a-z_]+)\.(ilike|eq|gte|lte)\.(.*)$/);
        if (!m) return false;
        const [, col, op, raw] = m;
        const v = raw.replace(/^%|%$/g, '');
        const rv = r[col];
        if (op === 'ilike') return rv != null && String(rv).toLowerCase().includes(v.toLowerCase());
        if (op === 'eq') return String(rv) === v;
        return rv != null && String(rv) >= v;
      });
      if (!ok) return false;
    }
    return true;
  }

  function qInit(table) {
    const st = { table, filters: [], orRaw: null, order: null, range: null, limit: null, op: 'select', payload: null, selOpts: {}, selectStr: '*' };
    const q = {
      select(s, o) { st.selectStr = s || '*'; st.selOpts = o || {}; return q; },
      eq(k, v) { st.filters.push(r => r[k] === v); return q; },
      neq(k, v) { st.filters.push(r => r[k] !== v); return q; },
      gte(k, v) { st.filters.push(r => r[k] != null && String(r[k]) >= String(v)); return q; },
      lte(k, v) { st.filters.push(r => r[k] != null && String(r[k]) <= String(v)); return q; },
      gt(k, v) { st.filters.push(r => r[k] != null && String(r[k]) > String(v)); return q; },
      in(k, vs) { st.filters.push(r => (vs || []).includes(r[k])); return q; },
      or(expr) { st.orRaw = expr; return q; },
      order(k, o = {}) { st.order = { k, asc: o.ascending !== false }; return q; },
      range(a, b) { st.range = [a, b]; return q; },
      limit(n) { st.limit = n; return q; },
      update(p) { st.op = 'update'; st.payload = p; return q; },
      insert(p) { st.op = 'insert'; st.payload = p; return q; },
      delete() { st.op = 'delete'; return q; },
      single() { return exec().then(res => { const row = res.data && res.data[0]; return { data: row || null, error: row ? null : { message: 'Tidak ada data (single)', code: 'PGRST116' } }; }); },
      maybeSingle() { return exec().then(res => ({ data: (res.data && res.data[0]) || null, error: null })); },
      then(res, rej) { return exec().then(res, rej); }
    };
    function exec() {
      try {
        const tbl = D[st.table];
        if (!tbl) return Promise.resolve({ data: [], error: { message: 'Tabel demo tidak dikenal: ' + st.table } });
        if (st.op === 'select') {
          let rows = tbl.filter(r => matches(r, st));
          const { embeds } = parseSelect(st.selectStr);
          const withEmbed = embeds.length > 0;
          if (withEmbed) attachEmbeds(rows, embeds);
          if (st.order) {
            rows = rows.slice().sort((a, b) => {
              const va = a[st.order.k], vb = b[st.order.k];
              const c = va === vb ? 0 : (va == null ? 1 : vb == null ? -1 : (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))));
              return st.order.asc ? c : -c;
            });
          }
          let count;
          if (st.selOpts.count === 'exact') count = rows.length;
          if (st.range) rows = rows.slice(st.range[0], st.range[1] + 1);
          if (st.limit) rows = rows.slice(0, st.limit);
          if (st.selOpts.head) rows = [];
          return Promise.resolve({ data: rows, error: null, count: count !== undefined ? count : rows.length });
        }
        if (st.op === 'insert') {
          const arr = Array.isArray(st.payload) ? st.payload : [st.payload];
          const out = arr.map(p => Object.assign({ id: nid(), created_at: nowIso(), updated_at: nowIso() }, p));
          D[st.table].push(...out);
          return Promise.resolve({ data: out, error: null, count: out.length });
        }
        if (st.op === 'update') {
          const out = [];
          D[st.table].forEach(r => {
            if (matches(r, st)) { Object.assign(r, st.payload, { updated_at: nowIso() }); out.push(r); }
          });
          return Promise.resolve({ data: out, error: null, count: out.length });
        }
        if (st.op === 'delete') {
          D[st.table] = D[st.table].filter(r => !matches(r, st));
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      } catch (e) { return Promise.resolve({ data: null, error: { message: e.message } }); }
    }
    return q;
  }

  /* ==================== HELPER AGREGAT (cermin RPC SQL) ==================== */
  const monthLabel = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  function lastMonths(n) {
    const out = [], now = new Date();
    for (let i = n - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push(monthLabel(d)); }
    return out;
  }
  function latestMap() { // MCU selesai terakhir per pegawai
    const m = {};
    D.medical_checkups.forEach(mc => {
      if (mc.status !== 'selesai' || !mc.health_status) return;
      if (!m[mc.employee_id] || mc.checkup_date > m[mc.employee_id].checkup_date) m[mc.employee_id] = mc;
    });
    return m;
  }
  const aktif = () => D.employees.filter(e => e.employment_status === 'aktif');
  const myRole = () => { const u = curUser(); return u ? u.role : null; };
  const myEmp = () => { const u = curUser(); return u ? u.employee_id : null; };
  function roleOk(roles) { const r = myRole(); return r && roles.includes(r); }
  function forbidden() { return { data: null, error: { message: 'Akses ditolak' } }; }

  const RPCS = {
    rpc_dashboard_counts() {
      if (!roleOk(['super_admin', 'hrd', 'petugas', 'pimpinan'])) return forbidden();
      const m0 = monthLabel(new Date());
      const month = d => String(d).startsWith(m0);
      const yr = String(new Date().getFullYear());
      const ver = D.sick_leaves.filter(s => s.status === 'terverifikasi' && String(s.start_date).startsWith(m0));
      return { data: {
        total_pegawai: aktif().length,
        mcu_bulan_ini: D.medical_checkups.filter(m => month(m.checkup_date)).length,
        mcu_terjadwal: D.medical_checkups.filter(m => m.status === 'terjadwal' && m.checkup_date >= iso(new Date())).length,
        perlu_tindak_lanjut: D.medical_checkups.filter(m => ['pemantauan', 'tindak_lanjut', 'perawatan'].includes(m.health_status)).length,
        izin_bulan_ini: ver.length,
        izin_hari_bulan_ini: ver.reduce((a, s) => a + (s.duration_days || 0), 0),
        izin_menunggu: D.sick_leaves.filter(s => s.status === 'menunggu').length,
        program_aktif: D.health_programs.filter(p => p.status === 'berlangsung').length,
        konsultasi_menunggu: D.health_consultations.filter(c => c.status === 'diajukan').length,
        bpjs_aktif: D.bpjs_health.filter(b => b.status === 'aktif').length
      }, error: null };
    },

    rpc_health_status_distribution() {
      if (!roleOk(['super_admin', 'hrd', 'petugas', 'pimpinan'])) return forbidden();
      const lm = latestMap();
      const cnt = s => Object.values(lm).filter(m => m.health_status === s).length;
      const ids = Object.keys(lm);
      const belum = aktif().filter(e => !ids.includes(e.id)).length;
      return { data: [
        { label: 'Sehat', jumlah: cnt('sehat') },
        { label: 'Sehat dgn Catatan', jumlah: cnt('sehat_catatan') },
        { label: 'Perlu Pemantauan', jumlah: cnt('pemantauan') },
        { label: 'Perlu Tindak Lanjut', jumlah: cnt('tindak_lanjut') },
        { label: 'Perlu Perawatan', jumlah: cnt('perawatan') },
        { label: 'Belum MCU', jumlah: belum }
      ].sort((a, b) => b.jumlah - a.jumlah), error: null };
    },

    rpc_mcu_monthly(p) {
      if (!roleOk(['super_admin', 'hrd', 'petugas', 'pimpinan'])) return forbidden();
      return { data: lastMonths(p.p_months || 12).map(b => {
        const rows = D.medical_checkups.filter(m => String(m.checkup_date).startsWith(b));
        return { bulan: b, total: rows.length,
          selesai: rows.filter(r => r.status === 'selesai').length,
          terjadwal: rows.filter(r => r.status === 'terjadwal').length };
      }), error: null };
    },

    rpc_sickleave_monthly(p) {
      if (!roleOk(['super_admin', 'hrd', 'petugas', 'pimpinan'])) return forbidden();
      return { data: lastMonths(p.p_months || 12).map(b => {
        const rows = D.sick_leaves.filter(s => String(s.start_date).startsWith(b));
        return { bulan: b, kasus: rows.length,
          hari: rows.filter(r => r.status === 'terverifikasi').reduce((a, r) => a + (r.duration_days || 0), 0) };
      }), error: null };
    },

    rpc_sickleave_category() {
      if (!roleOk(['super_admin', 'hrd', 'petugas', 'pimpinan'])) return forbidden();
      const lim = daysAgo(365), g = {};
      D.sick_leaves.filter(s => s.status === 'terverifikasi' && s.start_date >= lim)
        .forEach(s => { (g[s.reason_category] = g[s.reason_category] || { kasus: 0, hari: 0 });
          g[s.reason_category].kasus++; g[s.reason_category].hari += s.duration_days || 0; });
      return { data: Object.entries(g).map(([kategori, v]) => ({ kategori, ...v })).sort((a, b) => b.kasus - a.kasus), error: null };
    },

    rpc_unit_summary() {
      if (!roleOk(['super_admin', 'hrd', 'petugas', 'pimpinan'])) return forbidden();
      const lm = latestMap(), lim = daysAgo(365);
      const units = [...new Set(aktif().map(e => e.unit || 'Tanpa Unit'))];
      return { data: units.map(u => {
        const emps = aktif().filter(e => (e.unit || 'Tanpa Unit') === u);
        const cnt = s => emps.filter(e => lm[e.id] && lm[e.id].health_status === s).length;
        return { unit: u, total_pegawai: emps.length,
          sehat: cnt('sehat'), sehat_catatan: cnt('sehat_catatan'), pemantauan: cnt('pemantauan'),
          tindak_lanjut: cnt('tindak_lanjut'), perawatan: cnt('perawatan'),
          belum_mcu: emps.filter(e => !lm[e.id]).length,
          izin_hari: D.sick_leaves.filter(s => s.status === 'terverifikasi' && s.start_date >= lim &&
            emps.some(e => e.id === s.employee_id)).reduce((a, s) => a + (s.duration_days || 0), 0) };
      }).sort((a, b) => b.total_pegawai - a.total_pegawai), error: null };
    },

    rpc_program_stats() {
      if (!roleOk(['super_admin', 'hrd', 'petugas', 'pimpinan'])) return forbidden();
      return { data: D.health_programs.map(p => ({
        nama: p.name, jenis: p.program_type, status: p.status, mulai: p.start_date,
        peserta: D.health_program_participants.filter(x => x.program_id === p.id).length,
        target: p.target_participants || 0
      })), error: null };
    },

    rpc_mcu_schedule() {
      if (!roleOk(['super_admin', 'hrd', 'petugas'])) return forbidden();
      const rows = D.medical_checkups.slice().sort((a, b) => String(b.checkup_date).localeCompare(String(a.checkup_date)))
        .map(m => { const e = D.employees.find(x => x.id === m.employee_id) || {};
          return { id: m.id, nip: e.employee_id, nama: e.full_name, unit: e.unit, tanggal: m.checkup_date,
            jenis: m.mcu_type, status: m.status, perlu_tl: m.follow_up_required }; });
      return { data: rows, error: null };
    },

    rpc_schedule_mcu(p) {
      if (!roleOk(['super_admin', 'hrd', 'petugas'])) return forbidden();
      D.medical_checkups.push({ id: nid(), employee_id: p.p_employee, checkup_date: p.p_date,
        mcu_type: p.p_type, status: 'terjadwal', health_status: null, doctor_name: null, notes: null,
        follow_up_required: false, follow_up_notes: null, next_mcu_date: null,
        created_by: curUser() ? curUser().id : null, created_at: nowIso(), updated_at: nowIso() });
      return { data: null, error: null };
    },

    rpc_sick_leaves_admin() {
      if (!roleOk(['super_admin', 'hrd', 'petugas'])) return forbidden();
      const rows = D.sick_leaves.slice().sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)))
        .map(s => { const e = D.employees.find(x => x.id === s.employee_id) || {};
          return { id: s.id, nip: e.employee_id, nama: e.full_name, unit: e.unit,
            mulai: s.start_date, selesai: s.end_date, durasi: s.duration_days,
            kategori: s.reason_category, status: s.status, fasilitas: s.facility,
            dokter: s.doctor_name, diverifikasi: s.verified_at, catatan_verifikasi: s.verification_notes }; });
      return { data: rows, error: null };
    },

    rpc_verify_sick_leave(p) {
      if (!roleOk(['super_admin', 'hrd'])) return forbidden();
      const s = D.sick_leaves.find(x => x.id === p.p_id);
      if (s) { s.status = p.p_status; s.verification_notes = p.p_notes || null; s.verified_at = nowIso(); }
      return { data: null, error: null };
    },

    rpc_my_dashboard() {
      const vEmp = myEmp();
      if (!vEmp) return { data: { no_profile: true }, error: null };
      const done = D.medical_checkups.filter(m => m.employee_id === vEmp && m.status === 'selesai')
        .sort((a, b) => String(b.checkup_date).localeCompare(String(a.checkup_date)));
      const next = D.medical_checkups.filter(m => m.employee_id === vEmp && m.status === 'terjadwal' && m.checkup_date >= iso(new Date()))
        .sort((a, b) => String(a.checkup_date).localeCompare(String(b.checkup_date)))[0];
      const yr = iso(new Date()).slice(0, 4);
      const izinY = D.sick_leaves.filter(s => s.employee_id === vEmp && s.status === 'terverifikasi' && String(s.start_date).startsWith(yr));
      const lab = D.laboratory_results.filter(l => l.employee_id === vEmp)
        .sort((a, b) => String(b.examined_at || '').localeCompare(String(a.examined_at || '')))[0];
      return { data: {
        no_profile: false,
        last_mcu: done[0] ? { tanggal: done[0].checkup_date, status: done[0].health_status, jenis: done[0].mcu_type } : null,
        next_mcu: next ? { tanggal: next.checkup_date, jenis: next.mcu_type } : null,
        izin_tahun_ini: izinY.reduce((a, s) => a + (s.duration_days || 0), 0),
        izin_kasus_tahun_ini: D.sick_leaves.filter(s => s.employee_id === vEmp && String(s.start_date).startsWith(yr)).length,
        program_diikuti: D.health_program_participants.filter(p => p.employee_id === vEmp).length,
        lab_terakhir: lab ? { tanggal: lab.examined_at, gdp: lab.gula_darah_puasa, kolesterol: lab.cholesterol_total,
          asam_urat: lab.asam_urat, hb: lab.hemoglobin, sgpt: lab.sgpt } : null
      }, error: null };
    },

    rpc_users_list() {
      if (!roleOk(['super_admin'])) return forbidden();
      return { data: D.user_roles.map(ur => {
        const u = DEMO_USERS.find(x => x.id === ur.user_id) || {};
        const e = D.employees.find(x => x.id === ur.employee_id);
        return { user_id: ur.user_id, email: u.email || null, role: ur.role, is_active: ur.is_active,
          employee_id: ur.employee_id, nama_pegawai: e ? e.full_name : null };
      }), error: null };
    },

    rpc_user_set_role(p) {
      if (!roleOk(['super_admin'])) return forbidden();
      const ur = D.user_roles.find(x => x.user_id === p.p_user);
      if (ur) { ur.role = p.p_role; ur.employee_id = p.p_employee || null; ur.is_active = p.p_active !== false; }
      const u = DEMO_USERS.find(x => x.id === p.p_user);
      if (u) { u.role = p.p_role; u.employee_id = p.p_employee || null; u.active = p.p_active !== false; }
      return { data: null, error: null };
    },

    rpc_generate_mcu_reminders(p) {
      if (!roleOk(['super_admin', 'petugas'])) return forbidden();
      const today = iso(new Date()), lim = iso(new Date(Date.now() + (p.p_days || 7) * 864e5));
      let n = 0;
      D.medical_checkups.filter(m => m.status === 'terjadwal' && m.checkup_date >= today && m.checkup_date <= lim)
        .forEach(m => {
          const ur = D.user_roles.find(x => x.employee_id === m.employee_id && x.is_active);
          if (!ur) return;
          const dup = D.notifications.some(nt => nt.user_id === ur.user_id && nt.link === 'mcu:' + m.id &&
            String(nt.created_at).slice(0, 10) === today);
          if (dup) return;
          D.notifications.push({ id: nid(), user_id: ur.user_id, title: 'Pengingat Jadwal MCU',
            message: 'MCU Anda dijadwalkan pada ' + m.checkup_date + ' (' + m.mcu_type + '). Mohon hadir tepat waktu.',
            notification_type: 'pengingat', link: 'mcu:' + m.id, is_read: false, created_at: nowIso() });
          n++;
        });
      return { data: n, error: null };
    },

    /* ===== BARU: ANALISIS KONDISI KESEHATAN (hijau / orange / merah) ===== */
    rpc_health_triage(p) {
      if (!roleOk(['super_admin', 'hrd', 'petugas', 'pimpinan'])) return forbidden();
      const lm = latestMap();
      const pool = p && p.p_unit ? aktif().filter(e => e.unit === p.p_unit) : aktif();
      const cnt = { hijau: 0, orange: 0, merah: 0 };
      pool.forEach(e => {
        const l = lm[e.id] ? levelOf(lm[e.id].health_status) : null;
        if (l) cnt[l]++;
      });
      const total = pool.length;
      return { data: { total_aktif: total, hijau: cnt.hijau, orange: cnt.orange, merah: cnt.merah,
        belum_mcu: total - cnt.hijau - cnt.orange - cnt.merah }, error: null };
    },

    rpc_health_triage_by_unit() {
      if (!roleOk(['super_admin', 'hrd', 'petugas', 'pimpinan'])) return forbidden();
      const lm = latestMap();
      const units = [...new Set(aktif().map(e => e.unit || 'Tanpa Unit'))];
      return { data: units.map(u => {
        const emps = aktif().filter(e => (e.unit || 'Tanpa Unit') === u);
        const c = { hijau: 0, orange: 0, merah: 0, belum: 0 };
        emps.forEach(e => { const l = lm[e.id] ? levelOf(lm[e.id].health_status) : null; c[l || 'belum']++; });
        return { unit: u, total_pegawai: emps.length, hijau: c.hijau, orange: c.orange, merah: c.merah, belum: c.belum };
      }).sort((a, b) => b.total_pegawai - a.total_pegawai), error: null };
    },

    rpc_health_triage_trend(p) {
      if (!roleOk(['super_admin', 'hrd', 'petugas', 'pimpinan'])) return forbidden();
      const empUnit = {};
      D.employees.forEach(e => empUnit[e.id] = e.unit);
      const inUnit = m => !(p && p.p_unit) || empUnit[m.employee_id] === p.p_unit;
      return { data: lastMonths(p.p_months || 6).map(b => {
        const rows = D.medical_checkups.filter(m => m.status === 'selesai' && m.health_status &&
          String(m.checkup_date).startsWith(b) && inUnit(m));
        const c = k => rows.filter(r => TRIAGE_MAP[k].includes(r.health_status)).length;
        return { bulan: b, hijau: c('hijau'), orange: c('orange'), merah: c('merah') };
      }), error: null };
    },

    rpc_health_triage_list(p) {
      if (!roleOk(['super_admin', 'petugas'])) return forbidden();
      const lvl = p.p_level;
      if (!TRIAGE_MAP[lvl]) return { data: null, error: { message: 'Parameter level tidak valid (hijau/orange/merah)' } };
      const lm = latestMap();
      const ord = { perawatan: 0, tindak_lanjut: 1, pemantauan: 2, sehat_catatan: 3, sehat: 4 };
      const rows = aktif().map(e => ({ e, m: lm[e.id] }))
        .filter(x => x.m && TRIAGE_MAP[lvl].includes(x.m.health_status))
        .sort((a, b) => (ord[a.m.health_status] - ord[b.m.health_status]) || a.e.full_name.localeCompare(b.e.full_name))
        .map(x => ({ employee_id: x.e.id, nip: x.e.employee_id, nama: x.e.full_name, unit: x.e.unit,
          health_status: x.m.health_status, tanggal: x.m.checkup_date,
          perlu_tl: x.m.follow_up_required, catatan: x.m.follow_up_notes || null }));
      return { data: rows, error: null };
    }
  };

  /* ==================== AUTH MOCK ==================== */
  const LS_KEY = 'madani_demo_uid';
  function curUser() {
    const uid = localStorage.getItem(LS_KEY);
    return uid ? DEMO_USERS.find(u => u.id === uid) || null : null;
  }
  const pubUser = u => ({ id: u.id, email: u.email, user_metadata: { display_name: u.display },
    app_metadata: {}, aud: 'authenticated', created_at: nowIso() });
  const cbs = [];

  const DemoSupabase = {
    create() {
      return {
        auth: {
          async getSession() {
            const u = curUser();
            return { data: { session: u ? { user: pubUser(u), access_token: 'demo' } : null }, error: null };
          },
          async signInWithPassword({ email, password }) {
            const u = DEMO_USERS.find(x => x.email.toLowerCase() === String(email).toLowerCase() && x.pass === password);
            if (!u) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials', status: 400 } };
            localStorage.setItem(LS_KEY, u.id);
            cbs.forEach(cb => { try { cb('SIGNED_IN', { user: pubUser(u) }); } catch (e) {} });
            return { data: { user: pubUser(u), session: { user: pubUser(u) } }, error: null };
          },
          async signUp({ email, password, options }) {
            if (DEMO_USERS.some(x => x.email.toLowerCase() === String(email).toLowerCase()))
              return { data: { user: null, session: null }, error: { message: 'User already registered', status: 422 } };
            const nu = { id: nid(), email, pass: password, display: (options && options.data && options.data.display_name) || email.split('@')[0],
              role: 'pegawai', active: false, employee_id: null };
            DEMO_USERS.push(nu);
            D.user_roles.push({ id: nid(), user_id: nu.id, role: 'pegawai', employee_id: null, is_active: false,
              approved_by: null, created_at: nowIso(), updated_at: nowIso() });
            return { data: { user: pubUser(nu), session: null }, error: null };
          },
          async signOut() { localStorage.removeItem(LS_KEY); cbs.forEach(cb => { try { cb('SIGNED_OUT', null); } catch (e) {} }); return { error: null }; },
          async updateUser({ password }) { const u = curUser(); if (u) u.pass = password; return { data: { user: u ? pubUser(u) : null }, error: null }; },
          onAuthStateChange(cb) { cbs.push(cb); return { data: { subscription: { unsubscribe() {} } } }; }
        },
        from(table) { return qInit(table); },
        async rpc(fn, params = {}) {
          const f = RPCS[fn];
          if (!f) return { data: null, error: { message: 'RPC demo tidak tersedia: ' + fn } };
          return f(params);
        },
        storage: {
          from() {
            return {
              async upload() { return { data: null, error: { message: 'Unggah file memerlukan Supabase aktif (fitur Storage tidak tersedia di mode demo).' } }; },
              async createSignedUrl() { return { data: null, error: { message: 'Storage tidak tersedia di mode demo.' } }; }
            };
          }
        }
      };
    }
  };

  /* ---------- informasi demo utk layar login ---------- */
  DemoSupabase.accounts = DEMO_USERS.filter(u => u.active).map(u => ({ email: u.email, pass: u.pass, display: u.display, role: u.role }));
  window.DemoSupabase = DemoSupabase;
  window.DEMO_MODE = true;
})();
