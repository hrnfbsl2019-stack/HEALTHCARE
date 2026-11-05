/* ============================================================================
 * MODUL: Laboratorium (hasil lab MCU + penanda rentang referensi umum)
 * ========================================================================== */

/* Rentang referensi umum dewasa (indikatif, BUKAN diagnosis) */
const LAB_RANGES = {
  hemoglobin: [12, 17, 'g/dL'], leukocytes: [4, 10, 'sel/µL'], hematocrit: [36, 50, '%'],
  trombosit: [150, 450, 'ribu/µL'], gula_darah_puasa: [70, 100, 'mg/dL'], gula_darah_2jpp: [70, 140, 'mg/dL'],
  cholesterol_total: [0, 200, 'mg/dL'], ldl: [0, 100, 'mg/dL'], hdl: [40, 100, 'mg/dL'],
  trigliserida: [0, 150, 'mg/dL'], asam_urat: [3.5, 7.2, 'mg/dL'], creatinine: [0.6, 1.3, 'mg/dL'],
  sgot: [0, 40, 'U/L'], sgpt: [0, 40, 'U/L']
};
const LAB_LABELS = {
  hemoglobin: 'Hemoglobin', leukocytes: 'Leukosit', hematocrit: 'Hematokrit', trombosit: 'Trombosit',
  gula_darah_puasa: 'Gula Darah Puasa', gula_darah_2jpp: 'Gula Darah 2 JPP', cholesterol_total: 'Kolesterol Total',
  ldl: 'LDL', hdl: 'HDL', trigliserida: 'Trigliserida', asam_urat: 'Asam Urat', creatinine: 'Kreatinin',
  sgot: 'SGOT', sgpt: 'SGPT'
};

function labFlag(key, v) {
  if (v === null || v === undefined || v === '') return '';
  const [lo, hi] = LAB_RANGES[key] || [0, Infinity];
  if (+v > hi) return ['Tinggi', 'danger'];
  if (+v < lo) return ['Rendah', 'warning'];
  return ['Normal', 'success'];
}

