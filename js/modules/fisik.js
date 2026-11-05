/* ============================================================================
 * MODUL: Pemeriksaan Fisik (tekanan darah, antropometri, indera)
 * BMI dihitung otomatis. Penilaian medis tetap oleh petugas/tenaga medis.
 * ========================================================================== */

const HEARING = { normal: ['Normal', 'success'], penurunan_ringan: ['Penurunan Ringan', 'warning'], penurunan_berat: ['Penurunan Berat', 'danger'] };

App.modules.fisik = {
  async render(mount) {
    const isPeg = Auth.role === ROLES.PEG;
    UI.listPage({
      mount, table: 'physical_examinations',
      title: 'Pemeriksaan Fisik',
      subtitle: 'Hasil pemeriksaan fisik MCU. Indikator warna hanya pembanding rentang umum — penilaian akhir oleh tenaga medis.',
      select: '*, employees(employee_id,full_name,unit), medical_checkups(checkup_date,mcu_type)',
      searchCols: ['employees.full_name', 'employees.employee_id'],
      defaultSort: { col: 'created_at', dir: 'desc' },
      exportCols: [
        { key: 'employees.employee_id', label: 'NIP' }, { key: 'employees.full_name', label: 'Nama' },
        { key: 'medical_checkups.checkup_date', label: 'Tanggal MCU' },
        { key: 'systolic', label: 'Sistolik' }, { key: 'diastolic', label: 'Diastolik' },
        { key: 'pulse', label: 'Nadi' }, { key: 'height_cm', label: 'Tinggi' },
        { key: 'weight_kg', label: 'Berat' }, { key: 'bmi', label: 'BMI' },
        { key: 'vision_left', label: 'Visus Kiri' }, { key: 'vision_right', label: 'Visus Kanan' },
        { key: 'hearing', label: 'Pendengaran' }
      ],
      exportFilename: 'pemeriksaan_fisik',
      canCreate: RBAC.can('fisik', 'create'),
      createLabel: 'Tambah Pemeriksaan',
      canEdit: () => RBAC.can('fisik', 'update'),
      canDelete: () => RBAC.can('fisik', 'del'),
      form: { title: 'Pemeriksaan Fisik', fields: this.fields() },
      columns: [
        { key: 'employees.employee_id', label: 'NIP', tdClass: 'text-nowrap' },
        { key: 'employees.full_name', label: 'Nama' },
        { key: 'medical_checkups.checkup_date', label: 'Tanggal MCU', render: r => UI.fmtDate(r.medical_checkups?.checkup_date) },
        {
          key: 'systolic', label: 'Tekanan Darah', sortable: true,
          render: r => {
            const s = r.systolic, d = r.diastolic;
            if (!s || !d) return '-';
            const cat = s >= 140 || d >= 90 ? 'danger' : s >= 130 || d >= 85 ? 'warning' : 'success';
            return `<span class="badge text-bg-${cat}">${s}/${d} mmHg</span>`;
          }
        },
        { key: 'pulse', label: 'Nadi', render: r => r.pulse ? r.pulse + ' x/mnt' : '-', sortable: true },
        { key: 'bmi', label: 'BMI', render: r => App.modules.profil.bmiBadge(r.bmi), sortable: true },
        { key: 'vision_left', label: 'Visus K/K', render: r => `${r.vision_left || '-'} / ${r.vision_right || '-'}` },
        { key: 'hearing', label: 'Pendengaran', render: r => UI.enumBadge(r.hearing, HEARING) }
      ]
    });
  },

  fields() {
    return [
      { key: 'employee_id', label: 'Pegawai', type: 'select', required: true, col: 6, options: () => UI.employeeOptions(true) },
      { key: 'mcu_id', label: 'Terhubung ke MCU (opsional)', type: 'select', col: 6, options: async () => {
        const rows = await db.list('medical_checkups', 'id,checkup_date,employees(full_name)', { order: { col: 'checkup_date' }, limit: 200 });
        return rows.map(r => ({ value: r.id, label: `${UI.fmtDate(r.checkup_date)} — ${r.employees?.full_name || '?'}` }));
      } },
      { key: 'systolic', label: 'Tekanan Sistolik (mmHg)', type: 'number', col: 3, min: 50, max: 260 },
      { key: 'diastolic', label: 'Tekanan Diastolik (mmHg)', type: 'number', col: 3, min: 30, max: 160 },
      { key: 'pulse', label: 'Nadi (x/menit)', type: 'number', col: 3, min: 30, max: 220 },
      { key: 'height_cm', label: 'Tinggi (cm)', type: 'number', step: '0.1', col: 3 },
      { key: 'weight_kg', label: 'Berat (kg)', type: 'number', step: '0.1', col: 3, help: '<span id="bmi_preview" class="text-success fw-bold"></span>' },
      { key: 'vision_left', label: 'Visus Mata Kiri', col: 2, placeholder: '1.0' },
      { key: 'vision_right', label: 'Visus Mata Kanan', col: 2, placeholder: '1.0' },
      { key: 'hearing', label: 'Pendengaran', type: 'select', col: 4, options: Object.entries(HEARING).map(([v, o]) => ({ value: v, label: o[0] })) },
      { key: 'physical_notes', label: 'Catatan Pemeriksaan Fisik', type: 'textarea', col: 12 }
    ];
  },

  /** Dipakai juga dari modal detail MCU */
  async openForm(prefill = {}) {
    return UI.formModal({
      title: 'Pemeriksaan Fisik', size: 'lg',
      fields: this.fields(), values: prefill,
      onSubmit: async vals => {
        if (vals.employee_id) { /* sudah dari select */ }
        await db.insert('physical_examinations', vals);
        UI.toast('Pemeriksaan fisik tersimpan');
        return true;
      }
    });
  }
};

/* Pratinjau BMI langsung saat mengetik berat/tinggi */
document.addEventListener('input', e => {
  const form = e.target.closest('#__frm');
  if (!form) return;
  const t = form.elements['weight_kg'] ? +form.elements['weight_kg'].value : 0;
  const h = form.elements['height_cm'] ? +form.elements['height_cm'].value : 0;
  const out = form.querySelector('#bmi_preview');
  if (out) out.textContent = (t > 0 && h > 0) ? `BMI: ${(t / Math.pow(h / 100, 2)).toFixed(1)}` : '';
});
