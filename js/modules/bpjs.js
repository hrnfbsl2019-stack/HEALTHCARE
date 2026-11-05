/* ============================================================================
 * MODUL: BPJS Kesehatan (data kepesertaan administratif)
 * KEBIJAKAN: modul ini TIDAK PERNAH menyimpan password / kredensial akun BPJS.
 * ========================================================================== */

const BPJS_STATUS = { aktif: ['Aktif', 'success'], nonaktif: ['Nonaktif', 'danger'] };

App.modules.bpjs = {
  async render(mount) {
    UI.listPage({
      mount, table: 'bpjs_health',
      title: 'BPJS Kesehatan',
      subtitle: 'Monitoring kepesertaan BPJS Kesehatan pegawai. Hanya data administratif — JANGAN PERNAH menyimpan password/kredensial akun BPJS di sistem ini.',
      select: '*, employees(employee_id,full_name,unit,position)',
      searchCols: ['employees.full_name', 'employees.employee_id', 'bpjs_number'],
      filters: [{ key: 'status', label: 'Status', options: { aktif: 'Aktif', nonaktif: 'Nonaktif' } }],
      defaultSort: { col: 'created_at', dir: 'desc' },
      exportCols: [
        { key: 'employees.employee_id', label: 'NIP' }, { key: 'employees.full_name', label: 'Nama' },
        { key: 'bpjs_number', label: 'No. BPJS' }, { key: 'bpjs_class', label: 'Kelas' },
        { key: 'faskes_tingkat1', label: 'Faskes Tingkat 1' }, { key: 'participant_since', label: 'Sejak' },
        { key: 'status', label: 'Status' }
      ],
      exportFilename: 'bpjs_kesehatan',
      canCreate: RBAC.can('bpjs', 'create'),
      createLabel: 'Tambah Kepesertaan',
      canEdit: () => RBAC.can('bpjs', 'update'),
      canDelete: () => RBAC.can('bpjs', 'del'),
      form: {
        title: 'Kepesertaan BPJS Kesehatan', size: 'lg',
        fields: [
          { key: 'employee_id', label: 'Pegawai', type: 'select', required: true, col: 6, options: () => UI.employeeOptions(true) },
          { key: 'bpjs_number', label: 'Nomor Kartu BPJS', required: true, col: 6, placeholder: '13 digit' },
          { key: 'bpjs_class', label: 'Kelas', type: 'select', col: 4, options: ['Kelas 1', 'Kelas 2', 'Kelas 3'].map(x => ({ value: x, label: x })) },
          { key: 'faskes_tingkat1', label: 'Faskes Tingkat 1', col: 4, placeholder: 'mis. Puskesmas Lembang' },
          { key: 'participant_since', label: 'Peserta Sejak', type: 'date', col: 4 },
          { key: 'status', label: 'Status', type: 'select', col: 4, options: Object.entries(BPJS_STATUS).map(([v, o]) => ({ value: v, label: o[0] })) },
          { key: 'notes', label: 'Catatan', type: 'textarea', col: 8 }
        ]
      },
      columns: [
        { key: 'employees.employee_id', label: 'NIP', tdClass: 'text-nowrap' },
        { key: 'employees.full_name', label: 'Nama' },
        { key: 'bpjs_number', label: 'No. Kartu BPJS', tdClass: 'font-monospace small' },
        { key: 'bpjs_class', label: 'Kelas', render: r => UI.badge(r.bpjs_class || '-', 'info') },
        { key: 'faskes_tingkat1', label: 'Faskes Tingkat 1' },
        { key: 'participant_since', label: 'Peserta Sejak', render: r => UI.fmtDate(r.participant_since) },
        { key: 'status', label: 'Status', render: r => UI.enumBadge(r.status, BPJS_STATUS), sortable: true }
      ]
    });
  }
};
