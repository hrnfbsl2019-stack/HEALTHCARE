/* ============================================================================
 * MODUL: ANALISIS KESEHATAN (BARU)
 * Grafik Analisis Kondisi Kesehatan Pegawai — Level HIJAU / ORANGE / MERAH
 *   HIJAU  = sehat & baik-baik saja
 *   ORANGE = ada yang kurang baik (catatan / perlu pemantauan)
 *   MERAH  = perlu penanganan lebih & tindak lanjut
 * Sumber: klasifikasi 5 tingkat yang DITETAPKAN PETUGAS KESEHATAN pada hasil
 * MCU terakhir (bukan diagnosis otomatis). Akses:
 *   - super_admin / petugas : agregat + daftar nama per level
 *   - hrd / pimpinan        : hanya AGREGAT & ANONIM (UU No. 27/2022)
 * ========================================================================== */

App.modules.analisis = {
  async render(mount) {
    const isMed = Auth.isAny(ROLES.SA, ROLES.PET);
    const isHrd = Auth.role === ROLES.HRD;
    const isPim = Auth.role === ROLES.PIM;
    const st = { unit: '', months: 6, level: 'merah' };

    let units = [];
    try { units = (await db.rpc('rpc_health_triage_by_unit')).map(r => r.unit); }
    catch (e) { /* jika RPC belum ada -> tampil pesan upgrade di bawah */ }

    mount.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-1">
        <div>
          <h1 class="h4 fw-bold mb-1"><i class="bi bi-clipboard2-data-fill text-success me-1"></i>Analisis Kondisi Kesehatan Pegawai</h1>
          <div class="text-muted small">Grafik level <b class="text-success">HIJAU</b> · <b class="text-warning">ORANGE</b> · <b class="text-danger">MERAH</b>
          berdasarkan hasil Medical Check Up terakhir yang diklasifikasikan oleh petugas kesehatan.</div>
        </div>
        <div class="d-flex gap-2 flex-wrap" id="an_btns">
          <button class="btn btn-outline-secondary btn-sm" id="an_print"><i class="bi bi-printer me-1"></i>Cetak / PDF</button>
          <button class="btn btn-success btn-sm" id="an_xls"><i class="bi bi-file-earmark-excel me-1"></i>Ekspor Excel</button>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2 align-items-center mb-3 mt-2">
        <select class="form-select form-select-sm w-auto" id="an_unit">
          <option value="">Semua Unit Kerja</option>
          ${units.map(u => `<option value="${UI.esc(u)}">${UI.esc(u)}</option>`).join('')}
        </select>
        <select class="form-select form-select-sm w-auto" id="an_months">
          <option value="6">Tren: 6 Bulan</option>
          <option value="12">Tren: 12 Bulan</option>
        </select>
        <button class="btn btn-outline-secondary btn-sm" id="an_refresh" title="Muat ulang"><i class="bi bi-arrow-clockwise"></i></button>
        ${isPim ? '<span class="badge text-bg-info ms-auto"><i class="bi bi-incognito me-1"></i>Mode Anonim — Pimpinan</span>' : ''}
        ${isHrd ? '<span class="badge text-bg-light border ms-auto"><i class="bi bi-lock me-1"></i>Agregat — HRD</span>' : ''}
      </div>

      <div id="an_body"></div>`;

    const body = mount.querySelector('#an_body');

    async function refresh() {
      body.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div>
        <div class="small text-muted mt-2">Menganalisis data kesehatan...</div></div>`;
      try {
        const [tri, byUnit, trend] = await Promise.all([
          db.rpc('rpc_health_triage', { p_unit: st.unit || null }),
          db.rpc('rpc_health_triage_by_unit'),
          db.rpc('rpc_health_triage_trend', { p_months: st.months, p_unit: st.unit || null })
        ]);
        let list = null;
        if (isMed) list = (await db.rpc('rpc_health_triage_list', { p_level: st.level }) || [])
          .filter(r => !st.unit || r.unit === st.unit);

        const total = tri.total_aktif || 0;
        const unitRows = st.unit ? byUnit.filter(r => r.unit === st.unit) : byUnit;

        /* ---------- kartu peringatan hak akses ---------- */
        const notice = isPim
          ? `<div class="alert alert-info border-0 small shadow-sm"><i class="bi bi-incognito me-1"></i>
             Sebagai <b>Pimpinan</b>, Anda melihat <b>agregat anonim</b>. Identitas individual pegawai tidak ditampilkan (UU No. 27/2022).</div>`
          : isHrd
            ? `<div class="alert alert-light border small shadow-sm"><i class="bi bi-lock-fill me-1 text-secondary"></i>
               HRD melihat <b>agregat per unit</b>. Rekam medis individual hanya dapat diakses petugas kesehatan / super admin.</div>`
            : '';

        /* ---------- keterangan arti warna ---------- */
        const legend = ['hijau', 'orange', 'merah'].map(k => {
          const t = UI.TRIAGE[k];
          return `<div class="col-md-4">
            <div class="d-flex gap-2 align-items-start p-2 rounded-3 triage-legend triage-legend-${k}">
              <span class="triage-dot mt-1" style="background:${t.color}"></span>
              <div>
                <div class="fw-bold small" style="color:${t.color}">${t.label} — ${t.meaning}</div>
                <div class="small text-muted">${t.desc}</div>
              </div>
            </div></div>`;
        }).join('');

        /* ---------- daftar pegawai per level (petugas/SA) ---------- */
        const tabs = ['merah', 'orange', 'hijau'].map(k => `
          <li class="nav-item" role="presentation">
            <button class="nav-link ${st.level === k ? 'active' : ''} small" data-level="${k}">
              <span class="triage-dot d-inline-block me-1" style="background:${UI.TRIAGE[k].color}"></span>
              ${UI.TRIAGE[k].label} <span class="badge rounded-pill text-bg-light border">${tri[k] ?? 0}</span>
            </button></li>`).join('');

        const listCols = [
          { key: 'nip', label: 'NIP', thClass: '', tdClass: 'fw-semibold text-nowrap' },
          { key: 'nama', label: 'Nama Pegawai', tdClass: 'fw-semibold' },
          { key: 'unit', label: 'Unit', tdClass: '' },
          { key: 'health_status', label: 'Klasifikasi (5 tingkat)', render: r => UI.healthBadge(r.health_status) },
          { key: 'tanggal', label: 'Tanggal MCU', render: r => UI.fmtDate(r.tanggal) },
          { key: 'perlu_tl', label: 'Perlu Tindak Lanjut', render: r => r.perlu_tl ? UI.badge('Ya', 'danger') : UI.badge('Tidak', 'secondary') },
          { key: 'catatan', label: 'Rencana Tindak Lanjut', render: r => UI.esc(r.catatan || '-') }
        ];

        const listSection = isMed ? `
          <div class="card border-0 shadow-sm mt-3">
            <div class="card-body p-3">
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h2 class="h6 fw-bold mb-0"><i class="bi bi-list-check text-success me-1"></i>Daftar Pegawai per Level</h2>
                <ul class="nav nav-pills gap-1" id="an_tabs">${tabs}</ul>
              </div>
              ${list && list.length ? `
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="table-light"><tr>
                      ${listCols.map(c => `<th class="${c.thClass || ''}">${c.label}</th>`).join('')}<th class="text-end">Aksi</th>
                    </tr></thead>
                    <tbody>
                      ${list.map(r => `<tr>
                        ${listCols.map(c => `<td class="${c.tdClass || ''}">${c.render ? c.render(r) : UI.esc(r[c.key] ?? '-')}</td>`).join('')}
                        <td class="text-end">
                          <button class="btn btn-outline-success btn-sm" data-emp="${r.employee_id}"
                            data-row='${UI.esc(JSON.stringify({ id: r.employee_id, employee_id: r.nip, full_name: r.nama, unit: r.unit }))}'
                            title="Lihat detail pegawai"><i class="bi bi-eye"></i></button>
                        </td>
                      </tr>`).join('')}
                    </tbody>
                  </table>
                </div>
                <div class="form-text small mt-2"><i class="bi bi-shield-lock me-1"></i>
                  Nama pegawai hanya tampil untuk <b>petugas kesehatan &amp; super admin</b>. Data ini tidak boleh
                  dijadikan dasar tunggal penilaian kinerja.</div>`
                : `<div class="text-center text-muted py-4"><i class="bi bi-emoji-smile fs-1 d-block mb-2 opacity-50"></i>
                   Tidak ada pegawai pada level ${UI.TRIAGE[st.level].label}${st.unit ? ' untuk unit ' + UI.esc(st.unit) : ''}.</div>`}
            </div>
          </div>` : `
          <div class="card border-0 shadow-sm mt-3">
            <div class="card-body p-3">
              <h2 class="h6 fw-bold mb-3"><i class="bi bi-building text-success me-1"></i>Rekap per Unit Kerja (agregat)</h2>
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                  <thead class="table-light"><tr>
                    <th>Unit</th><th class="text-center">Pegawai</th><th class="text-center">HIJAU</th>
                    <th class="text-center">ORANGE</th><th class="text-center">MERAH</th><th class="text-center">Belum MCU</th>
                    <th class="text-center">% Merah+Orange</th>
                  </tr></thead>
                  <tbody>
                    ${unitRows.length ? unitRows.map(u => `<tr>
                      <td class="fw-semibold">${UI.esc(u.unit)}</td>
                      <td class="text-center">${u.total_pegawai}</td>
                      <td class="text-center"><span class="badge text-bg-success-subtle text-success">${u.hijau}</span></td>
                      <td class="text-center"><span class="badge triage-badge triage-orange">${u.orange}</span></td>
                      <td class="text-center"><span class="badge triage-badge triage-merah">${u.merah}</span></td>
                      <td class="text-center">${u.belum}</td>
                      <td class="text-center fw-semibold">${u.total_pegawai ? Math.round((u.orange + u.merah) * 100 / u.total_pegawai) : 0}%</td>
                    </tr>`).join('') : '<tr><td colspan="7" class="text-center text-muted py-4">Belum ada data</td></tr>'}
                  </tbody>
                </table>
              </div>
              ${isPim ? '<div class="form-text small mt-2"><i class="bi bi-incognito me-1"></i>Data unit ditampilkan dalam bentuk agregat tanpa identitas individual.</div>' : ''}
            </div>
          </div>`;

        body.innerHTML = `
          ${notice}
          <div class="row g-3 mb-3">
            ${UI.triageTile('hijau', tri.hijau || 0, total)}
            ${UI.triageTile('orange', tri.orange || 0, total)}
            ${UI.triageTile('merah', tri.merah || 0, total)}
            ${UI.triageTile('belum', tri.belum_mcu || 0, total)}
          </div>

          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body p-3">
              <div class="row g-2 mb-3">
                ${legend}
              </div>
              <div class="row g-3">
                <div class="col-lg-4">
                  <h3 class="h6 fw-bold mb-2">Komposisi Kondisi Kesehatan</h3>
                  <div class="chart-box" style="height:260px"><canvas id="an_donut"></canvas></div>
                </div>
                <div class="col-lg-8">
                  <h3 class="h6 fw-bold mb-2">Sebaran per Unit Kerja (bertumpuk)</h3>
                  <div class="chart-box" style="height:260px"><canvas id="an_unit_bar"></canvas></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body p-3">
              <h2 class="h6 fw-bold mb-2"><i class="bi bi-graph-up-arrow text-success me-1"></i>Tren Level Kondisi Kesehatan (${st.months} bulan terakhir)</h2>
              <div class="chart-box" style="height:250px"><canvas id="an_trend"></canvas></div>
              <div class="form-text small">Berdasarkan jumlah hasil MCU selesai per bulan pada masing-masing level.</div>
            </div>
          </div>
          ${listSection}`;

        /* ---------- render grafik ---------- */
        const C = UI.TRIAGE;
        Charts.doughnut('an_donut',
          [C.hijau.label, C.orange.label, C.merah.label, C.belum.label],
          [tri.hijau || 0, tri.orange || 0, tri.merah || 0, tri.belum_mcu || 0],
          [C.hijau.color, C.orange.color, C.merah.color, C.belum.color]);
        Charts.barStacked('an_unit_bar', unitRows.map(r => r.unit), [
          { label: 'HIJAU', data: unitRows.map(r => r.hijau), backgroundColor: C.hijau.color, borderRadius: 3 },
          { label: 'ORANGE', data: unitRows.map(r => r.orange), backgroundColor: C.orange.color, borderRadius: 3 },
          { label: 'MERAH', data: unitRows.map(r => r.merah), backgroundColor: C.merah.color, borderRadius: 3 },
          { label: 'Belum MCU', data: unitRows.map(r => r.belum), backgroundColor: C.belum.color, borderRadius: 3 }
        ]);
        Charts.line('an_trend', trend.map(t => t.bulan), [
          { label: 'HIJAU', data: trend.map(t => t.hijau), borderColor: C.hijau.color, backgroundColor: 'rgba(34,197,94,.12)', fill: true, tension: .35, pointRadius: 3 },
          { label: 'ORANGE', data: trend.map(t => t.orange), borderColor: C.orange.color, backgroundColor: 'rgba(245,158,11,.12)', fill: true, tension: .35, pointRadius: 3 },
          { label: 'MERAH', data: trend.map(t => t.merah), borderColor: C.merah.color, backgroundColor: 'rgba(220,38,38,.10)', fill: true, tension: .35, pointRadius: 3 }
        ]);

        /* ---------- interaksi ---------- */
        body.querySelectorAll('#an_tabs [data-level]').forEach(b => b.onclick = () => {
          st.level = b.dataset.level;
          refresh();
        });
        body.querySelectorAll('[data-emp]').forEach(b => b.onclick = () => {
          try { App.modules.pegawai.detail(JSON.parse(b.dataset.row)); } catch (e) { UI.toast('Detail tidak tersedia', 'warning'); }
        });

        // tombol ekspor
        mount.querySelector('#an_xls').onclick = () => {
          try {
            if (isMed) {
              if (!list || !list.length) return UI.toast('Tidak ada data untuk diekspor', 'warning');
              Export.excel('analisis_kesehatan_' + st.level, list, [
                { key: 'nip', label: 'NIP' }, { key: 'nama', label: 'Nama Pegawai' }, { key: 'unit', label: 'Unit' },
                { key: 'health_status', label: 'Klasifikasi 5 Tingkat', plain: r => (UI.HL[r.health_status] || [r.health_status])[0] },
                { key: 'tanggal', label: 'Tanggal MCU', plain: r => r.tanggal || '' },
                { key: 'perlu_tl', label: 'Perlu Tindak Lanjut', plain: r => r.perlu_tl ? 'Ya' : 'Tidak' },
                { key: 'catatan', label: 'Rencana Tindak Lanjut', plain: r => r.catatan || '' }
              ]);
            } else {
              if (!unitRows.length) return UI.toast('Tidak ada data untuk diekspor', 'warning');
              Export.excel('analisis_kesehatan_per_unit', unitRows, [
                { key: 'unit', label: 'Unit' }, { key: 'total_pegawai', label: 'Pegawai' },
                { key: 'hijau', label: 'HIJAU (Sehat)' }, { key: 'orange', label: 'ORANGE (Kurang Baik)' },
                { key: 'merah', label: 'MERAH (Perlu Tindak Lanjut)' }, { key: 'belum', label: 'Belum MCU' }
              ]);
            }
          } catch (e) { UI.toast(db.errMessage(e), 'danger'); }
        };
        mount.querySelector('#an_print').onclick = () => window.print();
      } catch (e) {
        console.error(e);
        body.innerHTML = `<div class="alert alert-danger shadow-sm">
          <b><i class="bi bi-exclamation-triangle me-1"></i>Gagal memuat analisis.</b><br>
          ${UI.esc(db.errMessage(e))}<br>
          <span class="small">Jika database Anda diinstal sebelum fitur ini ada, jalankan ulang
          <code>supabase/06_analisis_kondisi.sql</code> di SQL Editor (lihat docs/PANDUAN-SUPABASE.md).</span></div>`;
      }
    }

    mount.querySelector('#an_unit').onchange = e => { st.unit = e.target.value; refresh(); };
    mount.querySelector('#an_months').onchange = e => { st.months = +e.target.value; refresh(); };
    mount.querySelector('#an_refresh').onclick = () => refresh();
    await refresh();
  }
};
