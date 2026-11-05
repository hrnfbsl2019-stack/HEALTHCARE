/* ============================================================================
 * MADANI HEALTHCARE - RBAC: 5 Peran, Menu, Matriks Izin
 * super_admin | hrd | petugas | pegawai | pimpinan
 * ========================================================================== */

const ROLES = {
  SA: 'super_admin', HRD: 'hrd', PET: 'petugas', PEG: 'pegawai', PIM: 'pimpinan'
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  hrd: 'HRD / Kepegawaian',
  petugas: 'Petugas Kesehatan',
  pegawai: 'Pegawai',
  pimpinan: 'Pimpinan'
};

const RBAC = {
  /* Menu dikelompokkan per bagian agar sidebar rapi. Setiap grup tampil
   * sebagai label kecil di sidebar & deskripsi singkat dipakai Menu Cepat. */
  MENU: [
    { id: 'dashboard',  label: 'Dashboard',           icon: 'bi-speedometer2',                roles: 'all', group: 'Utama',                desc: 'Ringkasan & grafik kesehatan' },
    { id: 'analisis',   label: 'Analisis Kesehatan',  icon: 'bi-clipboard2-data-fill',        roles: ['super_admin', 'hrd', 'petugas', 'pimpinan'], group: 'Utama', desc: 'Grafik hijau / orange / merah' },
    { id: 'pegawai',    label: 'Data Pegawai',        icon: 'bi-people-fill',                 roles: ['super_admin', 'hrd', 'petugas'], group: 'Data & Pemeriksaan', desc: 'Biodata & kepegawaian' },
    { id: 'profil',     label: 'Profil Kesehatan',    icon: 'bi-person-heart',          roles: ['super_admin', 'petugas', 'pegawai'], group: 'Data & Pemeriksaan', desc: 'Profil & kondisi kesehatan' },
    { id: 'mcu',        label: 'Medical Check Up',    icon: 'bi-clipboard2-pulse-fill',       roles: ['super_admin', 'hrd', 'petugas', 'pegawai'], group: 'Data & Pemeriksaan', desc: 'Jadwal & hasil MCU' },
    { id: 'fisik',      label: 'Pemeriksaan Fisik',   icon: 'bi-heart-pulse-fill',            roles: ['super_admin', 'petugas', 'pegawai'], group: 'Data & Pemeriksaan', desc: 'Tensi, BMI, penglihatan' },
    { id: 'lab',        label: 'Laboratorium',        icon: 'bi-droplet-half',                roles: ['super_admin', 'petugas', 'pegawai'], group: 'Data & Pemeriksaan', desc: 'Hasil tes laboratorium' },
    { id: 'riwayat',    label: 'Riwayat Kesehatan',   icon: 'bi-journal-plus',                roles: ['super_admin', 'petugas', 'pegawai'], group: 'Data & Pemeriksaan', desc: 'Penyakit pribadi & keluarga' },
    { id: 'izin',       label: 'Izin Sakit',          icon: 'bi-thermometer-half',            roles: 'all', group: 'Administrasi',         desc: 'Pengajuan & verifikasi' },
    { id: 'program',    label: 'Program Kesehatan',   icon: 'bi-activity',                    roles: 'all', group: 'Administrasi',         desc: 'Senam, edukasi, screening' },
    { id: 'bpjs',       label: 'BPJS Kesehatan',      icon: 'bi-shield-check',                roles: ['super_admin', 'hrd', 'petugas'], group: 'Administrasi', desc: 'Kepesertaan BPJS' },
    { id: 'ai',         label: 'AI Health Assistant', icon: 'bi-robot',                       roles: 'all', group: 'Lainnya',              desc: 'Tanya edukasi kesehatan' },
    { id: 'laporan',    label: 'Laporan',             icon: 'bi-file-earmark-bar-graph-fill', roles: ['super_admin', 'hrd', 'pimpinan', 'petugas'], group: 'Lainnya', desc: 'Rekap & ekspor Excel/PDF' },
    { id: 'notifikasi', label: 'Notifikasi',          icon: 'bi-bell-fill',                   roles: 'all', group: 'Lainnya',              desc: 'Pengingat & pemberitahuan' },
    { id: 'pengaturan', label: 'Pengaturan',          icon: 'bi-gear-fill',                   roles: 'all', group: 'Lainnya',              desc: 'Pengguna & sistem' }
  ],

  /* Matriks izin standar CRUD per modul.
   * 'all' = semua peran. Logika khusus (mis. hrd via RPC) ditangani di modul. */
  CAN: {
    pegawai:    { read: ['super_admin', 'hrd', 'petugas'], create: ['super_admin', 'hrd'], update: ['super_admin', 'hrd'], del: ['super_admin'] },
    profil:     { read: ['super_admin', 'petugas', 'pegawai'], create: ['super_admin', 'petugas'], update: ['super_admin', 'petugas', 'pegawai'], del: ['super_admin'] },
    mcu:        { read: ['super_admin', 'petugas', 'pegawai'], create: ['super_admin', 'petugas'], update: ['super_admin', 'petugas'], del: ['super_admin'] },
    fisik:      { read: ['super_admin', 'petugas', 'pegawai'], create: ['super_admin', 'petugas'], update: ['super_admin', 'petugas'], del: ['super_admin'] },
    lab:        { read: ['super_admin', 'petugas', 'pegawai'], create: ['super_admin', 'petugas'], update: ['super_admin', 'petugas'], del: ['super_admin'] },
    riwayat:    { read: ['super_admin', 'petugas', 'pegawai'], create: ['super_admin', 'petugas'], update: ['super_admin', 'petugas'], del: ['super_admin'] },
    konsultasi: { read: ['super_admin', 'petugas', 'pegawai'], create: ['super_admin', 'petugas', 'pegawai'], update: ['super_admin', 'petugas'], del: ['super_admin'] },
    izin:       { read: ['super_admin', 'petugas', 'pegawai'], create: ['super_admin', 'petugas', 'pegawai'], update: ['super_admin', 'petugas'], verify: ['super_admin', 'hrd'], del: ['super_admin'] },
    program:    { read: 'all', create: ['super_admin', 'hrd', 'petugas'], update: ['super_admin', 'hrd', 'petugas'], del: ['super_admin'] },
    bpjs:       { read: ['super_admin', 'hrd', 'petugas'], create: ['super_admin', 'hrd', 'petugas'], update: ['super_admin', 'hrd', 'petugas'], del: ['super_admin'] }
  },

  menuFor(role) {
    return this.MENU.filter(m => m.roles === 'all' || m.roles.includes(role));
  },

  can(module, action) {
    const m = this.CAN[module];
    if (!m) return false;
    const a = m[action];
    if (!a) return false;
    return a === 'all' || a.includes(Auth.role);
  }
};
