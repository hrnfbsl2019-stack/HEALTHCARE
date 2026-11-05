/* ============================================================================
 * MODUL: Program Kesehatan (+ pendaftaran peserta)
 * ========================================================================== */

const PRG_TYPE = { senam: 'Senam / Olahraga', imunisasi: 'Imunisasi', edukasi: 'Edukasi Kesehatan', screening: 'Screening', gizi: 'Gizi', lainnya: 'Lainnya' };
const PRG_STATUS = { direncanakan: ['Direncanakan', 'info'], berlangsung: ['Berlangsung', 'success'], selesai: ['Selesai', 'secondary'], dibatalkan: ['Dibatalkan', 'danger'] };

App.modules.program = {
  async render(mount) {
    const canCreate = RBAC.can('program', 'create');
    const canUpdate = RBAC.can('program', 'update');
    const canDelete = RBAC.can('program', 'del');

    UI.listPage({
      mount, table: 'health_programs',
      title: 'Program Kesehatan',
      subtitle: 'Program promosi & pencegahan kesehatan pegawai (senam, edukasi gizi, screening, imunisasi).',
      select: '*, health_program_participants(count)',
      searchCols: ['name', 'description', 'location'],
      filters: [
        { key: 'program_type', label: 'Jenis', options: PRG_TYPE },
        { key: 'status', label: 'Status', options: Object.fromEntries(Object.entries(PRG_STATUS).map(([k, v]) => [k, v[0]])) }
      ],
      defaultSort: { col: 'start_date', dir: 'desc' },
      exportCols: [
        { key: 'name', label: 'Program' }, { key: 'program_type', label: 'Jenis' },
        { key: 'start_date', label: 'Mulai' }, { key: 'end_date', label: 'Selesai' },
        { key: 'location', label: 'Lokasi' }, { key: 'target_participants', label: 'Target' },
        { key: 'status', label: 'Status' }
      ],
      exportFilename: 'program_kesehatan',
      canCreate, createLabel: 'Buat Program',
      canEdit: () => canUpdate,
      canDelete: () => canDelete,
      rowActions: [
        { icon: 'bi-people', label: 'Peserta', cls: 'success', onClick: r => this.participants(r) }
      ],
      form: {
        title: 'Program Kesehatan', size: 'lg',
        fields: [
          { key: 'name', label: 'Nama Program', required: true, col: 8 },
          { key: 'program_type', label: 'Jenis', type: 'select', required: true, col: 4, options: Object.entries(PRG_TYPE).map(([v, l]) => ({ value: v, label: l })) },
          { key: 'start_date', label: 'Tanggal Mulai', type: 'date', col: 3 },
          { key: 'end_date', label: 'Tanggal Selesai', type: 'date', col: 3 },
          { key: 'location', label: 'Lokasi', col: 3 },
          { key: 'target_participants', label: 'Target Peserta', type: 'number', col: 3, min: 0 },
          { key: 'status', label: 'Status', type: 'select', col: 3, options: Object.entries(PRG_STATUS).map(([v, o]) => ({ value: v, label: o[0] })) },
          { key: 'description', label: 'Deskripsi', type: 'textarea', col: 9 }
        ]
      },
      columns: [
        { key: 'name', label: 'Nama Program', tdClass: 'fw-semibold', sortable: true },
        { key: 'program_type', label: 'Jenis', render: r => UI.badge(PRG_TYPE[r.program_type] || r.program_type, 'success-subtle text-success') },
        { key: 'start_date', label: 'Mulai', render: r => UI.fmtDate(r.start_date), sortable: true },
        { key: 'end_date', label: 'Selesai', render: r => UI.fmtDate(r.end_date) },
        { key: 'location', label: 'Lokasi' },
        {
          key: 'target_participants', label: 'Peserta / Target', sortable: true,
          render: r => {
            const n = r.health_program_participants?.[0]?.count || 0;
            const pct = r.target_participants ? Math.round(n / r.target_participants * 100) : 0;
            return `<div style="min-width:120px"><div class="small">${n} / ${r.target_participants || '-'}</div>
              <div class="progress" style="height:5px"><div class="progress-bar bg-success" style="width:${Math.min(100, pct)}%"></div></div></div>`;
          }
        },
        { key: 'status', label: 'Status', render: r => UI.enumBadge(r.status, PRG_STATUS), sortable: true }
      ]
    });
  },

  async participants(p) {
    const canManage = RBAC.can('program', 'update');
    const joined = await db.list('health_program_participants', '*, employees(employee_id,full_name,unit)', { eq: [['program_id', p.id]] });
    const iAmIn = Auth.employeeId && joined.some(j => j.employee_id === Auth.employeeId);
    const canJoin = Auth.employeeId && Auth.role === ROLES.PEG && p.status !== 'selesai' && p.status !== 'dibatalkan' && !iAmIn;

    const { el } = UI.modal({
      title: `<i class="bi bi-people-fill text-success me-1"></i>Peserta: ${UI.esc(p.name)}`,
      size: 'lg',
      body: `
        <div class="d-flex flex-wrap gap-2 mb-3 small">
          ${UI.enumBadge(p.status, PRG_STATUS)}
          <span class="badge text-bg-light border">${UI.fmtDate(p.start_date)} s.d. ${UI.fmtDate(p.end_date)}</span>
          <span class="badge text-bg-light border">${UI.esc(p.location || '-')}</span>
          <span class="badge text-bg-light border">${joined.length} peserta</span>
        </div>
        ${p.description ? `<p class="small text-muted">${UI.esc(p.description)}</p>` : ''}
        <div class="table-responsive" style="max-height:320px;overflow:auto">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light"><tr><th>#</th><th>Nama</th><th>Unit</th><th>Bergabung</th><th>Kehadiran</th>${canManage ? '<th></th>' : ''}</tr></thead>
            <tbody>
              ${joined.length ? joined.map((j, i) => `<tr>
                <td>${i + 1}</td>
                <td class="fw-semibold">${UI.esc(j.employees?.full_name || '-')}</td>
                <td>${UI.esc(j.employees?.unit || '-')}</td>
                <td class="small">${UI.fmtDate(j.joined_at)}</td>
                <td>${j.attendance_count}x</td>
                ${canManage ? `<td class="text-end text-nowrap">
                  <button class="btn btn-outline-success btn-sm" data-att="${j.id}" title="Tambah kehadiran"><i class="bi bi-plus"></i></button>
                  <button class="btn btn-outline-danger btn-sm" data-rem="${j.id}" title="Keluarkan"><i class="bi bi-x"></i></button>
                </td>` : ''}
              </tr>`).join('') : '<tr><td colspan="6" class="text-center text-muted py-3">Belum ada peserta</td></tr>'}
            </tbody>
          </table>
        </div>
        ${canJoin ? `<button class="btn btn-success btn-sm mt-3" id="join_btn"><i class="bi bi-person-plus me-1"></i>Ikuti Program Ini</button>` : ''}
        ${iAmIn ? `<div class="alert alert-success small py-2 mt-3 mb-0"><i class="bi bi-check-circle me-1"></i>Anda terdaftar sebagai peserta program ini.</div>` : ''}`,
      footer: `<button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Tutup</button>`
    });

    el.querySelectorAll('[data-att]').forEach(b => b.onclick = async () => {
      const j = joined.find(x => x.id === b.dataset.att);
      await db.update('health_program_participants', j.id, { attendance_count: (j.attendance_count || 0) + 1 });
      UI.toast('Kehadiran +1');
      bootstrap.Modal.getInstance(el).hide();
      this.participants(p);
    });
    el.querySelectorAll('[data-rem]').forEach(b => b.onclick = async () => {
      if (await UI.confirm('Keluarkan peserta ini dari program?')) {
        await db.remove('health_program_participants', b.dataset.rem);
        bootstrap.Modal.getInstance(el).hide();
        this.participants(p);
      }
    });
    el.querySelector('#join_btn')?.addEventListener('click', async () => {
      try {
        await db.insert('health_program_participants', { program_id: p.id, employee_id: Auth.employeeId, status: 'aktif' });
        UI.toast('Anda berhasil terdaftar pada program ini');
        bootstrap.Modal.getInstance(el).hide();
      } catch (e) { UI.toast(db.errMessage(e), 'danger'); }
    });
  }
};
