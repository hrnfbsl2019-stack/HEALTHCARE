/* ============================================================================
 * MODUL: Data Pegawai (integrasi E-PEGAWAI via employee_id/NIP + impor CSV)
 * ========================================================================== */

const UNIT_LIST = ['Pendidikan', 'Administrasi', 'Asrama', 'Umum', 'Kesehatan', 'Lainnya'];
const EMP_STATUS = { aktif: ['Aktif', 'success'], cuti: ['Cuti', 'warning'], pensiun: ['Pensiun', 'secondary'], keluar: ['Keluar', 'danger'] };

App.modules.pegawai = {
  async render(mount) {
    const canCreate = RBAC.can('pegawai', 'create');
    const canUpdate = RBAC.can('pegawai', 'update');
    const canDelete = RBAC.can('pegawai', 'del');
    const isAdminish = Auth.isAny(ROLES.SA, ROLES.HRD);

    const headerExtra = (Auth.isAny(ROLES.SA, ROLES.HRD)) ? `
      <button class="btn btn-outline-success btn-sm" id="btn_csv_tmpl"><i class="bi bi-file-earmark-excel me-1"></i>Template Excel</button>
      <button class="btn btn-outline-primary btn-sm" id="btn_csv"><i class="bi bi-upload me-1"></i>Impor E-PEGAWAI (Excel/CSV)</button>` : '';

    UI.listPage({
      mount, table: 'employees',
      title: 'Data Pegawai',
      subtitle: 'Sumber utama data kepegawaian berasal dari sistem E-PEGAWAI (kunci: NIP / employee_id). Modul ini TIDAK menggantikan sistem kepegawaian.',
      headerExtra,
      select: '*',
      searchCols: ['employee_id', 'full_name', 'position', 'phone'],
      filters: [
        { key: 'unit', label: 'Unit', options: Object.fromEntries(UNIT_LIST.map(u => [u, u])) },
        { key: 'employment_status', label: 'Status', options: { aktif: 'Aktif', cuti: 'Cuti', pensiun: 'Pensiun', keluar: 'Keluar' } }
      ],
      defaultSort: { col: 'full_name', dir: 'asc' },
      exportCols: [
        { key: 'employee_id', label: 'NIP' }, { key: 'full_name', label: 'Nama Lengkap' },
        { key: 'gender', label: 'JK' }, { key: 'position', label: 'Jabatan' },
        { key: 'unit', label: 'Unit Kerja' }, { key: 'phone', label: 'No HP' },
        { key: 'email', label: 'Email' }, { key: 'join_date', label: 'Tgl Masuk' },
        { key: 'employment_status', label: 'Status' }
      ],
      exportFilename: 'data_pegawai',
      canCreate,
      createLabel: 'Tambah Pegawai',
      canEdit: () => canUpdate,
      canDelete: () => canDelete,
      rowActions: [
        { icon: 'bi-eye', label: 'Detail', cls: 'success', onClick: row => this.detail(row) }
      ],
      form: {
        title: 'Data Pegawai',
        fields: [
          { key: 'employee_id', label: 'NIP / Employee ID (dari E-PEGAWAI)', required: true, col: 4, placeholder: 'NF-2024-013' },
          { key: 'full_name', label: 'Nama Lengkap', required: true, col: 8 },
          { key: 'gender', label: 'Jenis Kelamin', type: 'select', col: 3, options: [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }] },
          { key: 'birth_date', label: 'Tanggal Lahir', type: 'date', col: 3 },
          { key: 'position', label: 'Jabatan', col: 3 },
          { key: 'unit', label: 'Unit Kerja', type: 'select', col: 3, options: UNIT_LIST.map(u => ({ value: u, label: u })) },
          { key: 'phone', label: 'No. HP', type: 'tel', col: 3 },
          { key: 'email', label: 'Email', type: 'email', col: 3 },
          { key: 'join_date', label: 'Tanggal Masuk Kerja', type: 'date', col: 3 },
          { key: 'employment_status', label: 'Status Kepegawaian', type: 'select', col: 3,
            options: Object.entries(EMP_STATUS).map(([v, o]) => ({ value: v, label: o[0] })) },
          { key: 'address', label: 'Alamat', type: 'textarea', col: 6 },
          { key: 'photo_url', label: 'URL Foto (opsional)', col: 6 }
        ]
      },
      columns: [
        { key: 'employee_id', label: 'NIP', tdClass: 'fw-semibold text-nowrap', sortable: true },
        { key: 'full_name', label: 'Nama Lengkap', sortable: true },
        { key: 'gender', label: 'JK', render: r => r.gender === 'L' ? UI.badge('L', 'primary') : r.gender === 'P' ? UI.badge('P', 'danger') : '-', sortable: true },
        { key: 'position', label: 'Jabatan', sortable: true },
        { key: 'unit', label: 'Unit', render: r => UI.badge(r.unit || '-', 'success-subtle text-success'), sortable: true },
        { key: 'phone', label: 'No. HP' },
        { key: 'join_date', label: 'Tgl Masuk', render: r => UI.fmtDate(r.join_date), sortable: true },
        { key: 'employment_status', label: 'Status', render: r => UI.enumBadge(r.employment_status, EMP_STATUS), sortable: true }
      ],
      onAfterLoad: () => {
        const bt = document.getElementById('btn_csv_tmpl');
        const bc = document.getElementById('btn_csv');
        if (bt) bt.onclick = () => this.downloadTemplate();
        if (bc) bc.onclick = () => this.importCsv();
      }
    });
  },

  /* Detail pegawai: data administratif utk semua; ringkasan medis HANYA petugas/SA */
  async detail(row) {
    const isMed = Auth.isAny(ROLES.SA, ROLES.PET);
    let medHtml = '';
    if (isMed) {
      try {
        const [mcu, prof, bpjs] = await Promise.all([
          db.list('medical_checkups', 'checkup_date,health_status,mcu_type,status', { eq: [['employee_id', row.id]], order: { col: 'checkup_date' }, limit: 3 }),
          db.one('health_profiles', null).catch(() => null),
          db.list('bpjs_health', 'bpjs_number,bpjs_class,status', { eq: [['employee_id', row.id]], limit: 1 })
        ]);
        const profRow = await db.client().from('health_profiles').select('*').eq('employee_id', row.id).maybeSingle();
        medHtml = `
          <hr><h6 class="fw-bold text-success mb-2"><i class="bi bi-shield-lock me-1"></i>Ringkasan Kesehatan (khusus petugas kesehatan)</h6>
          <div class="row g-2 small">
            <div class="col-4"><b>Status MCU terakhir:</b><br>${mcu.length ? UI.healthBadge(mcu[0].health_status) + ' — ' + UI.fmtDate(mcu[0].checkup_date) : 'Belum ada'}</div>
            <div class="col-4"><b>Gol. Darah / BMI:</b><br>${profRow ? UI.esc(profRow.blood_type || '-') + ' / ' + (profRow.bmi ? (+profRow.bmi).toFixed(1) : '-') : '-'}</div>
            <div class="col-4"><b>BPJS:</b><br>${bpjs.length ? UI.esc(bpjs[0].bpjs_number) + ' (' + UI.esc(bpjs[0].bpjs_class || '-') + ')' : '-'}</div>
          </div>
          <div class="form-text small"><i class="bi bi-lock me-1"></i>HRD &amp; Pimpinan tidak melihat bagian ini (UU No. 27/2022 &amp; kerahasiaan medis).</div>`;
      } catch (e) { medHtml = ''; }
    } else if (Auth.role === ROLES.HRD) {
      medHtml = `<hr><div class="alert alert-light border small mb-0"><i class="bi bi-lock-fill me-1 text-secondary"></i>
        Rekam medis pegawai <b>tidak ditampilkan</b> untuk peran HRD — sesuai kebijakan akses sistem.</div>`;
    }

    const dl = (k, v) => `<div class="col-6 col-md-4"><div class="small text-muted">${k}</div><div class="fw-semibold">${UI.esc(v ?? '-')}</div></div>`;
    UI.modal({
      title: `<i class="bi bi-person-circle me-1 text-success"></i>${UI.esc(row.full_name)}`,
      size: 'lg',
      body: `
        <div class="row g-3">
          ${dl('NIP / Employee ID', row.employee_id)}
          ${dl('Jabatan', row.position)} ${dl('Unit', row.unit)}
          ${dl('Jenis Kelamin', row.gender === 'L' ? 'Laki-laki' : row.gender === 'P' ? 'Perempuan' : '-')}
          ${dl('Tanggal Lahir', UI.fmtDate(row.birth_date))} ${dl('Tgl Masuk', UI.fmtDate(row.join_date))}
          ${dl('No. HP', row.phone)} ${dl('Email', row.email)} ${dl('Status', (EMP_STATUS[row.employment_status] || [row.employment_status])[0])}
          <div class="col-12"><div class="small text-muted">Alamat</div><div>${UI.esc(row.address || '-')}</div></div>
        </div>${medHtml}`,
      footer: `<a class="btn btn-success btn-sm" href="#/mcu"><i class="bi bi-clipboard2-pulse me-1"></i>Data MCU Pegawai</a>`
    });
  },

  /* Unduh template impor dalam format EXCEL (.xlsx) — 2 sheet: Template + Petunjuk.
     Bila pustaka XLSX (CDN) gagal dimuat, fallback otomatis ke CSV polos. */
  downloadTemplate() {
    const cols = ['employee_id','full_name','gender','birth_date','position','unit','phone','email','address','join_date','employment_status'];
    const contoh = [
      ['NF-2025-001','Contoh Nama Satu','L','1990-01-01','Guru','Pendidikan','0812xxx','nama1@nurulfikri.sch.id','Lembang, Bandung Barat','2025-01-01','aktif'],
      ['NF-2025-002','Contoh Nama Dua','P','1988-05-20','Tata Usaha','Administrasi','0813xxx','nama2@nurulfikri.sch.id','Lembang, Bandung Barat','2025-02-01','aktif']
    ];
    const namaFile = 'template_impor_pegawai';
    if (typeof XLSX === 'undefined') {
      const csv = cols.join(',') + '\n' +
        contoh.map(r => r.map(v => /[,"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = namaFile + '.csv';
      a.click();
      UI.toast('Pustaka Excel tidak termuat — template CSV diunduh sebagai gantinya.', 'warning');
      return;
    }
    const ws = XLSX.utils.aoa_to_sheet([cols, ...contoh,
      Array(cols.length).fill(''), Array(cols.length).fill(''), Array(cols.length).fill('')]);
    ws['!cols'] = [{wch:14},{wch:24},{wch:8},{wch:12},{wch:18},{wch:16},{wch:14},{wch:28},{wch:24},{wch:12},{wch:18}];
    const wp = XLSX.utils.aoa_to_sheet([
      ['PETUNJUK IMPOR DATA PEGAWAI — ' + APP_CONFIG.appName],
      [],
      ['1. Isi data pada sheet "Template". JANGAN mengubah baris header (baris pertama) atau memindah kolom.'],
      ['2. Kolom WAJIB: employee_id (NIP/ID unik dari E-PEGAWAI) dan full_name.'],
      ['3. employee_id yang sudah terdaftar -> data lama diperbarui (sinkronisasi), TIDAK menjadi duplikat.'],
      ['4. gender: isi "L" (laki-laki) atau "P" (perempuan).'],
      ['5. birth_date & join_date format tanggal: TTTT-BB-HH (contoh: 1990-01-31).'],
      ['6. employment_status salah satu dari: aktif / cuti / pensiun / keluar. Dikosongkan dianggap "aktif".'],
      ['7. Kolom lain boleh dikosongkan bila belum ada datanya.'],
      ['8. Simpan file (format .xlsx), lalu unggah lewat tombol "Impor E-PEGAWAI (Excel/CSV)".'],
      [],
      ['File ini dibuat otomatis oleh ' + APP_CONFIG.appName + ' — ' + Branding.org()]
    ]);
    wp['!cols'] = [{wch:110}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.utils.book_append_sheet(wb, wp, 'Petunjuk');
    XLSX.writeFile(wb, namaFile + '.xlsx');
  },

  async importCsv() {
    const { el } = UI.modal({
      title: '<i class="bi bi-upload me-1"></i>Impor Pegawai dari E-PEGAWAI (Excel / CSV)',
      body: `
        <div class="alert alert-info small py-2">Gunakan <b>Template Excel</b> (tombol di halaman Data Pegawai) yang berisi
        sheet <b>Template</b> + <b>Petunjuk</b>. Kolom (baris pertama = header):<br>
        <code>employee_id, full_name, gender, birth_date, position, unit, phone, email, address, join_date, employment_status</code><br>
        Data dengan <b>employee_id sama akan diperbarui</b> (sinkronisasi, bukan duplikat). Format diterima: <b>.xlsx, .xls, .csv</b>.</div>
        <input type="file" class="form-control" id="csv_file" accept=".xlsx,.xls,.csv">`,
      footer: `<button class="btn btn-success btn-sm" id="csv_go"><i class="bi bi-upload me-1"></i>Proses Impor</button>`
    });
    el.querySelector('#csv_go').onclick = async () => {
      const f = el.querySelector('#csv_file').files[0];
      if (!f) { UI.toast('Pilih file Excel/CSV terlebih dahulu', 'warning'); return; }
      let aoa;
      try { aoa = await this.parsePegawaiFile(f); }
      catch (e) { UI.toast('Gagal membaca file: ' + db.errMessage(e), 'danger'); return; }
      if (!aoa || aoa.length < 2) { UI.toast('File kosong / tidak berisi data', 'warning'); return; }
      const head = (aoa[0] || []).map(s => String(s).trim().toLowerCase());
      const idx = k => head.indexOf(k);
      const norm = v => (v === null || v === undefined) ? '' : String(v).trim();
      let ok = 0, fail = 0;
      for (const r of aoa.slice(1)) {
        if (!r || r.every(c => norm(c) === '')) continue;
        const g = norm(r[idx('gender')]).toUpperCase();
        const row = {
          employee_id: norm(r[idx('employee_id')]), full_name: norm(r[idx('full_name')]),
          gender: g === 'P' ? 'P' : g === 'L' ? 'L' : null,
          birth_date: this.normDate(r[idx('birth_date')]) || null,
          position: norm(r[idx('position')]) || null, unit: norm(r[idx('unit')]) || null,
          phone: norm(r[idx('phone')]) || null, email: norm(r[idx('email')]) || null,
          address: norm(r[idx('address')]) || null,
          join_date: this.normDate(r[idx('join_date')]) || null,
          employment_status: (norm(r[idx('employment_status')]).toLowerCase() || 'aktif')
        };
        if (!row.employee_id || !row.full_name) { fail++; continue; }
        try {
          const exist = await db.client().from('employees').select('id').eq('employee_id', row.employee_id).maybeSingle();
          if (exist.data) await db.update('employees', exist.data.id, row);
          else await db.insert('employees', row);
          ok++;
        } catch (e) { fail++; console.warn(e); }
      }
      bootstrap.Modal.getInstance(el).hide();
      UI.toast(`Impor selesai: ${ok} berhasil, ${fail} gagal.`, ok ? 'success' : 'warning');
      if (ok) App.navigate(); // muat ulang daftar pegawai
    };
  },

  /** Baca file .xlsx/.xls/.csv menjadi array-of-arrays (baris pertama = header) */
  async parsePegawaiFile(f) {
    if (/\.csv$/i.test(f.name)) {
      const text = await f.text();
      const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
      return lines.map(line =>
        line.match(/("([^"]*)"|[^,]*)(,|$)/g).map(s => s.replace(/,$/, '').replace(/^"|"$/g, '').trim()));
    }
    if (typeof XLSX === 'undefined')
      throw new Error('Pustaka Excel (XLSX) tidak termuat — periksa koneksi internet lalu muat ulang halaman.');
    const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
    const ws = wb.Sheets['Template'] || wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  },

  /** Normalisasi tanggal dari Excel (objek Date / serial / teks) menjadi TTTT-BB-HH */
  normDate(v) {
    if (v === null || v === undefined || v === '') return '';
    if (v instanceof Date && !isNaN(v)) {
      const p = n => String(n).padStart(2, '0');
      return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
    }
    if (typeof v === 'number' && v > 20000 && v < 80000) // serial tanggal Excel
      return this.normDate(new Date(Math.round((v - 25569) * 86400 * 1000)));
    const s = String(v).trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
      const [y, m, d] = s.split(/[-\s]/);
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const [a, b, y] = s.split('/');
      const dd = Number(a) > 12 ? a : b, mm = Number(a) > 12 ? b : a; // dd/mm/yyyy
      return `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    return s;
  }
};
