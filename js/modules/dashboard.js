/* ============================================================================
 * MODUL: Dashboard (agregat utk SA/HRD/Petugas/Pimpinan, personal utk Pegawai)
 * ----------------------------------------------------------------------------
 * TAHAN-GAGAL: kegagalan satu RPC TIDAK membuat dashboard kosong.
 * Panggilan yang gagal dikumpulkan dan ditampilkan sebagai banner diagnostik
 * dengan saran perbaikan (mis. fungsi SQL belum terpasang / RLS / jaringan).
 * ========================================================================== */

/** Petunjuk perbaikan berdasarkan pesan error yang diterima */
function dashboardFailHint(msg) {
  if (/PGRST202|Could not find the function|schema cache/i.test(msg)) {
    return 'Fungsi database (RPC) belum terpasang — database kemungkinan dibuat dari file SQL versi lama. ' +
      'Jalankan ulang <b>supabase/01_schema.sql</b> versi terbaru (atau minimal <b>supabase/06_analisis_kondisi.sql</b>) ' +
      'di Supabase SQL Editor, tunggu &plusmn;1 menit agar cache API menyegarkan, lalu muat ulang halaman ini.';
  }
  if (/Akses ditolak/i.test(msg)) {
    return 'Peran akun Anda belum aktif di tabel <b>user_roles</b>. Ikuti <b>docs/PANDUAN-SUPABASE.md</b> Langkah 3 ' +
      '(Buat Akun Super Admin) atau hubungi Super Admin.';
  }
  if (/Failed to fetch|NetworkError|Load failed|fetch/i.test(msg)) {
    return 'Tidak dapat menghubungi server Supabase. Periksa koneksi internet serta Project URL &amp; anon key pada <b>js/config.js</b>.';
  }
  if (/permission denied|42501|JWT|row-level security/i.test(msg)) {
    return 'Akses ditolak kebijakan RLS. Pastikan peran pengguna sudah diatur dengan benar (Pengaturan &rarr; Manajemen Pengguna).';
  }
  return 'Muat ulang halaman. Jika berlanjut, buka Console browser (F12) untuk detail teknis.';
}

/** Banner diagnostik dari daftar kegagalan [{name, msg}] */
function dashboardDiagBanner(fails) {
  if (!fails.length) return '';
  return `
  <div class="alert alert-warning border-0 shadow-sm mb-3">
    <div class="d-flex align-items-start gap-2">
      <i class="bi bi-exclamation-triangle-fill text-warning fs-5 mt-1"></i>
      <div class="flex-grow-1 small">
        <b>Sebagian data tidak dapat dimuat (${fails.length} panggilan gagal)</b> — bagian lain tetap ditampilkan.
        <ul class="mb-2 mt-1 ps-3">
          ${fails.map(f => `<li><code>${UI.esc(f.name)}</code>: ${UI.esc(f.msg)}</li>`).join('')}
        </ul>
        <div><b>Saran perbaikan:</b> ${dashboardFailHint(fails[0].msg)}</div>
        <button class="btn btn-outline-secondary btn-sm mt-2" onclick="location.reload()">
          <i class="bi bi-arrow-clockwise me-1"></i>Muat Ulang</button>
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="alert" title="Tutup"></button>
    </div>
  </div>`;
}

