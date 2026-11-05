/* ============================================================================
 * MODUL: Laporan (HRD / Pimpinan / Petugas) — agregat + ekspor Excel & PDF
 * Pimpinan hanya menerima AGREGAT ANONIM. HRD menerima agregat + daftar
 * izin sakit tanpa diagnosis. Tidak ada laporan individual-medis utk HRD/Pimpinan.
 * ========================================================================== */

App.modules.laporan = {
  REPORTS: [
    { id: 'mcu',      label: 'Rekap MCU Bulanan',        icon: 'bi-clipboard2-pulse', desc: 'Jumlah MCU & status penyelesaian per bulan' },
    { id: 'status',   label: 'Distribusi Status Kesehatan', icon: 'bi-pie-chart-fill', desc: 'Sebaran hasil MCU terakhir seluruh pegawai' },
    { id: 'izin',     label: 'Rekap Izin Sakit',          icon: 'bi-thermometer-half', desc: 'Tren kasus & hari izin per bulan + kategori' },
    { id: 'unit',     label: 'Ringkasan per Unit (anonim)', icon: 'bi-building', desc: 'Kondisi kesehatan agregat tiap unit kerja' },
    { id: 'program',  label: 'Partisipasi Program',       icon: 'bi-activity', desc: 'Jumlah peserta vs target tiap program' },
    { id: 'izin_detail', label: 'Daftar Izin Sakit (periode)', icon: 'bi-list-ul', desc: 'Rincian izin sakit — HRD: tanpa kolom diagnosis', roles: ['super_admin', 'hrd', 'petugas'] }
  ],

  async render(mount) {
    mount.innerHTML = `
      <h1 class="h4 fw-bold mb-1">Laporan Kesehatan Pegawai</h1>
      <div class="text-muted small mb-3">
        <i class="bi bi-shield-check text-success"></i> Laporan mengikuti hak akses peran Anda.
        ${Auth.role === 'pimpinan' ? 'Peran <b>Pimpinan</b> hanya menerima agregat anonim (tanpa identitas individual).' : ''}
      </div>
      <div class="row g-3" id="rp_cards"></div>
      <div class="mt-4" id="rp_out"></div>`;

    document.getElementById('rp_cards').innerHTML = this.REPORTS
      .filter(r => !r.roles || r.roles.includes(Auth.role))
      .map(r => `<div class="col-md-6 col-xl-4">
        <div class="card border-0 shadow-sm h-100 rp-pick" data-rp="${r.id}" role="button">
          <div class="card-body d-flex gap-3 align-items-center">
            <div class="stat-icon bg-success-subtle text-success"><i class="bi ${r.icon}"></i></div>
            <div><div class="fw-bold">${r.label}</div><div class="small text-muted">${r.desc}</div></div>
          </div></div></div>`).join('');

    document.querySelectorAll('.rp-pick').forEach(c => c.onclick = () => this.run(c.dataset.rp));
  },

  async run(id) {
    const out = document.getElementById('rp_out');
    out.innerHTML = `<div class="card border-0 shadow-sm"><div class="card-body text-center py-4">
      <span class="spinner-border spinner-border-sm text-success"></span> Menyusun laporan...</div></div>`;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      const R = this.REPORTS.find(r => r.id === id);
      const data = await this['build_' + id]();
      out.innerHTML = `
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h2 class="h6 fw-bold mb-0"><i class="bi ${R.icon} text-success me-1"></i>${R.label}</h2>
              <div class="small text-muted">Dibuat ${new Date().toLocaleString('id-ID')} — periode: ${UI.esc(data.subtitle || '-')}</div>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-success btn-sm" id="rp_xls"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>
              <button class="btn btn-outline-danger btn-sm" id="rp_pdf"><i class="bi bi-file-earmark-pdf me-1"></i>PDF</button>
            </div>
          </div>
          ${id === 'izin_detail' ? `<div class="row g-2 align-items-end mb-3">
            <div class="col-md-3"><label class="form-label small mb-1">Dari Tanggal</label>
              <input type="date" class="form-control form-control-sm" id="rp_from" value="${(this._periode && this._periode.from) || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)}"></div>
            <div class="col-md-3"><label class="form-label small mb-1">Sampai Tanggal</label>
              <input type="date" class="form-control form-control-sm" id="rp_to" value="${(this._periode && this._periode.to) || new Date().toISOString().slice(0, 10)}"></div>
            <div class="col-md-2"><button class="btn btn-success btn-sm w-100" id="rp_apply"><i class="bi bi-arrow-repeat"></i> Terapkan</button></div>
          </div>` : ''}
          ${data.chart ? `<div class="chart-box mb-3"><canvas id="rp_chart"></canvas></div>` : ''}
          ${data.html || ''}
          ${id === 'izin_detail' ? '<div class="form-text small"><i class="bi bi-exclamation-triangle text-warning"></i> Frekuensi izin sakit tidak boleh dijadikan satu-satunya dasar penilaian kinerja pegawai.</div>' : ''}
        </div></div>`;

        if (data.chart) {
          const c = data.chart;
          if (c.type === 'doughnut') Charts.doughnut('rp_chart', c.labels, c.data);
          else if (c.type === 'barH') Charts.bar('rp_chart', c.labels, c.datasets, true);
          else if (c.type === 'bar') Charts.bar('rp_chart', c.labels, c.datasets);
          else Charts.line('rp_chart', c.labels, c.datasets);
        }
        document.getElementById('rp_xls').onclick = () => Export.excel('laporan_' + id, data.rows, data.cols);
        document.getElementById('rp_pdf').onclick = () => Export.pdf('laporan_' + id, R.label, data.subtitle || '', data.cols, data.rows);
        document.getElementById('rp_apply')?.addEventListener('click', () => {
          this._periode = { from: document.getElementById('rp_from')?.value, to: document.getElementById('rp_to')?.value };
          this.run(id);
        });
    } catch (e) {
      out.innerHTML = `<div class="alert alert-danger border-0 shadow-sm">${UI.esc(db.errMessage(e))}</div>`;
    }
  },

  table(cols, rows) {
    return `<div class="table-responsive"><table class="table table-sm table-striped table-hover mb-0">
      <thead class="table-light"><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
      <tbody>${rows.length ? rows.map(r => `<tr>${cols.map(c => `<td>${UI.esc(c.plain ? c.plain(r) : (UI.get(r, c.key) ?? '-'))}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${cols.length}" class="text-center text-muted py-3">Tidak ada data</td></tr>`}</tbody></table></div>`;
  },

  async build_mcu() {
    const months = 12;
    const rows = await db.rpc('rpc_mcu_monthly', { p_months: months });
    const cols = [
      { key: 'bulan', label: 'Bulan' }, { key: 'total', label: 'Total MCU' },
      { key: 'selesai', label: 'Selesai' }, { key: 'terjadwal', label: 'Terjadwal' }
    ];
    return {
      subtitle: `${months} bulan terakhir`,
      cols, rows,
      html: this.table(cols, rows),
      chart: { type: 'line', labels: rows.map(r => r.bulan), datasets: [
        { label: 'Total MCU', data: rows.map(r => r.total), borderColor: Charts.COLORS.green, backgroundColor: 'rgba(22,101,52,.12)', fill: true, tension: .35 },
        { label: 'Selesai', data: rows.map(r => r.selesai), borderColor: Charts.COLORS.gold, backgroundColor: 'rgba(217,119,6,.10)', fill: true, tension: .35 }
      ]}
    };
  },

  async build_status() {
    const rows = await db.rpc('rpc_health_status_distribution');
    const cols = [{ key: 'label', label: 'Status Kesehatan' }, { key: 'jumlah', label: 'Jumlah Pegawai' }];
    return {
      subtitle: 'hasil MCU terakhir per pegawai',
      cols, rows, html: this.table(cols, rows),
      chart: { type: 'doughnut', labels: rows.map(r => r.label), data: rows.map(r => r.jumlah) }
    };
  },

  async build_izin() {
    const [bulan, kat] = await Promise.all([
      db.rpc('rpc_sickleave_monthly', { p_months: 12 }),
      db.rpc('rpc_sickleave_category')
    ]);
    const cols = [{ key: 'bulan', label: 'Bulan' }, { key: 'kasus', label: 'Kasus' }, { key: 'hari', label: 'Hari Izin' }];
    const katCols = [{ key: 'kategori', label: 'Kategori' }, { key: 'kasus', label: 'Kasus' }, { key: 'hari', label: 'Hari' }];
    return {
      subtitle: '12 bulan terakhir (agregat anonim)',
      cols, rows: bulan,
      html: this.table(cols, bulan) + '<h6 class="fw-bold mt-3 mb-2">Per Kategori (1 tahun)</h6>' + this.table(katCols, kat),
      chart: { type: 'bar', labels: bulan.map(b => b.bulan), datasets: [
        { label: 'Kasus', data: bulan.map(b => b.kasus), backgroundColor: 'rgba(245,158,11,.7)', borderRadius: 4 },
        { label: 'Hari', data: bulan.map(b => b.hari), backgroundColor: 'rgba(220,38,38,.6)', borderRadius: 4 }
      ]}
    };
  },

  async build_unit() {
    const rows = await db.rpc('rpc_unit_summary');
    const cols = [
      { key: 'unit', label: 'Unit Kerja' }, { key: 'total_pegawai', label: 'Pegawai' },
      { key: 'sehat', label: 'Sehat' }, { key: 'sehat_catatan', label: 'Catatan' },
      { key: 'pemantauan', label: 'Pemantauan' }, { key: 'tindak_lanjut', label: 'Tindak Lanjut' },
      { key: 'perawatan', label: 'Perawatan' }, { key: 'belum_mcu', label: 'Belum MCU' },
      { key: 'izin_hari', label: 'Hari Izin (1 th)' }
    ];
    return { subtitle: 'agregat per unit — tanpa identitas individual', cols, rows, html: this.table(cols, rows),
      chart: { type: 'bar', labels: rows.map(r => r.unit || '-'), datasets: [
        { label: 'Sehat', data: rows.map(r => r.sehat), backgroundColor: 'rgba(34,197,94,.7)', borderRadius: 4 },
        { label: 'Perlu perhatian', data: rows.map(r => +r.pemantauan + +r.tindak_lanjut + +r.perawatan + +r.sehat_catatan), backgroundColor: 'rgba(245,158,11,.7)', borderRadius: 4 }
      ]}
    };
  },

  async build_program() {
    const rows = await db.rpc('rpc_program_stats');
    const cols = [
      { key: 'nama', label: 'Program' }, { key: 'jenis', label: 'Jenis' },
      { key: 'status', label: 'Status' }, { key: 'mulai', label: 'Mulai', plain: r => UI.fmtDate(r.mulai) },
      { key: 'peserta', label: 'Peserta' }, { key: 'target', label: 'Target' }
    ];
    return { subtitle: 'seluruh program', cols, rows, html: this.table(cols, rows),
      chart: { type: 'barH', labels: rows.map(r => r.nama), datasets: [
        { label: 'Peserta', data: rows.map(r => r.peserta), backgroundColor: 'rgba(22,101,52,.7)', borderRadius: 4 }
      ]}
    };
  },

  async build_izin_detail() {
    const from = document.getElementById('rp_from')?.value
      || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = document.getElementById('rp_to')?.value || new Date().toISOString().slice(0, 10);

    let rows;
    if (Auth.role === ROLES.HRD) {
      rows = (await db.rpc('rpc_sick_leaves_admin')).filter(r => r.mulai >= from && r.mulai <= to);
      rows = rows.map(r => ({ nip: r.nip, nama: r.nama, unit: r.unit, mulai: r.mulai, selesai: r.selesai, durasi: r.durasi, kategori: r.kategori, status: r.status }));
    } else {
      rows = await db.list('sick_leaves', '*, employees(employee_id,full_name,unit)', {
        gte: [['start_date', from]], lte: [['start_date', to]],
        order: { col: 'start_date' }, limit: 2000
      });
      rows = rows.map(r => ({
        nip: r.employees?.employee_id, nama: r.employees?.full_name, unit: r.employees?.unit,
        mulai: r.start_date, selesai: r.end_date, durasi: r.duration_days,
        kategori: r.reason_category, diagnosis: r.diagnosis, status: r.status
      }));
    }
    const cols = [
      { key: 'nip', label: 'NIP' }, { key: 'nama', label: 'Nama' }, { key: 'unit', label: 'Unit' },
      { key: 'mulai', label: 'Mulai', plain: r => UI.fmtDate(r.mulai) },
      { key: 'selesai', label: 'Selesai', plain: r => UI.fmtDate(r.selesai) },
      { key: 'durasi', label: 'Hari' }, { key: 'kategori', label: 'Kategori' },
      ...(Auth.role !== ROLES.HRD ? [{ key: 'diagnosis', label: 'Diagnosis' }] : []),
      { key: 'status', label: 'Status' }
    ];
    return { subtitle: `${UI.fmtDate(from)} s.d. ${UI.fmtDate(to)}`, cols, rows, html: this.table(cols, rows) };
  }
};
