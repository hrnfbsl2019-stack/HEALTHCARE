/* ============================================================================
 * MODUL: Medical Check Up (jadwal, hasil, status kesehatan 5 tingkat, tindak lanjut)
 * HRD melihat JADWAL saja (RPC tanpa hasil medis) & dapat menjadwalkan MCU.
 * ========================================================================== */

const MCU_TYPE = { mcu_awal: ['MCU Awal', 'info'], mcu_periodik: ['MCU Periodik', 'primary'], mcu_khusus: ['MCU Khusus', 'warning'], mcu_keluar: ['MCU Keluar', 'secondary'] };
const MCU_STATUS = { terjadwal: ['Terjadwal', 'info'], selesai: ['Selesai', 'success'], tidak_hadir: ['Tidak Hadir', 'warning'], batal: ['Batal', 'secondary'] };

App.modules.mcu = {
  async render(mount) {
    if (Auth.role === ROLES.HRD) return this.renderHrd(mount);

    const isPeg = Auth.role === ROLES.PEG;
    const canCreate = RBAC.can('mcu', 'create');
    const canUpdate = RBAC.can('mcu', 'update');
    const canDelete = RBAC.can('mcu', 'del');

    UI.listPage({
      mount, table: 'medical_checkups',
      title: 'Medical Check Up',
      subtitle: isPeg
        ? 'Riwayat & jadwal Medical Check Up Anda. Penilaian status kesehatan ditetapkan oleh petugas kesehatan.'
        : 'Kelola jadwal & hasil MCU. Status kesehatan (5 tingkat) hanya ditetapkan oleh petugas kesehatan — aplikasi tidak melakukan diagnosis otomatis.',
      select: '*, employees(employee_id,full_name,unit)',
      searchCols: ['employees.full_name', 'employees.employee_id', 'doctor_name'],
      filters: [
        { key: 'mcu_type', label: 'Jenis', options: Object.fromEntries(Object.entries(MCU_TYPE).map(([k, v]) => [k, v[0]])) },
        { key: 'status', label: 'Status', options: Object.fromEntries(Object.entries(MCU_STATUS).map(([k, v]) => [k, v[0]])) },
        { key: 'health_status', label: 'Kesehatan', options: Object.fromEntries(Object.entries(UI.HL).map(([k, v]) => [k, v[0]])) }
      ],
      defaultSort: { col: 'checkup_date', dir: 'desc' },
      exportCols: [
        { key: 'employees.employee_id', label: 'NIP' }, { key: 'employees.full_name', label: 'Nama' },
        { key: 'checkup_date', label: 'Tanggal' }, { key: 'mcu_type', label: 'Jenis' },
        { key: 'status', label: 'Status' }, { key: 'health_status', label: 'Status Kesehatan' },
        { key: 'doctor_name', label: 'Dokter' }, { key: 'follow_up_required', label: 'Perlu TL', plain: r => r.follow_up_required ? 'Ya' : 'Tidak' }
      ],
      exportFilename: 'medical_checkup',
      canCreate,
      createLabel: 'Jadwalkan MCU',
      canEdit: () => canUpdate,
      canDelete: () => canDelete,
      rowActions: [{ icon: 'bi-eye', label: 'Detail', cls: 'success', onClick: r => this.detail(r) }],
      form: {
        title: 'Medical Check Up', size: 'lg',
        fields: [
          { key: 'employee_id', label: 'Pegawai', type: 'select', required: true, col: 6, options: () => UI.employeeOptions(true) },
          { key: 'checkup_date', label: 'Tanggal MCU', type: 'date', required: true, col: 3 },
          { key: 'mcu_type', label: 'Jenis MCU', type: 'select', required: true, col: 3, options: Object.entries(MCU_TYPE).map(([v, o]) => ({ value: v, label: o[0] })) },
          { key: 'status', label: 'Status', type: 'select', col: 3, options: Object.entries(MCU_STATUS).map(([v, o]) => ({ value: v, label: o[0] })) },
          { key: 'health_status', label: 'Status Kesehatan (hanya bila MCU selesai — oleh petugas)', type: 'select', col: 3, options: Object.entries(UI.HL).map(([v, o]) => ({ value: v, label: o[0] })) },
          { key: 'doctor_name', label: 'Dokter Pemeriksa', col: 3 },
          { key: 'next_mcu_date', label: 'Jadwal MCU Berikutnya', type: 'date', col: 3 },
          { key: 'follow_up_required', label: 'Perlu tindak lanjut', type: 'checkbox', col: 3 },
          { key: 'follow_up_notes', label: 'Catatan Tindak Lanjut', type: 'textarea', col: 6 },
          { key: 'notes', label: 'Catatan Pemeriksaan', type: 'textarea', col: 6 }
        ],
        transform: async vals => {
          if (vals.status !== 'selesai') vals.health_status = null;
          return vals;
        }
      },
      columns: [
        { key: 'employees.employee_id', label: 'NIP', tdClass: 'text-nowrap' },
        { key: 'employees.full_name', label: 'Nama' },
        { key: 'checkup_date', label: 'Tanggal', render: r => UI.fmtDate(r.checkup_date), sortable: true },
        { key: 'mcu_type', label: 'Jenis', render: r => UI.enumBadge(r.mcu_type, MCU_TYPE), sortable: true },
        { key: 'status', label: 'Status', render: r => UI.enumBadge(r.status, MCU_STATUS), sortable: true },
        { key: 'health_status', label: 'Status Kesehatan', render: r => UI.healthBadge(r.health_status) },
        { key: 'follow_up_required', label: 'TL', render: r => r.follow_up_required ? UI.badge('Ya', 'danger') : 'Tidak' },
        { key: 'doctor_name', label: 'Dokter' }
      ]
    });
  },

  /* ---------- HRD: hanya jadwal, tanpa hasil medis ---------- */
  async renderHrd(mount) {
    UI.listPage({
      mount, table: '_rpc',
      title: 'Jadwal Medical Check Up',
      subtitle: 'Mode HRD: Anda melihat <b>jadwal & kehadiran</b> MCU tanpa hasil medis individual (perlindungan data medis). Penjadwalan dilakukan di sini; hasil & penilaian oleh petugas kesehatan.',
      customFetch: async st => {
        const rows = await db.rpc('rpc_mcu_schedule');
        let out = rows;
        if (st.search) {
          const q = st.search.toLowerCase();
          out = out.filter(r => (r.nama || '').toLowerCase().includes(q) || (r.nip || '').toLowerCase().includes(q));
        }
        if (st.filters.status) out = out.filter(r => r.status === st.filters.status);
        if (st.filters.jenis) out = out.filter(r => r.jenis === st.filters.jenis);
        out.sort((a, b) => st.sort.dir === 'asc'
          ? String(a.tanggal).localeCompare(String(b.tanggal)) : String(b.tanggal).localeCompare(String(a.tanggal)));
        const total = out.length;
        const from = (st.page - 1) * st.pageSize;
        return { rows: out.slice(from, from + st.pageSize), total };
      },
      canCreate: true, createLabel: 'Jadwalkan MCU',
      canEdit: () => false, canDelete: () => false,
      rowActions: [],
      form: {
        title: 'Jadwalkan MCU (HRD)', size: 'md',
        fields: [
          { key: 'employee_id', label: 'Pegawai', type: 'select', required: true, col: 12, options: () => UI.employeeOptions(true) },
          { key: 'checkup_date', label: 'Tanggal MCU', type: 'date', required: true, col: 6 },
          { key: 'mcu_type', label: 'Jenis MCU', type: 'select', required: true, col: 6, options: Object.entries(MCU_TYPE).map(([v, o]) => ({ value: v, label: o[0] })) }
        ],
        transform: async vals => {
          await db.rpc('rpc_schedule_mcu', {
            p_employee: vals.employee_id, p_date: vals.checkup_date, p_type: vals.mcu_type
          });
          return null; // insert dicegah (payload null tidak dipakai)
        }
      },
      columns: [
        { key: 'nip', label: 'NIP', tdClass: 'text-nowrap' },
        { key: 'nama', label: 'Nama' },
        { key: 'unit', label: 'Unit', render: r => UI.badge(r.unit || '-', 'success-subtle text-success') },
        { key: 'tanggal', label: 'Tanggal', render: r => UI.fmtDate(r.tanggal), sortable: true },
        { key: 'jenis', label: 'Jenis', render: r => UI.enumBadge(r.jenis, MCU_TYPE) },
        { key: 'status', label: 'Status Kehadiran', render: r => UI.enumBadge(r.status, MCU_STATUS) },
        { key: 'perlu_tl', label: 'Perlu Tindak Lanjut', render: r => r.perlu_tl ? UI.badge('Ya', 'danger') : 'Tidak' }
      ]
    });
  },

  /* ---------- Detail MCU + sub-pemeriksaan + tindak lanjut ---------- */
  async detail(r) {
    const isMed = Auth.isAny(ROLES.SA, ROLES.PET);
    const [pe, lab, fu] = await Promise.all([
      db.list('physical_examinations', '*', { eq: [['mcu_id', r.id]] }),
      db.list('laboratory_results', '*', { eq: [['mcu_id', r.id]] }),
      db.list('health_followups', '*', { eq: [['mcu_id', r.id]], order: { col: 'created_at' } })
    ]);
    const FUSTATUS = { dijadwalkan: ['Dijadwalkan', 'info'], berlangsung: ['Berlangsung', 'warning'], selesai: ['Selesai', 'success'], ditunda: ['Ditunda', 'secondary'] };

    const sec = (title, inner, extra = '') => `
      <div class="border rounded-3 p-3 mb-3 bg-light-subtle">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="fw-bold mb-0 text-success">${title}</h6>${extra}
        </div>${inner}
      </div>`;

    const peHtml = pe.length ? `<table class="table table-sm mb-0 small">
      <tr><td class="text-muted">Tekanan Darah</td><td class="fw-semibold">${pe[0].systolic ?? '-'}/${pe[0].diastolic ?? '-'} mmHg</td>
      <td class="text-muted">Nadi</td><td class="fw-semibold">${pe[0].pulse ?? '-'} x/menit</td></tr>
      <tr><td class="text-muted">Tinggi / Berat</td><td class="fw-semibold">${pe[0].height_cm ?? '-'} cm / ${pe[0].weight_kg ?? '-'} kg</td>
      <td class="text-muted">BMI</td><td class="fw-semibold">${pe[0].bmi ? (+pe[0].bmi).toFixed(1) : '-'}</td></tr>
      <tr><td class="text-muted">Penglihatan (K/K)</td><td class="fw-semibold">${pe[0].vision_left ?? '-'} / ${pe[0].vision_right ?? '-'}</td>
      <td class="text-muted">Pendengaran</td><td class="fw-semibold">${UI.esc(pe[0].hearing || '-')}</td></tr>
    </table>${pe[0].physical_notes ? `<div class="small mt-2 text-muted">Catatan: ${UI.esc(pe[0].physical_notes)}</div>` : ''}`
      : '<div class="small text-muted">Belum ada pemeriksaan fisik.</div>';

    const labHtml = lab.length ? `<div class="table-responsive"><table class="table table-sm table-striped mb-0 small">
      <thead><tr><th>Parameter</th><th>Nilai</th><th>Parameter</th><th>Nilai</th></tr></thead><tbody>
      ${[['Hemoglobin (g/dL)', lab[0].hemoglobin], ['Leukosit', lab[0].leukocytes], ['Trombosit', lab[0].trombosit],
         ['Gula Darah Puasa', lab[0].gula_darah_puasa], ['Gula Darah 2 JPP', lab[0].gula_darah_2jpp],
         ['Kolesterol Total', lab[0].cholesterol_total], ['LDL', lab[0].ldl], ['HDL', lab[0].hdl],
         ['Trigliserida', lab[0].trigliserida], ['Asam Urat', lab[0].asam_urat], ['Kreatinin', lab[0].creatinine],
         ['SGOT', lab[0].sgot], ['SGPT', lab[0].sgpt]]
        .filter(x => x[1] !== null && x[1] !== undefined)
        .reduce((rows, x, i, arr) => {
          if (i % 2 === 0) {
            const y = arr[i + 1];
            rows.push(`<tr><td>${x[0]}</td><td class="fw-semibold">${x[1]}</td><td>${y ? y[0] : ''}</td><td class="fw-semibold">${y ? y[1] : ''}</td></tr>`);
          }
          return rows;
        }, []).join('')}
      </tbody></table></div>${lab[0].notes ? `<div class="small mt-2 text-muted">Catatan: ${UI.esc(lab[0].notes)}</div>` : ''}`
      : '<div class="small text-muted">Belum ada hasil laboratorium.</div>';

    const fuHtml = fu.length ? `<div class="table-responsive"><table class="table table-sm mb-0 small">
      <thead><tr><th>Klasifikasi</th><th>Tindakan</th><th>Batas Waktu</th><th>Status</th></tr></thead><tbody>
      ${fu.map(f => `<tr><td>${UI.healthBadge(f.classification)}</td><td>${UI.esc(f.action)}</td>
        <td>${UI.fmtDate(f.due_date)}</td><td>${UI.enumBadge(f.status, FUSTATUS)}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="small text-muted">Belum ada tindak lanjut.</div>';

    const peExtra = isMed ? `<button class="btn btn-sm btn-outline-success" id="d_add_pe"><i class="bi bi-plus"></i>Isi</button>` : '';
    const labExtra = isMed ? `<button class="btn btn-sm btn-outline-success" id="d_add_lab"><i class="bi bi-plus"></i>Isi</button>` : '';
    const fuExtra = isMed ? `<button class="btn btn-sm btn-outline-success" id="d_add_fu"><i class="bi bi-plus"></i>Buat</button>` : '';

    const { el } = UI.modal({
      title: `<i class="bi bi-clipboard2-pulse text-success me-1"></i>MCU ${UI.esc(r.employees?.full_name || '')} — ${UI.fmtDate(r.checkup_date)}`,
      size: 'lg',
      body: `
        <div class="d-flex flex-wrap gap-2 mb-3">
          ${UI.enumBadge(r.mcu_type, MCU_TYPE)} ${UI.enumBadge(r.status, MCU_STATUS)}
          <span class="ms-auto">${UI.esc(r.doctor_name ? 'Dokter: ' + r.doctor_name : '')}</span>
        </div>
        ${r.status === 'selesai' ? `<div class="mb-3">Status Kesehatan: ${UI.healthBadge(r.health_status)}</div>` : ''}
        ${r.notes ? `<div class="alert alert-light border small py-2">Catatan pemeriksaan: ${UI.esc(r.notes)}</div>` : ''}
        ${sec('<i class="bi bi-heart-pulse me-1"></i>Pemeriksaan Fisik', peHtml, peExtra)}
        ${sec('<i class="bi bi-droplet-half me-1"></i>Laboratorium', labHtml, labExtra)}
        ${sec('<i class="bi bi-arrow-repeat me-1"></i>Tindak Lanjut', fuHtml, fuExtra)}`,
      footer: `<button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Tutup</button>`
    });

    if (isMed) {
      const M = App.modules;
      el.querySelector('#d_add_pe')?.addEventListener('click', async () => {
        await M.fisik.openForm({ employee_id: r.employee_id, mcu_id: r.id });
        bootstrap.Modal.getInstance(el).hide();
        this.detail(r);
      });
      el.querySelector('#d_add_lab')?.addEventListener('click', async () => {
        await M.lab.openForm({ employee_id: r.employee_id, mcu_id: r.id, examined_at: r.checkup_date });
        bootstrap.Modal.getInstance(el).hide();
        this.detail(r);
      });
      el.querySelector('#d_add_fu')?.addEventListener('click', async () => {
        await this.followupForm({ employee_id: r.employee_id, mcu_id: r.id, classification: r.health_status });
        bootstrap.Modal.getInstance(el).hide();
        this.detail(r);
      });
    }
  },

  /* Form tindak lanjut (klasifikasi 5 tingkat -> aksi) */
  async followupForm(prefill = {}) {
    return UI.formModal({
      title: 'Buat Tindak Lanjut Kesehatan', size: 'lg',
      fields: [
        { key: 'mcu_id', type: 'hidden', label: '' },
        { key: 'employee_id', type: 'hidden', label: '' },
        { key: 'classification', label: 'Klasifikasi Hasil (5 tingkat)', type: 'select', required: true, col: 6,
          options: Object.entries(UI.HL).map(([v, o]) => ({ value: v, label: o[0] })),
          help: 'Klasifikasi DITETAPKAN oleh petugas kesehatan, bukan hasil perhitungan aplikasi.' },
        { key: 'status', label: 'Status', type: 'select', col: 6,
          options: [{ value: 'dijadwalkan', label: 'Dijadwalkan' }, { value: 'berlangsung', label: 'Berlangsung' }, { value: 'ditunda', label: 'Ditunda' }, { value: 'selesai', label: 'Selesai' }] },
        { key: 'action', label: 'Tindakan', required: true, col: 6, placeholder: 'mis. Kontrol ulang tekanan darah 1 bulan' },
        { key: 'due_date', label: 'Batas Waktu', type: 'date', col: 6 },
        { key: 'description', label: 'Deskripsi / Instruksi', type: 'textarea', col: 12 }
      ],
      values: prefill,
      onSubmit: async vals => {
        await db.insert('health_followups', vals);
        UI.toast('Tindak lanjut dibuat — notifikasi dikirim ke pegawai terkait');
        return true;
      }
    });
  }
};
