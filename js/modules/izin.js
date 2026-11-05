/* ============================================================================
 * MODUL: Izin Sakit
 *  - Pegawai  : ajukan & lihat miliknya
 *  - Petugas/SA : CRUD penuh (termasuk diagnosis) + verifikasi
 *  - HRD      : daftar TANPA kolom diagnosis + verifikasi (via RPC)
 *  - Pimpinan : hanya statistik agregat
 *  Catatan kebijakan: frekuensi izin sakit TIDAK boleh dijadikan satu-satunya
 *  dasar penilaian kinerja pegawai.
 * ========================================================================== */

const SL_REASON = ['Demam', 'Flu & Batuk', 'Nyeri Punggung', 'Gastritis', 'Cedera', 'Komplikasi', 'Melahirkan', 'Lainnya'];
const SL_STATUS = { menunggu: ['Menunggu Verifikasi', 'warning'], terverifikasi: ['Terverifikasi', 'success'], ditolak: ['Ditolak', 'danger'] };

App.modules.izin = {
  async render(mount) {
    if (Auth.role === ROLES.PIM) return this.stats(mount);
    if (Auth.role === ROLES.HRD) return this.renderHrd(mount);

    const isPeg = Auth.role === ROLES.PEG;
    const canCreate = RBAC.can('izin', 'create');

    UI.listPage({
      mount, table: 'sick_leaves',
      title: 'Izin Sakit',
      subtitle: isPeg
        ? 'Ajukan izin sakit Anda di sini. Pengajuan akan diverifikasi oleh HRD / petugas kesehatan.'
        : 'Kelola & verifikasi izin sakit. Kolom diagnosis hanya terlihat oleh petugas kesehatan & pemilik data (tidak untuk HRD).',
      select: '*, employees(employee_id,full_name,unit)',
      searchCols: ['employees.full_name', 'employees.employee_id', 'reason_category'],
      filters: [{ key: 'status', label: 'Status', options: Object.fromEntries(Object.entries(SL_STATUS).map(([k, v]) => [k, v[0]])) }],
      defaultSort: { col: 'start_date', dir: 'desc' },
      exportCols: [
        { key: 'employees.employee_id', label: 'NIP' }, { key: 'employees.full_name', label: 'Nama' },
        { key: 'start_date', label: 'Mulai' }, { key: 'end_date', label: 'Selesai' },
        { key: 'duration_days', label: 'Hari' }, { key: 'reason_category', label: 'Kategori' },
        { key: 'diagnosis', label: 'Diagnosis' }, { key: 'status', label: 'Status' }
      ],
      exportFilename: 'izin_sakit',
      headerExtra: this.statChips(),
      canCreate,
      createLabel: 'Ajukan Izin Sakit',
      canEdit: r => RBAC.can('izin', 'update') && r.status === 'menunggu',
      canDelete: () => RBAC.can('izin', 'del'),
      rowActions: Auth.isAny(ROLES.SA, ROLES.HRD) ? [
        { icon: 'bi-patch-check', label: 'Verifikasi', cls: 'success', show: r => r.status === 'menunggu', onClick: r => this.verify(r) }
      ] : [],
      form: {
        title: 'Izin Sakit', size: 'lg',
        fields: [
          { key: 'employee_id', label: 'Pegawai', type: 'select', required: true, col: 6, options: () => UI.employeeOptions(true) },
          { key: 'start_date', label: 'Tanggal Mulai', type: 'date', required: true, col: 3 },
          { key: 'end_date', label: 'Tanggal Selesai', type: 'date', required: true, col: 3 },
          { key: 'reason_category', label: 'Kategori Alasan', type: 'select', required: true, col: 6, options: SL_REASON.map(x => ({ value: x, label: x })) },
          { key: 'doctor_name', label: 'Nama Dokter (jika ada)', col: 3 },
          { key: 'facility', label: 'Fasilitas Kesehatan', col: 3 },
          { key: 'diagnosis', label: 'Diagnosis (khusus petugas kesehatan)', type: 'textarea', col: 12,
            show: () => Auth.isAny(ROLES.SA, ROLES.PET), help: 'Kolom ini TIDAK ditampilkan ke HRD & Pimpinan.' }
        ],
        transform: async vals => {
          if (new Date(vals.end_date) < new Date(vals.start_date)) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
          return vals;
        }
      },
      columns: [
        { key: 'employees.employee_id', label: 'NIP', tdClass: 'text-nowrap' },
        { key: 'employees.full_name', label: 'Nama' },
        { key: 'start_date', label: 'Mulai', render: r => UI.fmtDate(r.start_date), sortable: true },
        { key: 'end_date', label: 'Selesai', render: r => UI.fmtDate(r.end_date) },
        { key: 'duration_days', label: 'Hari', render: r => UI.badge(r.duration_days + ' hari', 'info'), sortable: true },
        { key: 'reason_category', label: 'Kategori', sortable: true },
        { key: 'diagnosis', label: 'Diagnosis', render: r => isPeg || Auth.isAny(ROLES.SA, ROLES.PET) ? UI.esc(r.diagnosis || '-') : '<span class="text-muted">—</span>' },
        { key: 'status', label: 'Status', render: r => UI.enumBadge(r.status, SL_STATUS), sortable: true },
        { key: 'verification_notes', label: 'Catatan Verifikasi', render: r => `<span class="small">${UI.esc(r.verification_notes || '-')}</span>` }
      ]
    });
  },

  /* ---------- HRD (via RPC tanpa diagnosis) ---------- */
  async renderHrd(mount) {
    UI.listPage({
      mount, table: '_rpc_sl',
      title: 'Izin Sakit — Mode HRD',
      subtitle: 'Anda melihat daftar izin sakit <b>tanpa kolom diagnosis</b> (kerahasiaan medis). Verifikasi dilakukan dari sini.',
      customFetch: async st => {
        const rows = await db.rpc('rpc_sick_leaves_admin');
        let out = rows;
        if (st.search) {
          const q = st.search.toLowerCase();
          out = out.filter(r => (r.nama || '').toLowerCase().includes(q) || (r.nip || '').toLowerCase().includes(q) || (r.kategori || '').toLowerCase().includes(q));
        }
        if (st.filters.status) out = out.filter(r => r.status === st.filters.status);
        out.sort((a, b) => st.sort.dir === 'asc'
          ? String(a.mulai).localeCompare(String(b.mulai)) : String(b.mulai).localeCompare(String(a.mulai)));
        const from = (st.page - 1) * st.pageSize;
        return { rows: out.slice(from, from + st.pageSize), total: out.length };
      },
      headerExtra: this.statChips(),
      canCreate: false, canEdit: () => false, canDelete: () => false,
      exportCols: [
        { key: 'nip', label: 'NIP' }, { key: 'nama', label: 'Nama' },
        { key: 'mulai', label: 'Mulai' }, { key: 'selesai', label: 'Selesai' },
        { key: 'durasi', label: 'Hari' }, { key: 'kategori', label: 'Kategori' }, { key: 'status', label: 'Status' }
      ],
      exportFilename: 'izin_sakit_hrd',
      rowActions: [
        { icon: 'bi-patch-check', label: 'Verifikasi', cls: 'success', show: r => r.status === 'menunggu', onClick: r => this.verify(r) }
      ],
      columns: [
        { key: 'nip', label: 'NIP', tdClass: 'text-nowrap' },
        { key: 'nama', label: 'Nama' },
        { key: 'unit', label: 'Unit' },
        { key: 'mulai', label: 'Mulai', render: r => UI.fmtDate(r.mulai), sortable: true },
        { key: 'selesai', label: 'Selesai', render: r => UI.fmtDate(r.selesai) },
        { key: 'durasi', label: 'Hari', render: r => UI.badge(r.durasi + ' hari', 'info') },
        { key: 'kategori', label: 'Kategori' },
        { key: 'status', label: 'Status', render: r => UI.enumBadge(r.status, SL_STATUS) }
      ]
    });
  },

  /* ---------- Pimpinan: agregat saja ---------- */
  async stats(mount) {
    const [bulan, kat] = await Promise.all([
      db.rpc('rpc_sickleave_monthly', { p_months: 12 }),
      db.rpc('rpc_sickleave_category')
    ]);
    const totKasus = bulan.reduce((a, b) => a + +b.kasus, 0);
    const totHari = bulan.reduce((a, b) => a + +b.hari, 0);
    mount.innerHTML = `
      <h1 class="h4 fw-bold mb-1">Statistik Izin Sakit</h1>
      <div class="text-muted small mb-3">Tampilan agregat anonim untuk pimpinan. Data individual tidak ditampilkan.
        <br><i class="bi bi-exclamation-triangle text-warning"></i>
        <em>Frekuensi izin sakit tidak boleh dijadikan satu-satunya dasar penilaian kinerja pegawai (kebijakan sistem).</em></div>
      <div class="row g-3 mb-4">
        ${UI.statCard({ icon: 'bi-thermometer-half', label: 'Total Kasus (12 bln)', value: totKasus, color: 'warning' })}
        ${UI.statCard({ icon: 'bi-calendar-x', label: 'Total Hari Izin (12 bln)', value: totHari, color: 'danger' })}
        ${UI.statCard({ icon: 'bi-graph-up', label: 'Rata-rata / Bulan', value: (totKasus / 12).toFixed(1), color: 'info' })}
      </div>
      <div class="row g-3">
        <div class="col-lg-7"><div class="card border-0 shadow-sm h-100"><div class="card-body">
          <h2 class="h6 fw-bold mb-3">Tren Izin Sakit 12 Bulan</h2>
          <div class="chart-box"><canvas id="iz_ch1"></canvas></div>
        </div></div></div>
        <div class="col-lg-5"><div class="card border-0 shadow-sm h-100"><div class="card-body">
          <h2 class="h6 fw-bold mb-3">Per Kategori (1 tahun)</h2>
          <div class="chart-box"><canvas id="iz_ch2"></canvas></div>
        </div></div></div>
      </div>`;
    Charts.bar('iz_ch1', bulan.map(b => b.bulan), [
      { label: 'Kasus', data: bulan.map(b => b.kasus), backgroundColor: 'rgba(245,158,11,.7)', borderRadius: 4 },
      { label: 'Hari', data: bulan.map(b => b.hari), backgroundColor: 'rgba(220,38,38,.6)', borderRadius: 4 }
    ]);
    Charts.bar('iz_ch2', kat.map(k => k.kategori), [
      { label: 'Kasus', data: kat.map(k => k.kasus), backgroundColor: 'rgba(22,101,52,.7)', borderRadius: 4 }
    ], true);
  },

  statChips: async function () {
    try {
      const [kasus, hari, tunggu] = await Promise.all([
        db.count('sick_leaves', [], { gte: [['start_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)]] }),
        0, db.count('sick_leaves', [['status', 'menunggu']])
      ]);
      const data = await db.list('sick_leaves', 'duration_days', {
        gte: [['start_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)]]
      });
      const totalHari = data.reduce((a, b) => a + (b.duration_days || 0), 0);
      return `<div class="d-flex gap-2 small">
        <span class="badge text-bg-light border">${kasus} kasus bulan ini</span>
        <span class="badge text-bg-light border">${totalHari} hari bulan ini</span>
        ${tunggu ? `<span class="badge text-bg-warning">${tunggu} menunggu verifikasi</span>` : ''}
      </div>`;
    } catch (e) { return ''; }
  },

  async verify(r) {
    await UI.formModal({
      title: 'Verifikasi Izin Sakit', size: 'md',
      fields: [
        { key: 'status', label: 'Hasil Verifikasi', type: 'select', required: true, col: 12,
          options: [{ value: 'terverifikasi', label: 'Terverifikasi (setujui)' }, { value: 'ditolak', label: 'Ditolak' }] },
        { key: 'notes', label: 'Catatan Verifikasi', type: 'textarea', col: 12 }
      ],
      onSubmit: async vals => {
        await db.rpc('rpc_verify_sick_leave', { p_id: r.id, p_status: vals.status, p_notes: vals.notes || null });
        UI.toast('Status verifikasi tersimpan');
        App.modules.izin.render(document.getElementById('page-content'));
        return true;
      }
    });
  }
};
