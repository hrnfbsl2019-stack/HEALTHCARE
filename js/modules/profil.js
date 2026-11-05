/* ============================================================================
 * MODUL: Profil Kesehatan + Konsultasi
 *  - Pegawai : profil miliknya + ajukan konsultasi
 *  - Petugas/SA : kelola semua profil + tanggapi konsultasi
 * ========================================================================== */

const SMOKE = { tidak_merokok: ['Tidak Merokok', 'success'], mantan_perokok: ['Mantan Perokok', 'secondary'], perokok: ['Perokok', 'danger'] };
const CONS_STATUS = { diajukan: ['Diajukan', 'warning'], terjadwal: ['Terjadwal', 'info'], selesai: ['Selesai', 'success'], dibatalkan: ['Dibatalkan', 'secondary'] };

App.modules.profil = {
  async render(mount) {
    if (Auth.role === ROLES.PEG) return this.personal(mount);

    mount.innerHTML = `<div id="pf_table"></div><div class="mt-4" id="pf_cons"></div>`;

    UI.listPage({
      mount: document.getElementById('pf_table'), table: 'health_profiles',
      title: 'Profil Kesehatan Pegawai',
      subtitle: 'Data dasar kesehatan (gol. darah, antropometri, kebiasaan, kontak darurat). BMI dihitung otomatis dari tinggi & berat.',
      select: '*, employees(employee_id,full_name,unit)',
      searchCols: ['employees.full_name', 'employees.employee_id', 'allergies', 'chronic_conditions'],
      defaultSort: { col: 'created_at', dir: 'desc' },
      exportCols: [
        { key: 'employees.employee_id', label: 'NIP' }, { key: 'employees.full_name', label: 'Nama' },
        { key: 'blood_type', label: 'Gol. Darah' }, { key: 'height_cm', label: 'Tinggi (cm)' },
        { key: 'weight_kg', label: 'Berat (kg)' }, { key: 'bmi', label: 'BMI' },
        { key: 'smoking_status', label: 'Merokok' }, { key: 'chronic_conditions', label: 'Kondisi Kronis' }
      ],
      exportFilename: 'profil_kesehatan',
      canCreate: RBAC.can('profil', 'create'),
      createLabel: 'Tambah Profil',
      canEdit: () => RBAC.can('profil', 'update'),
      canDelete: () => RBAC.can('profil', 'del'),
      form: {
        title: 'Profil Kesehatan', size: 'lg',
        fields: [
          { key: 'employee_id', label: 'Pegawai', type: 'select', required: true, col: 6, options: () => UI.employeeOptions(true) },
          { key: 'blood_type', label: 'Golongan Darah', type: 'select', col: 3, options: ['A', 'B', 'AB', 'O'].map(x => ({ value: x, label: x })) },
          { key: 'smoking_status', label: 'Status Merokok', type: 'select', col: 3, options: Object.entries(SMOKE).map(([v, o]) => ({ value: v, label: o[0] })) },
          { key: 'height_cm', label: 'Tinggi (cm)', type: 'number', step: '0.1', col: 3 },
          { key: 'weight_kg', label: 'Berat (kg)', type: 'number', step: '0.1', col: 3, help: '<span id="bmi_preview" class="text-success fw-bold"></span>' },
          { key: 'allergies', label: 'Alergi', col: 3, placeholder: 'mis. debu, seafood' },
          { key: 'chronic_conditions', label: 'Kondisi Kronis', type: 'textarea', col: 6, placeholder: 'mis. hipertensi, diabetes (atau kosongkan)' },
          { key: 'emergency_contact_name', label: 'Kontak Darurat - Nama', col: 3 },
          { key: 'emergency_contact_phone', label: 'Kontak Darurat - No. HP', col: 3 },
          { key: 'notes', label: 'Catatan', type: 'textarea', col: 12 }
        ],
        transform: async vals => { delete vals.bmi; return vals; }
      },
      columns: [
        { key: 'employees.employee_id', label: 'NIP', tdClass: 'text-nowrap' },
        { key: 'employees.full_name', label: 'Nama' },
        { key: 'blood_type', label: 'Gol. Darah', render: r => UI.badge(r.blood_type || '-', 'danger-subtle text-danger') },
        { key: 'height_cm', label: 'Tinggi', render: r => r.height_cm ? r.height_cm + ' cm' : '-' },
        { key: 'weight_kg', label: 'Berat', render: r => r.weight_kg ? r.weight_kg + ' kg' : '-' },
        { key: 'bmi', label: 'BMI', render: r => this.bmiBadge(r.bmi) },
        { key: 'smoking_status', label: 'Merokok', render: r => UI.enumBadge(r.smoking_status, SMOKE) },
        { key: 'chronic_conditions', label: 'Kondisi Kronis', render: r => UI.esc(r.chronic_conditions || '-') },
        { key: 'emergency_contact_name', label: 'Kontak Darurat', render: r => r.emergency_contact_name ? `${UI.esc(r.emergency_contact_name)}<br><small class="text-muted">${UI.esc(r.emergency_contact_phone || '')}</small>` : '-' }
      ]
    });

    this.renderConsultations(document.getElementById('pf_cons'));
  },

  bmiBadge(bmi) {
    if (!bmi) return '-';
    const v = +bmi;
    const cat = v < 18.5 ? ['Kurus', 'warning'] : v < 25 ? ['Normal', 'success'] : v < 30 ? ['Berlebih', 'warning'] : ['Obesitas', 'danger'];
    return `<span class="badge text-bg-${cat[1]}">${v.toFixed(1)} · ${cat[0]}</span>`;
  },

  /* ============ Konsultasi kesehatan ============ */
  renderConsultations(m) {
    const isPet = Auth.isAny(ROLES.SA, ROLES.PET);
    UI.listPage({
      mount: m, table: 'health_consultations',
      title: isPet ? 'Permintaan Konsultasi Masuk' : 'Konsultasi Kesehatan',
      subtitle: isPet ? 'Tanggapi permintaan konsultasi pegawai: jadwalkan, lalu isi hasil konsultasi.' : 'Ajukan permintaan konsultasi kesehatan kepada petugas.',
      select: '*, employees(employee_id,full_name,unit)',
      searchCols: ['employees.full_name', 'topic'],
      filters: [{ key: 'status', label: 'Status', options: Object.fromEntries(Object.entries(CONS_STATUS).map(([k, v]) => [k, v[0]])) }],
      defaultSort: { col: 'created_at', dir: 'desc' },
      pageSize: 5,
      canCreate: RBAC.can('konsultasi', 'create'),
      createLabel: 'Ajukan Konsultasi',
      canEdit: () => false,
      canDelete: () => RBAC.can('konsultasi', 'del'),
      rowActions: isPet ? [
        { icon: 'bi-calendar-check', label: 'Tanggapi', cls: 'primary', show: r => r.status === 'diajukan' || r.status === 'terjadwal', onClick: r => this.handle(r) }
      ] : [],
      form: {
        title: 'Ajukan Konsultasi Kesehatan', size: 'md',
        fields: [
          { key: 'employee_id', label: 'Pegawai', type: 'select', required: true, col: 12, options: () => UI.employeeOptions() },
          { key: 'topic', label: 'Topik / Keluhan', required: true, col: 12, placeholder: 'mis. Pola makan untuk anemia' },
          { key: 'description', label: 'Deskripsi Singkat', type: 'textarea', col: 12 }
        ]
      },
      columns: [
        ...(isPet ? [{ key: 'employees.full_name', label: 'Pemohon', render: r => `${UI.esc(r.employees?.full_name || '-')}<br><small class="text-muted">${UI.esc(r.employees?.employee_id || '')}</small>` }] : []),
        { key: 'topic', label: 'Topik', tdClass: 'fw-semibold' },
        { key: 'description', label: 'Deskripsi', render: r => `<span class="small">${UI.esc(r.description || '-')}</span>` },
        { key: 'status', label: 'Status', render: r => UI.enumBadge(r.status, CONS_STATUS) },
        { key: 'handler', label: 'Penanggung Jawab', render: r => UI.esc(r.handler || '-') },
        { key: 'result_notes', label: 'Hasil', render: r => `<span class="small">${UI.esc(r.result_notes || '-')}</span>` },
        { key: 'created_at', label: 'Diajukan', render: r => UI.fmtDate(r.created_at), sortable: true }
      ]
    });
  },

  async handle(r) {
    await UI.formModal({
      title: 'Tanggapi Konsultasi', size: 'md',
      fields: [
        { key: 'status', label: 'Status', type: 'select', required: true, col: 6, options: [{ value: 'terjadwal', label: 'Terjadwal' }, { value: 'selesai', label: 'Selesai' }, { value: 'dibatalkan', label: 'Dibatalkan' }] },
        { key: 'scheduled_at', label: 'Jadwal (jika dijadwalkan)', type: 'date', col: 6 },
        { key: 'handler', label: 'Ditangani Oleh', col: 6, value: 'Petugas Kesehatan' },
        { key: 'result_notes', label: 'Catatan / Hasil Konsultasi', type: 'textarea', col: 12 }
      ],
      values: { status: r.status === 'diajukan' ? 'terjadwal' : r.status, handler: r.handler, result_notes: r.result_notes },
      onSubmit: async vals => {
        await db.update('health_consultations', r.id, vals);
        UI.toast('Konsultasi diperbarui');
        App.modules.profil.render(document.getElementById('page-content'));
        return true;
      }
    });
  },

  /* ============ Tampilan PEGAWAI ============ */
  async personal(mount) {
    if (!Auth.employeeId) {
      mount.innerHTML = `<div class="alert alert-info border-0 shadow-sm">Akun Anda belum terhubung dengan data pegawai. Hubungi HRD / Petugas Kesehatan.</div>`;
      return;
    }
    const [prof] = await db.list('health_profiles', '*', { eq: [['employee_id', Auth.employeeId]] });
    const p = prof || {};

    const row = (k, v) => `<div class="col-6 col-md-4 mb-2"><div class="small text-muted">${k}</div><div class="fw-semibold">${UI.esc(v ?? '-')}</div></div>`;
    mount.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h1 class="h4 fw-bold mb-1">Profil Kesehatan Saya</h1>
          <div class="text-muted small">Data ini dapat Anda perbarui. Pemeriksaan medis tetap ditangani petugas kesehatan.</div>
        </div>
        <button class="btn btn-success btn-sm" id="pf_edit"><i class="bi bi-pencil me-1"></i>Perbarui Profil</button>
      </div>
      <div class="card border-0 shadow-sm mb-4"><div class="card-body">
        <div class="row">
          ${row('Golongan Darah', p.blood_type)}
          ${row('Tinggi / Berat', (p.height_cm ? p.height_cm + ' cm' : '-') + ' / ' + (p.weight_kg ? p.weight_kg + ' kg' : '-'))}
          ${row('BMI', p.bmi ? this.bmiBadge(p.bmi) : '-')}
          ${row('Status Merokok', (SMOKE[p.smoking_status] || ['-'])[0])}
          ${row('Alergi', p.allergies)}
          ${row('Kondisi Kronis', p.chronic_conditions)}
          ${row('Kontak Darurat', p.emergency_contact_name)}
          ${row('No. Kontak Darurat', p.emergency_contact_phone)}
          ${row('Catatan', p.notes)}
        </div>
      </div></div>
      <div id="pf_cons"></div>`;

    document.getElementById('pf_edit').onclick = () => {
      UI.formModal({
        title: 'Perbarui Profil Kesehatan', size: 'lg',
        fields: [
          { key: 'blood_type', label: 'Golongan Darah', type: 'select', col: 3, options: ['A', 'B', 'AB', 'O'].map(x => ({ value: x, label: x })) },
          { key: 'height_cm', label: 'Tinggi (cm)', type: 'number', step: '0.1', col: 3 },
          { key: 'weight_kg', label: 'Berat (kg)', type: 'number', step: '0.1', col: 3, help: '<span id="bmi_preview" class="text-success fw-bold"></span>' },
          { key: 'smoking_status', label: 'Status Merokok', type: 'select', col: 3, options: Object.entries(SMOKE).map(([v, o]) => ({ value: v, label: o[0] })) },
          { key: 'allergies', label: 'Alergi', col: 3 },
          { key: 'chronic_conditions', label: 'Kondisi Kronis', col: 3 },
          { key: 'emergency_contact_name', label: 'Kontak Darurat - Nama', col: 3 },
          { key: 'emergency_contact_phone', label: 'Kontak Darurat - HP', col: 3 },
          { key: 'notes', label: 'Catatan', type: 'textarea', col: 12 }
        ],
        values: p,
        onSubmit: async vals => {
          if (prof) await db.update('health_profiles', prof.id, vals);
          else await db.insert('health_profiles', Object.assign({ employee_id: Auth.employeeId }, vals));
          UI.toast('Profil diperbarui');
          this.render(mount);
          return true;
        }
      });
    };

    this.renderConsultations(document.getElementById('pf_cons'));
  }
};
