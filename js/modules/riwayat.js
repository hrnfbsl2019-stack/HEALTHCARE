/* ============================================================================
 * MODUL: Riwayat Kesehatan (riwayat penyakit pribadi & keluarga)
 * ========================================================================== */

const MH_TYPE = { pribadi: ['Pribadi', 'primary'], keluarga: ['Keluarga', 'info'] };

App.modules.riwayat = {
  async render(mount) {
    UI.listPage({
      mount, table: 'medical_histories',
      title: 'Riwayat Kesehatan',
      subtitle: 'Riwayat penyakit pribadi & keluarga pegawai. Data ini bersifat medis-rahasia (akses: petugas kesehatan & pemilik data).',
      select: '*, employees(employee_id,full_name,unit)',
      searchCols: ['employees.full_name', 'employees.employee_id', 'condition_name'],
      filters: [{ key: 'history_type', label: 'Jenis', options: { pribadi: 'Pribadi', keluarga: 'Keluarga' } }],
      defaultSort: { col: 'created_at', dir: 'desc' },
      exportCols: [
        { key: 'employees.employee_id', label: 'NIP' }, { key: 'employees.full_name', label: 'Nama' },
        { key: 'history_type', label: 'Jenis' }, { key: 'condition_name', label: 'Kondisi' },
        { key: 'diagnosed_year', label: 'Tahun' }, { key: 'treatment', label: 'Pengobatan' },
        { key: 'is_active', label: 'Aktif', plain: r => r.is_active ? 'Ya' : 'Tidak' }
      ],
      exportFilename: 'riwayat_kesehatan',
      canCreate: RBAC.can('riwayat', 'create'),
      createLabel: 'Tambah Riwayat',
      canEdit: () => RBAC.can('riwayat', 'update'),
      canDelete: () => RBAC.can('riwayat', 'del'),
      form: {
        title: 'Riwayat Kesehatan', size: 'lg',
        fields: [
          { key: 'employee_id', label: 'Pegawai', type: 'select', required: true, col: 6, options: () => UI.employeeOptions(true) },
          { key: 'history_type', label: 'Jenis Riwayat', type: 'select', required: true, col: 3, options: Object.entries(MH_TYPE).map(([v, o]) => ({ value: v, label: o[0] })) },
          { key: 'diagnosed_year', label: 'Tahun Diagnosis', type: 'number', col: 3, min: 1950, max: 2100 },
          { key: 'condition_name', label: 'Nama Kondisi / Penyakit', required: true, col: 6 },
          { key: 'is_active', label: 'Masih berlangsung / perlu perhatian', type: 'checkbox', col: 6 },
          { key: 'treatment', label: 'Pengobatan / Penanganan', col: 6 },
          { key: 'notes', label: 'Catatan', type: 'textarea', col: 12 }
        ]
      },
      columns: [
        { key: 'employees.employee_id', label: 'NIP', tdClass: 'text-nowrap' },
        { key: 'employees.full_name', label: 'Nama' },
        { key: 'history_type', label: 'Jenis', render: r => UI.enumBadge(r.history_type, MH_TYPE) },
        { key: 'condition_name', label: 'Kondisi', tdClass: 'fw-semibold' },
        { key: 'diagnosed_year', label: 'Tahun', sortable: true },
        { key: 'treatment', label: 'Pengobatan', render: r => UI.esc(r.treatment || '-') },
        { key: 'is_active', label: 'Status', render: r => r.is_active ? UI.badge('Berlangsung', 'warning') : UI.badge('Riwayat', 'secondary') }
      ]
    });
  }
};