App.modules.lab = {
  async render(mount) {
    UI.listPage({
      mount, table: 'laboratory_results',
      title: 'Hasil Laboratorium',
      subtitle: 'Hasil pemeriksaan laboratorium MCU. Penanda "Tinggi/Rendah" hanya pembanding rentang referensi umum — interpretasi & diagnosis HANYA oleh tenaga medis.',
      select: '*, employees(employee_id,full_name,unit), medical_checkups(checkup_date)',
      searchCols: ['employees.full_name', 'employees.employee_id'],
      defaultSort: { col: 'created_at', dir: 'desc' },
      exportCols: [
        { key: 'employees.employee_id', label: 'NIP' }, { key: 'employees.full_name', label: 'Nama' },
        { key: 'examined_at', label: 'Tanggal Lab' },
        { key: 'hemoglobin', label: 'Hb' }, { key: 'gula_darah_puasa', label: 'GDP' },
        { key: 'cholesterol_total', label: 'Kolesterol' }, { key: 'ldl', label: 'LDL' },
        { key: 'hdl', label: 'HDL' }, { key: 'trigliserida', label: 'TG' },
        { key: 'asam_urat', label: 'Asam Urat' }, { key: 'sgot', label: 'SGOT' }, { key: 'sgpt', label: 'SGPT' }
      ],
      exportFilename: 'hasil_laboratorium',
      canCreate: RBAC.can('lab', 'create'),
      createLabel: 'Tambah Hasil Lab',
      canEdit: () => RBAC.can('lab', 'update'),
      canDelete: () => RBAC.can('lab', 'del'),
      form: { title: 'Hasil Laboratorium', fields: this.fields() },
      columns: [
        { key: 'employees.employee_id', label: 'NIP', tdClass: 'text-nowrap' },
        { key: 'employees.full_name', label: 'Nama' },
        { key: 'examined_at', label: 'Tanggal Lab', render: r => UI.fmtDate(r.examined_at), sortable: true },
        { key: 'hemoglobin', label: 'Hb', render: r => this.val(r.hemoglobin, 'hemoglobin') },
        { key: 'gula_darah_puasa', label: 'GDP', render: r => this.val(r.gula_darah_puasa, 'gula_darah_puasa') },
        { key: 'cholesterol_total', label: 'Kolesterol', render: r => this.val(r.cholesterol_total, 'cholesterol_total') },
        { key: 'trigliserida', label: 'TG', render: r => this.val(r.trigliserida, 'trigliserida') },
        { key: 'asam_urat', label: 'Asam Urat', render: r => this.val(r.asam_urat, 'asam_urat') },
        { key: 'sgot', label: 'SGOT', render: r => this.val(r.sgot, 'sgot') },
        { key: 'sgpt', label: 'SGPT', render: r => this.val(r.sgpt, 'sgpt') }
      ]
    });
  },

  val(v, key) {
    if (v === null || v === undefined || v === '') return '-';
    const f = labFlag(key, v);
    return `<span class="fw-semibold">${v}</span> ${f ? `<span class="badge text-bg-${f[1]} badge-sm">${f[0]}</span>` : ''}`;
  },

  fields() {
    const num = (key, col = 3) => ({
      key, label: `${LAB_LABELS[key]} (${LAB_RANGES[key] ? LAB_RANGES[key][2] : ''})`,
      type: 'number', step: 'any', col
    });
    return [
      { key: 'employee_id', label: 'Pegawai', type: 'select', required: true, col: 6, options: () => UI.employeeOptions(true) },
      { key: 'mcu_id', label: 'Terhubung ke MCU (opsional)', type: 'select', col: 6, options: async () => {
        const rows = await db.list('medical_checkups', 'id,checkup_date,employees(full_name)', { order: { col: 'checkup_date' }, limit: 200 });
        return rows.map(r => ({ value: r.id, label: `${UI.fmtDate(r.checkup_date)} — ${r.employees?.full_name || '?'}` }));
      } },
      { key: 'examined_at', label: 'Tanggal Pemeriksaan Lab', type: 'date', col: 3 },
      { key: 'hemoglobin', label: 'Hemoglobin (g/dL)', type: 'number', step: 'any', col: 3 },
      { key: 'leukocytes', label: 'Leukosit (sel/µL)', type: 'number', step: 'any', col: 3 },
      { key: 'hematocrit', label: 'Hematokrit (%)', type: 'number', step: 'any', col: 3 },
      { key: 'trombosit', label: 'Trombosit (ribu/µL)', type: 'number', step: 'any', col: 3 },
      { key: 'gula_darah_puasa', label: 'Gula Darah Puasa (mg/dL)', type: 'number', step: 'any', col: 3 },
      { key: 'gula_darah_2jpp', label: 'Gula Darah 2 JPP (mg/dL)', type: 'number', step: 'any', col: 3 },
      { key: 'cholesterol_total', label: 'Kolesterol Total (mg/dL)', type: 'number', step: 'any', col: 3 },
      { key: 'ldl', label: 'LDL (mg/dL)', type: 'number', step: 'any', col: 3 },
      { key: 'hdl', label: 'HDL (mg/dL)', type: 'number', step: 'any', col: 3 },
      { key: 'trigliserida', label: 'Trigliserida (mg/dL)', type: 'number', step: 'any', col: 3 },
      { key: 'asam_urat', label: 'Asam Urat (mg/dL)', type: 'number', step: 'any', col: 3 },
      { key: 'creatinine', label: 'Kreatinin (mg/dL)', type: 'number', step: 'any', col: 3 },
      { key: 'sgot', label: 'SGOT (U/L)', type: 'number', step: 'any', col: 3 },
      { key: 'sgpt', label: 'SGPT (U/L)', type: 'number', step: 'any', col: 3 },
      { key: 'urine_protein', label: 'Urine Protein', type: 'select', col: 2, options: ['negatif', 'trace', 'positif'].map(x => ({ value: x, label: x })) },
      { key: 'urine_glucose', label: 'Urine Glukosa', type: 'select', col: 2, options: ['negatif', 'trace', 'positif'].map(x => ({ value: x, label: x })) },
      { key: 'urine_blood', label: 'Urine Darah', type: 'select', col: 2, options: ['negatif', 'trace', 'positif'].map(x => ({ value: x, label: x })) },
      { key: 'notes', label: 'Catatan Laboratorium', type: 'textarea', col: 6 }
    ];
  },

  async openForm(prefill = {}) {
    return UI.formModal({
      title: 'Hasil Laboratorium', size: 'xl',
      fields: this.fields(), values: prefill,
      onSubmit: async vals => {
        await db.insert('laboratory_results', vals);
        UI.toast('Hasil laboratorium tersimpan');
        return true;
      }
    });
  }
};