/** Grid "Menu Cepat" — dikelompokkan per bagian (selaras dengan sidebar) */
function dashboardQuickMenu() {
  const items = RBAC.menuFor(Auth.role).filter(m => m.id !== 'dashboard' && m.id !== 'notifikasi');
  const groups = [];
  items.forEach(m => {
    const g = m.group || 'Lainnya';
    const last = groups[groups.length - 1];
    if (last && last.name === g) last.items.push(m);
    else groups.push({ name: g, items: [m] });
  });
  return `
  <div class="card border-0 shadow-sm mb-3">
    <div class="card-body p-3">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h2 class="h6 fw-bold mb-0"><i class="bi bi-grid-3x3-gap-fill text-success me-1"></i>Menu Cepat</h2>
        <span class="small text-muted"><i class="bi bi-person-check me-1"></i>${items.length} modul untuk ${ROLE_LABELS[Auth.role]}</span>
      </div>
      ${groups.map(g => `
      <div class="qmenu-group">
        <div class="qmenu-group-label">${UI.esc(g.name)}</div>
        <div class="qmenu">
          ${g.items.map(m => `
          <a class="qmenu-tile" href="#/${m.id}" title="${UI.esc(m.label)}">
            <span class="qmenu-icon"><i class="bi ${m.icon}"></i></span>
            <span class="min-w-0">
              <span class="qmenu-label d-block text-truncate">${UI.esc(m.label)}</span>
              <span class="qmenu-desc d-block text-truncate">${UI.esc(m.desc || '')}</span>
            </span>
          </a>`).join('')}
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

App.modules.dashboard = {
  async render(mount) {
    if (Auth.role === ROLES.PEG) return this.personal(mount);
    return this.aggregate(mount);
  },

  /* ---------- PIMPINAN & HRD & PETUGAS & SA : agregat ---------- */
  async aggregate(mount) {
    const isPim = Auth.role === ROLES.PIM;
    const isHrd = Auth.role === ROLES.HRD;
    const isMed = Auth.isAny(ROLES.SA, ROLES.PET); // petugas kesehatan / super admin

    /* --- pemuatan tahan-gagal --- */
    const fails = [];
    const safe = async (name, fn, fallback) => {
      try { const r = await fn(); return (r === null || r === undefined) ? fallback : r; }
      catch (e) {
        console.warn('[MADANI]', name, e);
        fails.push({ name, msg: String((e && e.message) || e) });
        return fallback;
      }
    };

    const [counts0, dist, mcuM, izinM, izinK, tri, triUnit, unit] = await Promise.all([
      safe('rpc_dashboard_counts', () => db.rpc('rpc_dashboard_counts'), {}),
      safe('rpc_health_status_distribution', () => db.rpc('rpc_health_status_distribution'), []),
      safe('rpc_mcu_monthly', () => db.rpc('rpc_mcu_monthly', { p_months: 12 }), []),
      safe('rpc_sickleave_monthly', () => db.rpc('rpc_sickleave_monthly', { p_months: 12 }), []),
      safe('rpc_sickleave_category', () => db.rpc('rpc_sickleave_category'), []),
      safe('rpc_health_triage', () => db.rpc('rpc_health_triage'), {}),
      safe('rpc_health_triage_by_unit', () => db.rpc('rpc_health_triage_by_unit'), []),
      safe('rpc_unit_summary', () => db.rpc('rpc_unit_summary'), [])
    ]);
    let triList = [];
    if (isMed) {
      triList = await safe('rpc_health_triage_list', () => db.rpc('rpc_health_triage_list', { p_level: 'merah' }), []);
    }

    const C = Object.assign({
      total_pegawai: 0, mcu_bulan_ini: 0, mcu_terjadwal: 0, perlu_tindak_lanjut: 0,
      izin_bulan_ini: 0, izin_hari_bulan_ini: 0, izin_menunggu: 0,
      program_aktif: 0, konsultasi_menunggu: 0, bpjs_aktif: 0
    }, counts0 || {});

    const cards = [
      { icon: 'bi-people-fill', label: 'Total Pegawai Aktif', value: C.total_pegawai, color: 'success', href: 'pegawai' },
      { icon: 'bi-clipboard2-pulse-fill', label: 'MCU Bulan Ini', value: C.mcu_bulan_ini, color: 'primary', sub: `${C.mcu_terjadwal} terjadwal ke depan`, href: 'mcu' },
      { icon: 'bi-heart-pulse-fill', label: 'Perlu Tindak Lanjut', value: C.perlu_tindak_lanjut, color: 'danger', sub: 'pemantauan / TL / perawatan', href: 'analisis' },
      { icon: 'bi-thermometer-half', label: 'Izin Sakit Bulan Ini', value: C.izin_bulan_ini, color: 'warning', sub: `${C.izin_hari_bulan_ini} hari kerja`, href: 'izin' },
      { icon: 'bi-activity', label: 'Program Berjalan', value: C.program_aktif, color: 'info', href: 'program' },
      { icon: 'bi-shield-check', label: 'BPJS Aktif', value: C.bpjs_aktif, color: 'success', href: 'bpjs' }
    ];
    if (isMed) {
      cards.push({ icon: 'bi-chat-dots-fill', label: 'Konsultasi Menunggu', value: C.konsultasi_menunggu, color: 'secondary', href: 'profil' });
      cards.push({ icon: 'bi-patch-check-fill', label: 'Izin Menunggu Verifikasi', value: C.izin_menunggu, color: 'warning', href: 'izin' });
    }

    mount.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h1 class="h4 fw-bold mb-1">Assalamu'alaikum, ${UI.esc(Auth.name)}</h1>
          <div class="text-muted small">${UI.esc(APP_CONFIG.org)} — Ringkasan kesehatan pegawai ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
        </div>
        <div class="small text-muted"><i class="bi bi-shield-lock me-1"></i>Peran Anda: ${ROLE_LABELS[Auth.role]}</div>
      </div>

      ${dashboardDiagBanner(fails)}
      ${dashboardQuickMenu()}

      <div class="row g-3 mb-4" id="db_cards">${cards.map(UI.statCard).join('')}</div>

      <!-- ============ GRAFIK ANALISIS KONDISI KESEHATAN (HIJAU/ORANGE/MERAH) ============ -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body p-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h2 class="h6 fw-bold mb-0"><i class="bi bi-clipboard2-data-fill text-success me-1"></i>
              Grafik Analisis Kondisi Kesehatan Pegawai — Level <span class="text-success">Hijau</span> ·
              <span class="text-warning">Orange</span> · <span class="text-danger">Merah</span></h2>
            <a class="btn btn-outline-success btn-sm" href="#/analisis"><i class="bi bi-zoom-in me-1"></i>Analisis Lengkap</a>
          </div>
          <div class="d-flex flex-wrap gap-3 small mb-3">
            <span><span class="triage-dot d-inline-block me-1" style="background:${UI.TRIAGE.hijau.color}"></span><b>HIJAU</b> — sehat &amp; baik-baik saja</span>
            <span><span class="triage-dot d-inline-block me-1" style="background:${UI.TRIAGE.orange.color}"></span><b>ORANGE</b> — ada yang kurang baik, perlu perhatian</span>
            <span><span class="triage-dot d-inline-block me-1" style="background:${UI.TRIAGE.merah.color}"></span><b>MERAH</b> — perlu penanganan lebih &amp; tindak lanjut</span>
          </div>
          <div class="row g-3 mb-1">
            ${UI.triageTile('hijau', tri.hijau || 0, tri.total_aktif || 0)}
            ${UI.triageTile('orange', tri.orange || 0, tri.total_aktif || 0)}
            ${UI.triageTile('merah', tri.merah || 0, tri.total_aktif || 0)}
            ${UI.triageTile('belum', tri.belum_mcu || 0, tri.total_aktif || 0)}
          </div>
          <div class="row g-3 mt-1">
            <div class="col-lg-4">
              <h3 class="h6 fw-bold mb-2">Komposisi Kondisi Kesehatan</h3>
              <div class="chart-box" style="height:235px"><canvas id="ch_triage"></canvas></div>
            </div>
            <div class="col-lg-8">
              <h3 class="h6 fw-bold mb-2">Sebaran per Unit Kerja</h3>
              <div class="chart-box" style="height:235px"><canvas id="ch_triage_unit"></canvas></div>
            </div>
          </div>
          ${isMed && triList.length ? `
          <div class="alert alert-danger border-0 small mt-3 mb-0 py-2">
            <b><i class="bi bi-exclamation-octagon-fill me-1"></i>Perlu penanganan &amp; tindak lanjut segera (${triList.length} pegawai MERAH):</b>
            ${triList.map(r => `<span class="badge triage-badge triage-merah me-1" role="button" title="${UI.esc(r.catatan || 'Lihat analisis')}">${UI.esc(r.nama)} · ${UI.fmtDate(r.tanggal)}</span>`).join(' ')}
            <a href="#/analisis" class="fw-bold ms-1">kelola &rarr;</a>
          </div>` : ''}
          ${isPim || isHrd ? `<div class="form-text small mt-2"><i class="bi bi-shield-lock me-1"></i>
            Anda melihat agregat tanpa nama individual. Klasifikasi ditetapkan oleh petugas kesehatan berdasarkan MCU.</div>` : ''}
        </div>
      </div>

      ${isPim ? `<div class="alert alert-info border-0 small shadow-sm"><i class="bi bi-incognito me-1"></i>
        Sebagai <b>Pimpinan</b>, Anda melihat <b>agregat &amp; tren anonim</b> sesuai kebijakan perlindungan data (UU No. 27/2022).
        Identitas individual pegawai tidak ditampilkan.</div>` : ''}

      <div class="row g-3 mb-3">
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm h-100"><div class="card-body">
            <h2 class="h6 fw-bold mb-3"><i class="bi bi-pie-chart-fill text-success me-1"></i>Distribusi Status Kesehatan (hasil MCU terakhir)</h2>
            <div class="chart-box"><canvas id="ch_status"></canvas></div>
          </div></div>
        </div>
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm h-100"><div class="card-body">
            <h2 class="h6 fw-bold mb-3"><i class="bi bi-graph-up-arrow text-success me-1"></i>Tren Medical Check Up 12 Bulan</h2>
            <div class="chart-box"><canvas id="ch_mcu"></canvas></div>
          </div></div>
        </div>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm h-100"><div class="card-body">
            <h2 class="h6 fw-bold mb-3"><i class="bi bi-bar-chart-fill text-success me-1"></i>Izin Sakit per Bulan (kasus &amp; hari)</h2>
            <div class="chart-box"><canvas id="ch_izin"></canvas></div>
          </div></div>
        </div>
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm h-100"><div class="card-body">
            <h2 class="h6 fw-bold mb-3"><i class="bi bi-list-ul text-success me-1"></i>Izin Sakit per Kategori (1 tahun)</h2>
            <div class="chart-box"><canvas id="ch_kat"></canvas></div>
          </div></div>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <h2 class="h6 fw-bold mb-3"><i class="bi bi-building text-success me-1"></i>Rekap per Unit Kerja (anonim)</h2>
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead class="table-light"><tr>
                <th>Unit</th><th class="text-center">Pegawai</th><th class="text-center">Sehat</th>
                <th class="text-center">Catatan</th><th class="text-center">Pemantauan</th>
                <th class="text-center">Tindak Lanjut</th><th class="text-center">Perawatan</th>
                <th class="text-center">Belum MCU</th><th class="text-center">Hari Izin (1 th)</th>
              </tr></thead>
              <tbody>
                ${(unit || []).length ? unit.map(u => `<tr>
                  <td class="fw-semibold">${UI.esc(u.unit || 'Tanpa Unit')}</td>
                  <td class="text-center">${u.total_pegawai}</td>
                  <td class="text-center"><span class="badge text-bg-success-subtle text-success">${u.sehat}</span></td>
                  <td class="text-center"><span class="badge text-bg-info-subtle text-info">${u.sehat_catatan}</span></td>
                  <td class="text-center"><span class="badge text-bg-warning-subtle text-warning-emphasis">${u.pemantauan}</span></td>
                  <td class="text-center"><span class="badge text-bg-danger-subtle text-danger">${u.tindak_lanjut}</span></td>
                  <td class="text-center"><span class="badge text-bg-dark-subtle">${u.perawatan}</span></td>
                  <td class="text-center">${u.belum_mcu}</td>
                  <td class="text-center fw-semibold">${u.izin_hari}</td>
                </tr>`).join('') : '<tr><td colspan="9" class="text-center text-muted py-4">Belum ada data</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    // Klik kartu -> pindah modul
    mount.querySelectorAll('[data-href]').forEach(c => c.onclick = () => location.hash = c.dataset.href);

    Charts.doughnut('ch_status', dist.map(d => d.label), dist.map(d => d.jumlah));
    Charts.doughnut('ch_triage',
      [UI.TRIAGE.hijau.label, UI.TRIAGE.orange.label, UI.TRIAGE.merah.label, UI.TRIAGE.belum.label],
      [tri.hijau || 0, tri.orange || 0, tri.merah || 0, tri.belum_mcu || 0],
      [UI.TRIAGE.hijau.color, UI.TRIAGE.orange.color, UI.TRIAGE.merah.color, UI.TRIAGE.belum.color]);
    Charts.barStacked('ch_triage_unit', triUnit.map(u => u.unit), [
      { label: 'HIJAU', data: triUnit.map(u => u.hijau), backgroundColor: UI.TRIAGE.hijau.color, borderRadius: 3 },
      { label: 'ORANGE', data: triUnit.map(u => u.orange), backgroundColor: UI.TRIAGE.orange.color, borderRadius: 3 },
      { label: 'MERAH', data: triUnit.map(u => u.merah), backgroundColor: UI.TRIAGE.merah.color, borderRadius: 3 },
      { label: 'Belum MCU', data: triUnit.map(u => u.belum), backgroundColor: UI.TRIAGE.belum.color, borderRadius: 3 }
    ]);
    Charts.line('ch_mcu', mcuM.map(m => m.bulan), [
      { label: 'Total MCU', data: mcuM.map(m => m.total), borderColor: Charts.COLORS.green, backgroundColor: 'rgba(22,101,52,.12)', fill: true, tension: .35, pointRadius: 3 },
      { label: 'Selesai', data: mcuM.map(m => m.selesai), borderColor: Charts.COLORS.gold, backgroundColor: 'rgba(217,119,6,.10)', fill: true, tension: .35, pointRadius: 3 }
    ]);
    Charts.bar('ch_izin', izinM.map(m => m.bulan), [
      { label: 'Kasus izin', data: izinM.map(m => m.kasus), backgroundColor: 'rgba(34,197,94,.65)', borderRadius: 4 },
      { label: 'Total hari', data: izinM.map(m => m.hari), backgroundColor: 'rgba(217,119,6,.65)', borderRadius: 4 }
    ]);
    Charts.bar('ch_kat', izinK.map(k => k.kategori), [
      { label: 'Kasus', data: izinK.map(k => k.kasus), backgroundColor: 'rgba(13,148,136,.7)', borderRadius: 4 }
    ], true);
  },

  /* ---------- PEGAWAI : personal ---------- */
  async personal(mount) {
    const fails = [];
    let d = null;
    try { d = await db.rpc('rpc_my_dashboard'); }
    catch (e) {
      console.warn('[MADANI] rpc_my_dashboard', e);
      fails.push({ name: 'rpc_my_dashboard', msg: String((e && e.message) || e) });
    }

    if (fails.length) {
      mount.innerHTML = `
        <h1 class="h4 fw-bold mb-1">Kesehatan Saya</h1>
        <div class="text-muted small mb-3">Ringkasan data kesehatan pribadi — hanya Anda yang dapat melihat halaman ini.</div>
        ${dashboardDiagBanner(fails)}
        ${dashboardQuickMenu()}`;
      return;
    }

    if (d.no_profile) {
      mount.innerHTML = `
        <h1 class="h4 fw-bold mb-1">Kesehatan Saya</h1>
        <div class="text-muted small mb-3">Ringkasan data kesehatan pribadi — hanya Anda yang dapat melihat halaman ini.</div>
        <div class="alert alert-info shadow-sm border-0">
          <h2 class="h5 fw-bold"><i class="bi bi-person-badge me-1"></i>Akun belum terhubung ke data pegawai</h2>
          <p class="mb-2 small">Hubungi <b>HRD / Petugas Kesehatan</b> agar akun Anda dihubungkan dengan data pegawai.
          Setelah terhubung, halaman ini akan menampilkan status kesehatan, jadwal MCU, dan data pribadi Anda.</p>
          <p class="mb-0 small text-muted">Sementara itu, Anda tetap dapat memakai modul di bawah ini.</p>
        </div>
        ${dashboardQuickMenu()}`;
      return;
    }

    const lm = d.last_mcu, nm = d.next_mcu, lab = d.lab_terakhir;
    const lv = lm && lm.status ? UI.triageLevel(lm.status) : 'belum';
    const T = UI.TRIAGE[lv];
    const cards = [
      { icon: 'bi-clipboard2-pulse-fill', label: 'MCU Terakhir', value: lm ? UI.fmtDate(lm.tanggal) : 'Belum ada', color: 'primary', sub: lm && UI.HL[lm.status] ? UI.HL[lm.status][0] : '-' },
      { icon: 'bi-calendar-check-fill', label: 'MCU Berikutnya', value: nm ? UI.fmtDate(nm.tanggal) : '-', color: 'success', sub: nm ? 'Jenis: ' + (nm.jenis || '-') : 'Belum dijadwalkan' },
      { icon: 'bi-thermometer-half', label: 'Hari Izin Sakit (tahun ini)', value: d.izin_tahun_ini ?? 0, color: 'warning', sub: `${d.izin_kasus_tahun_ini ?? 0} kali mengajukan` },
      { icon: 'bi-activity', label: 'Program Diikuti', value: d.program_diikuti ?? 0, color: 'info' }
    ];
    const labRows = lab ? [
      ['Tanggal Lab', UI.fmtDate(lab.tanggal)],
      ['Gula Darah Puasa', lab.gdp ? lab.gdp + ' mg/dL' : '-'],
      ['Kolesterol Total', lab.kolesterol ? lab.kolesterol + ' mg/dL' : '-'],
      ['Asam Urat', lab.asam_urat ? lab.asam_urat + ' mg/dL' : '-'],
      ['Hemoglobin', lab.hb ? lab.hb + ' g/dL' : '-'],
      ['SGPT', lab.sgpt ? lab.sgpt + ' U/L' : '-']
    ] : [];

    mount.innerHTML = `
      <h1 class="h4 fw-bold mb-1">Kesehatan Saya</h1>
      <div class="text-muted small mb-3">Ringkasan data kesehatan pribadi — hanya Anda yang dapat melihat halaman ini.</div>
      ${dashboardQuickMenu()}
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body d-flex flex-wrap align-items-center gap-3 triage-personal triage-personal-${T.key}">
          <div class="triage-dot" style="background:${T.color};width:18px;height:18px"></div>
          <div class="flex-grow-1">
            <div class="fw-bold" style="color:${T.color}">Level Kondisi Kesehatan Anda: ${T.label} — ${T.meaning}</div>
            <div class="small text-muted">${T.desc}</div>
          </div>
          <a class="btn btn-sm btn-outline-success" href="#/mcu"><i class="bi bi-clipboard2-pulse me-1"></i>Riwayat MCU Saya</a>
        </div>
      </div>
      <div class="row g-3 mb-4">${cards.map(UI.statCard).join('')}</div>
      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm h-100"><div class="card-body">
            <h2 class="h6 fw-bold mb-3"><i class="bi bi-droplet-half text-success me-1"></i>Hasil Laboratorium Terakhir</h2>
            ${labRows.length ? `<table class="table table-sm mb-0">${labRows.map(r =>
              `<tr><td class="text-muted">${r[0]}</td><td class="text-end fw-semibold">${r[1]}</td></tr>`).join('')}</table>
              <div class="form-text small mt-2"><i class="bi bi-info-circle me-1"></i>Penilaian hasil hanya dilakukan oleh petugas kesehatan/tenaga medis.</div>`
              : '<div class="text-muted small">Belum ada data laboratorium.</div>'}
          </div></div>
        </div>
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm h-100"><div class="card-body">
            <h2 class="h6 fw-bold mb-3"><i class="bi bi-lightning-charge-fill text-success me-1"></i>Aksi Cepat</h2>
            <div class="d-grid gap-2">
              <a class="btn btn-outline-success btn-sm text-start" href="#/mcu"><i class="bi bi-clipboard2-pulse me-1"></i>Lihat riwayat &amp; jadwal MCU saya</a>
              <a class="btn btn-outline-success btn-sm text-start" href="#/lab"><i class="bi bi-droplet me-1"></i>Hasil laboratorium lengkap</a>
              <a class="btn btn-outline-success btn-sm text-start" href="#/izin"><i class="bi bi-thermometer-half me-1"></i>Ajukan izin sakit</a>
              <a class="btn btn-outline-success btn-sm text-start" href="#/profil"><i class="bi bi-chat-dots me-1"></i>Ajukan konsultasi kesehatan</a>
              <a class="btn btn-outline-success btn-sm text-start" href="#/ai"><i class="bi bi-robot me-1"></i>Tanya AI Health Assistant</a>
            </div>
          </div></div>
        </div>
      </div>`;
  }
};
