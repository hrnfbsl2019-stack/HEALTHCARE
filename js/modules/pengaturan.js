/* ============================================================================
 * MODUL: Pengaturan
 *  Tab: Profil Saya | Manajemen Pengguna (SA) | Audit Log (SA) | Pengingat | Integrasi
 * ========================================================================== */

App.modules.pengaturan = {
  async render(mount) {
    const isSA = Auth.role === ROLES.SA;
    const isMed = Auth.isAny(ROLES.SA, ROLES.PET);
    const tabs = [
      { id: 'me', label: 'Profil Saya', icon: 'bi-person-circle', show: true },
      { id: 'identitas', label: 'Identitas Sekolah', icon: 'bi-buildings', show: isSA || Auth.role === ROLES.HRD },
      { id: 'koneksi', label: 'Koneksi Supabase', icon: 'bi-plug-check', show: isSA },
      { id: 'users', label: 'Manajemen Pengguna', icon: 'bi-people-fill', show: isSA },
      { id: 'audit', label: 'Audit Log', icon: bi_or('bi-journal-text', isSA), show: isSA },
      { id: 'reminder', label: 'Pengingat MCU', icon: 'bi-alarm', show: isMed },
      { id: 'wa', label: 'Integrasi WhatsApp', icon: 'bi-whatsapp', show: true }
    ];
    mount.innerHTML = `
      <h1 class="h4 fw-bold mb-1">Pengaturan</h1>
      <div class="text-muted small mb-3">Konfigurasi akun, pengguna, dan integrasi sistem.</div>
      <ul class="nav nav-pills gap-1 mb-3 flex-wrap" id="st_tabs">
        ${tabs.filter(t => t.show).map((t, i) => `<li class="nav-item">
          <button class="nav-link ${i === 0 ? 'active' : ''} small" data-tab="${t.id}">
            <i class="bi ${t.icon} me-1"></i>${t.label}</button></li>`).join('')}
      </ul>
      <div id="st_body"></div>`;

    document.querySelectorAll('#st_tabs [data-tab]').forEach(b => b.onclick = () => {
      document.querySelectorAll('#st_tabs .nav-link').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      this['tab_' + b.dataset.tab]();
    });
    this.tab_me();
  },

  /* ---------- Profil Saya ---------- */
  tab_me() {
    document.getElementById('st_body').innerHTML = `
      <div class="card border-0 shadow-sm" style="max-width:640px"><div class="card-body">
        <div class="d-flex align-items-center gap-3 mb-3">
          <div class="avatar-lg bg-success text-white">${UI.esc((Auth.name || 'U').charAt(0).toUpperCase())}</div>
          <div>
            <div class="fw-bold fs-5">${UI.esc(Auth.name || '-')}</div>
            <div class="small text-muted">${UI.esc(Auth.user?.email || '')}</div>
            <span class="badge text-bg-success mt-1">${ROLE_LABELS[Auth.role] || ''}</span>
            ${Auth.employeeId ? '<span class="badge text-bg-light border mt-1">Terhubung data pegawai ✓</span>'
              : '<span class="badge text-bg-warning mt-1">Belum terhubung data pegawai</span>'}
          </div>
        </div>
        <hr>
        <h6 class="fw-bold">Ubah Kata Sandi</h6>
        <form id="pw_form" class="row g-2" style="max-width:420px">
          <div class="col-12"><input type="password" class="form-control form-control-sm" id="pw1" placeholder="Kata sandi baru (min. 6 karakter)" required></div>
          <div class="col-12"><input type="password" class="form-control form-control-sm" id="pw2" placeholder="Ulangi kata sandi baru" required></div>
          <div class="col-12"><button class="btn btn-success btn-sm"><i class="bi bi-key me-1"></i>Simpan Kata Sandi</button></div>
        </form>
        <hr>
        <div class="small text-muted">
          <i class="bi bi-shield-lock me-1"></i>Sistem ini mengikuti prinsip perlindungan data pribadi (UU No. 27 Tahun 2022).
          Semua akses ke data kesehatan dicatat pada <b>audit log</b>.
        </div>
      </div></div>`;
    document.getElementById('pw_form').onsubmit = async e => {
      e.preventDefault();
      const a = document.getElementById('pw1').value, b = document.getElementById('pw2').value;
      if (a.length < 6) return UI.toast('Kata sandi minimal 6 karakter', 'warning');
      if (a !== b) return UI.toast('Konfirmasi kata sandi tidak sama', 'warning');
      try {
        await Auth.changePassword(a);
        UI.toast('Kata sandi berhasil diubah');
      } catch (err) { UI.toast(db.errMessage(err), 'danger'); }
    };
  },

  /* ---------- Manajemen Pengguna (Super Admin) ---------- */
  async tab_users() {
    const body = document.getElementById('st_body');
    body.innerHTML = `<div class="card border-0 shadow-sm"><div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h6 class="fw-bold mb-0">Manajemen Pengguna & Peran</h6>
          <div class="small text-muted">Aktivasi akun pendaftar, tetapkan peran (5 peran RBAC), dan hubungkan akun dengan data pegawai.</div>
        </div>
        <button class="btn btn-success btn-sm" id="us_refresh"><i class="bi bi-arrow-clockwise"></i> Muat Ulang</button>
      </div>
      <div class="table-responsive"><table class="table table-hover align-middle mb-0">
        <thead class="table-light"><tr><th>Email</th><th>Peran</th><th>Status</th><th>Terhubung Pegawai</th><th class="text-end">Aksi</th></tr></thead>
        <tbody id="us_rows"><tr><td colspan="5" class="text-center py-3"><span class="spinner-border spinner-border-sm text-success"></span></td></tr></tbody>
      </table></div>
    </div></div>`;

    const load = async () => {
      const rows = await db.rpc('rpc_users_list');
      document.getElementById('us_rows').innerHTML = rows.length ? rows.map(u => `<tr>
        <td class="small">${UI.esc(u.email || '(email tidak tersedia)')}</td>
        <td>${UI.badge(ROLE_LABELS[u.role] || u.role, u.role === 'super_admin' ? 'dark' : u.role === 'pimpinan' ? 'info' : 'success')}</td>
        <td>${u.is_active ? UI.badge('Aktif', 'success') : UI.badge('Menunggu Aktivasi', 'warning')}</td>
        <td class="small">${UI.esc(u.nama_pegawai || '-')}</td>
        <td class="text-end"><button class="btn btn-outline-success btn-sm" data-u="${u.user_id}" data-r="${u.role}" data-e="${u.employee_id || ''}" data-a="${u.is_active}"><i class="bi bi-gear"></i> Atur</button></td>
      </tr>`).join('') : '<tr><td colspan="5" class="text-center text-muted py-3">Belum ada pengguna terdaftar</td></tr>';

      body.querySelectorAll('[data-u]').forEach(btn => btn.onclick = () => this.userForm(btn.dataset));
    };
    document.getElementById('us_refresh').onclick = load;
    load();
  },

  async userForm(d) {
    await UI.formModal({
      title: 'Atur Pengguna', size: 'lg',
      fields: [
        { key: 'role', label: 'Peran (RBAC)', type: 'select', required: true, col: 6,
          options: Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
        { key: 'is_active', label: 'Akun aktif (boleh login)', type: 'checkbox', col: 6 },
        { key: 'employee_id', label: 'Hubungkan dengan Data Pegawai', type: 'select', col: 12,
          options: async () => [{ value: '', label: '— Tidak dihubungkan (admin/atasan) —' }, ...(await UI.employeeOptions(true))] },
        { key: 'user_id', type: 'hidden', label: '' }
      ],
      values: { role: d.r, employee_id: d.e, is_active: d.a === 'true', user_id: d.u },
      onSubmit: async vals => {
        await db.rpc('rpc_user_set_role', {
          p_user: vals.user_id, p_role: vals.role,
          p_employee: vals.employee_id || null, p_active: vals.is_active
        });
        UI.toast('Pengaturan pengguna tersimpan');
        this.tab_users();
        return true;
      }
    });
  },

  /* ---------- Audit Log (Super Admin) ---------- */
  tab_audit() {
    UI.listPage({
      mount: document.getElementById('st_body'), table: 'audit_logs',
      title: 'Audit Log', subtitle: 'Rekaman otomatis seluruh perubahan data sensitif (siapa, kapan, apa). Sesuai prinsip akuntabilitas UU No. 27/2022.',
      searchCols: ['user_email', 'table_name', 'action'],
      filters: [{ key: 'action', label: 'Aksi', options: { INSERT: 'INSERT', UPDATE: 'UPDATE', DELETE: 'DELETE' } }],
      defaultSort: { col: 'created_at', dir: 'desc' },
      pageSize: 15,
      canCreate: false, canEdit: () => false, canDelete: () => false,
      columns: [
        { key: 'created_at', label: 'Waktu', render: r => `<span class="small">${UI.fmtDateTime(r.created_at)}</span>`, sortable: true },
        { key: 'user_email', label: 'Pengguna', render: r => UI.esc(r.user_email || '(sistem)') },
        { key: 'action', label: 'Aksi', render: r => UI.badge(r.action, r.action === 'DELETE' ? 'danger' : r.action === 'UPDATE' ? 'warning' : 'success') },
        { key: 'table_name', label: 'Tabel', render: r => `<code class="small">${UI.esc(r.table_name)}</code>` },
        { key: 'record_id', label: 'ID Record', render: r => `<code class="small">${UI.esc((r.record_id || '-').slice(0, 8))}…</code>` }
      ]
    });
  },

  /* ---------- Pengingat MCU ---------- */
  tab_reminder() {
    document.getElementById('st_body').innerHTML = `
      <div class="row g-3">
        <div class="col-lg-6"><div class="card border-0 shadow-sm h-100"><div class="card-body">
          <h6 class="fw-bold"><i class="bi bi-alarm text-success me-1"></i>Kirim Pengingat Jadwal MCU</h6>
          <p class="small text-muted">Mengirim notifikasi in-app ke pegawai yang memiliki jadwal MCU dalam ${APP_CONFIG.reminderDays || 7} hari ke depan
          (pegawai yang akunnya terhubung data pegawai & aktif). Pengiriman aman diulang — tidak ganda per hari.</p>
          <button class="btn btn-success btn-sm" id="rm_go"><i class="bi bi-send me-1"></i>Jalankan Pengingat Sekarang</button>
          <div id="rm_out" class="small mt-2"></div>
        </div></div></div>
        <div class="col-lg-6"><div class="card border-0 shadow-sm h-100"><div class="card-body">
          <h6 class="fw-bold"><i class="bi bi-info-circle text-success me-1"></i>Cara Kerja Pengingat</h6>
          <ul class="small text-muted mb-0">
            <li><b>Otomatis:</b> notifikasi tindak lanjut dikirim trigger database saat petugas membuat tindak lanjut.</li>
            <li><b>Manual:</b> tombol di sebelah kiri mengirim pengingat jadwal MCU.</li>
            <li><b>WhatsApp (opsional):</b> lihat tab Integrasi WhatsApp — dikirim melalui Supabase Edge Function + penyedia WA API resmi.</li>
          </ul>
        </div></div></div>
      </div>`;
    document.getElementById('rm_go').onclick = async () => {
      try {
        const n = await db.rpc('rpc_generate_mcu_reminders', { p_days: APP_CONFIG.reminderDays || 7 });
        document.getElementById('rm_out').innerHTML =
          `<div class="alert alert-success py-2 mb-0"><i class="bi bi-check-circle me-1"></i>${n} pengingat terkirim.</div>`;
        App.refreshNotifBadge();
      } catch (e) {
        document.getElementById('rm_out').innerHTML = `<div class="alert alert-danger py-2 mb-0">${UI.esc(db.errMessage(e))}</div>`;
      }
    };
  },

  /* ---------- Identitas Sekolah (nama + logo) ---------- */
  tab_identitas() {
    const canEdit = Auth.isAny(ROLES.SA, ROLES.HRD);
    const logo = Branding.logo();
    document.getElementById('st_body').innerHTML = `
      <div class="row g-3">
        <div class="col-lg-7"><div class="card border-0 shadow-sm h-100"><div class="card-body">
          <h6 class="fw-bold"><i class="bi bi-buildings text-success me-1"></i>Identitas Organisasi</h6>
          <p class="small text-muted">Nama & tagline tampil pada halaman login, sidebar, sapaan dashboard, dan judul aplikasi untuk semua pengguna.</p>
          <form id="id_form" class="row g-2">
            <div class="col-12">
              <label class="form-label small fw-semibold">Nama Organisasi / Sekolah</label>
              <input class="form-control" id="id_org" maxlength="120" value="${UI.esc(Branding.org())}" ${canEdit ? '' : 'disabled'}>
            </div>
            <div class="col-12">
              <label class="form-label small fw-semibold">Tagline / Deskripsi Singkat</label>
              <input class="form-control" id="id_tag" maxlength="120" value="${UI.esc(Branding.tagline())}" ${canEdit ? '' : 'disabled'}>
            </div>
            ${canEdit ? `
            <div class="col-12 mt-2 d-flex gap-2">
              <button class="btn btn-success btn-sm"><i class="bi bi-save me-1"></i>Simpan Identitas</button>
              <button type="button" class="btn btn-outline-secondary btn-sm" id="id_reset"><i class="bi bi-arrow-counterclockwise me-1"></i>Kembalikan Bawaan</button>
            </div>` : '<div class="col-12"><div class="alert alert-light border small py-2 mb-0">Hanya Super Admin / HRD yang dapat mengubah identitas.</div></div>'}
          </form>
          <div class="alert alert-light border small py-2 mt-3 mb-0"><i class="bi bi-info-circle me-1"></i>
          Tersimpan di tabel <code>app_settings</code> (jalankan <code>supabase/08_branding.sql</code> bila tabel belum ada).
          Mode demo: tersimpan di peramban ini saja.</div>
        </div></div></div>
        <div class="col-lg-5"><div class="card border-0 shadow-sm h-100"><div class="card-body">
          <h6 class="fw-bold"><i class="bi bi-image text-success me-1"></i>Logo Aplikasi</h6>
          <div class="text-center my-3">
            <div style="width:96px;height:96px;margin:0 auto;background:var(--hijau-muda,#dcfce7);border-radius:20px;display:grid;place-items:center;overflow:hidden;font-size:2.5rem;color:var(--hijau,#16a34a)">
              ${logo ? `<img src="${logo}" alt="Logo" style="width:100%;height:100%;object-fit:contain;background:#fff">` : '<i class="bi bi-heart-pulse-fill"></i>'}
            </div>
            <div class="small text-muted mt-2">Tampil di sidebar & halaman login</div>
          </div>
          ${canEdit ? `
          <input type="file" class="form-control form-control-sm" id="id_logo" accept="image/png,image/jpeg,image/webp,image/svg+xml">
          <div class="small text-muted mt-1">PNG/JPG/WebP/SVG — otomatis dikecilkan hingga 320px.</div>
          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-success btn-sm" id="id_logo_up"><i class="bi bi-upload me-1"></i>Unggah Logo</button>
            <button class="btn btn-outline-secondary btn-sm" id="id_logo_del"><i class="bi bi-x-circle me-1"></i>Hapus Logo</button>
          </div>` : ''}
        </div></div></div>
      </div>`;

    if (!canEdit) return;
    const form = document.getElementById('id_form');
    form.onsubmit = async e => {
      e.preventDefault();
      try {
        await Branding.save({
          org_name: document.getElementById('id_org').value.trim() || APP_CONFIG.org,
          org_tagline: document.getElementById('id_tag').value.trim() || APP_CONFIG.appTagline
        });
        UI.toast('Identitas tersimpan & langsung diterapkan ke semua halaman');
      } catch (err) { UI.toast(db.errMessage(err), 'danger'); }
    };
    document.getElementById('id_reset').onclick = async () => {
      try {
        await Branding.save({ org_name: Branding.defaults.org, org_tagline: Branding.defaults.tagline }, null);
        UI.toast('Identitas kembali ke bawaan');
        this.tab_identitas();
      } catch (err) { UI.toast(db.errMessage(err), 'danger'); }
    };
    document.getElementById('id_logo_up').onclick = async () => {
      const f = document.getElementById('id_logo').files[0];
      if (!f) return UI.toast('Pilih file logo terlebih dahulu', 'warning');
      try {
        const dataUrl = await Branding.compressLogo(f);
        await Branding.save({}, dataUrl);
        UI.toast('Logo diperbarui');
        this.tab_identitas();
      } catch (err) { UI.toast(db.errMessage(err), 'danger'); }
    };
    document.getElementById('id_logo_del').onclick = async () => {
      try { await Branding.save({}, null); UI.toast('Logo dihapus — kembali ke ikon bawaan'); this.tab_identitas(); }
      catch (err) { UI.toast(db.errMessage(err), 'danger'); }
    };
  },

  /* ---------- Koneksi Supabase + diagnostik RPC ---------- */
  tab_koneksi() {
    const configured = isSupabaseConfigured();
    const demo = isDemoMode();
    const host = (SUPABASE_CONFIG.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const key = SUPABASE_CONFIG.anonKey || '';
    const mask = key.length > 24 ? key.slice(0, 12) + '…' + key.slice(-4) : (key || '-');
    document.getElementById('st_body').innerHTML = `
      <div class="row g-3">
        <div class="col-lg-6"><div class="card border-0 shadow-sm h-100"><div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="fw-bold mb-0"><i class="bi bi-plug-check text-success me-1"></i>Status Koneksi</h6>
            <span class="badge ${demo ? 'text-bg-warning' : 'text-bg-success'}" id="kn_badge">memeriksa…</span>
          </div>
          <table class="table table-sm small mb-3">
            <tr><td class="text-muted" style="width:38%">Mode</td><td id="kn_mode">-</td></tr>
            <tr><td class="text-muted">Project URL</td><td class="text-break"><code>${UI.esc(host || '-')}</code></td></tr>
            <tr><td class="text-muted">Anon key</td><td><code class="small">${UI.esc(mask)}</code> <span class="text-muted">(kunci publik — aman untuk frontend)</span></td></tr>
            <tr><td class="text-muted">SDK Supabase</td><td id="kn_sdk">-</td></tr>
            <tr><td class="text-muted">Sesi aktif</td><td id="kn_sess">-</td></tr>
            <tr><td class="text-muted">Latensi uji terakhir</td><td id="kn_lat">-</td></tr>
          </table>
          <button class="btn btn-success btn-sm" id="kn_test"><i class="bi bi-arrow-repeat me-1"></i>Uji Koneksi Sekarang</button>
          ${!configured ? `<div class="alert alert-warning small py-2 mt-3 mb-0"><i class="bi bi-key me-1"></i>
            Kredensial belum diisi — aplikasi berjalan pada <b>mode demo</b> (data contoh lokal).
            Isi <code>js/config.js</code> (Project URL + anon key) sesuai <b>docs/PANDUAN-SUPABASE.md</b> Langkah 1–5.</div>` : ''}
        </div></div></div>
        <div class="col-lg-6"><div class="card border-0 shadow-sm h-100"><div class="card-body">
          <h6 class="fw-bold"><i class="bi bi-clipboard2-check text-success me-1"></i>Diagnostik Fungsi Database (RPC)</h6>
          <p class="small text-muted mb-2">Memastikan seluruh fungsi RPC yang dipakai dashboard & modul merespons dengan benar.</p>
          <div id="kn_rpc" class="small"><span class="text-muted">Menjalankan diagnostik…</span></div>
        </div></div></div>
      </div>`;

    const setBadge = (txt, cls) => {
      const el = document.getElementById('kn_badge');
      el.className = 'badge ' + cls; el.textContent = txt;
    };
    document.getElementById('kn_sdk').textContent = window.supabase ? 'Termuat ✓' : 'Tidak termuat ✗ (CDN)';
    if (demo) {
      setBadge('MODE DEMO', 'text-bg-warning');
      document.getElementById('kn_mode').textContent = 'Demo lokal (js/demo-data.js)';
      document.getElementById('kn_sess').textContent = '— (belum terhubung Supabase)';
      document.getElementById('kn_rpc').innerHTML = '<span class="text-muted">Diagnostik RPC hanya tersedia saat terhubung Supabase.</span>';
      return;
    }

    const runTest = async () => {
      const btn = document.getElementById('kn_test');
      btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menguji…';
      try {
        const t0 = performance.now();
        const n = await db.count('employees');
        const ms = Math.round(performance.now() - t0);
        document.getElementById('kn_lat').textContent = ms + ' ms';
        document.getElementById('kn_mode').textContent = 'Supabase (live)';
        setBadge('TERHUBUNG ✓', 'text-bg-success');
        try {
          const { data: sess } = await db.client().auth.getSession();
          const em = sess && sess.session && sess.session.user ? sess.session.user.email : null;
          document.getElementById('kn_sess').textContent = em ? `${em} · ${ROLE_LABELS[Auth.role] || Auth.role || ''}` : '(tidak ada sesi)';
        } catch (e) { document.getElementById('kn_sess').textContent = '-'; }

        const rpcs = [
          ['rpc_dashboard_counts', {}], ['rpc_health_status_distribution', {}],
          ['rpc_mcu_monthly', { p_months: 12 }], ['rpc_sickleave_monthly', { p_months: 12 }],
          ['rpc_sickleave_category', {}], ['rpc_health_triage', {}],
          ['rpc_health_triage_by_unit', {}], ['rpc_unit_summary', {}]
        ];
        const results = await Promise.all(rpcs.map(async ([fn, p]) => {
          try { await db.rpc(fn, p); return { fn, ok: true }; }
          catch (e) { return { fn, ok: false, msg: (e && e.message) || String(e) }; }
        }));
        const allOk = results.every(r => r.ok);
        document.getElementById('kn_rpc').innerHTML =
          results.map(r => `<div class="d-flex justify-content-between align-items-center gap-2 border-bottom py-1">
            <code>${r.fn}</code>${r.ok ? '<span class="text-success fw-bold">\u2713 OK</span>'
              : `<span class="text-danger text-end" style="max-width:60%">${UI.esc((r.msg || '').slice(0, 80))}</span>`}
          </div>`).join('') +
          `<div class="small ${allOk ? 'text-success' : 'text-danger'} fw-bold mt-2">${allOk ? 'Semua fungsi RPC sehat ✓' : 'Ada fungsi RPC yang gagal — jalankan supabase/07_hotfix_dashboard.sql bila errornya structure/column.'}</div>
           <div class="small text-muted mt-1">Tabel pegawai terbaca (sesuai RLS): <b>${n}</b> baris.</div>`;
        UI.toast(allOk ? 'Koneksi & semua fungsi RPC sehat ✓' : 'Koneksi OK, tetapi ada RPC gagal — lihat panel diagnostik.', allOk ? 'success' : 'warning');
      } catch (e) {
        setBadge('GAGAL ✗', 'text-bg-danger');
        document.getElementById('kn_mode').textContent = 'Tidak terhubung';
        document.getElementById('kn_lat').textContent = '-';
        document.getElementById('kn_rpc').innerHTML = `<div class="alert alert-danger py-2 mb-0 small">${UI.esc(db.errMessage(e))}</div>`;
      } finally {
        btn.disabled = false; btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Uji Koneksi Sekarang';
      }
    };
    document.getElementById('kn_test').onclick = runTest;
    runTest(); // uji otomatis saat tab dibuka
  },

  /* ---------- Integrasi WhatsApp (dokumentasi) ---------- */
  tab_wa() {
    document.getElementById('st_body').innerHTML = `
      <div class="card border-0 shadow-sm"><div class="card-body">
        <h6 class="fw-bold"><i class="bi bi-whatsapp text-success me-1"></i>Integrasi Notifikasi WhatsApp (Opsional)</h6>
        <p class="small">Pengingat WhatsApp dikirim <b>di luar aplikasi</b> melalui Supabase Edge Function agar kredensial API
        <b>tidak pernah berada di frontend</b>. Panduan lengkap: <code>docs/INTEGRASI-WHATSAPP.md</code>.</p>
        <div class="table-responsive"><table class="table table-sm small">
          <thead class="table-light"><tr><th>Penyedia</th><th>Jenis</th><th>Yang Dibutuhkan</th><th>Cocok Untuk</th></tr></thead>
          <tbody>
            <tr><td><b>Twilio WhatsApp API</b></td><td>Resmi (Meta)</td><td>Account SID + Auth Token (di Edge Function), nomor terverifikasi, template message disetujui Meta</td><td>Skala besar, kepatuhan tinggi</td></tr>
            <tr><td><b>Meta WhatsApp Cloud API</b></td><td>Resmi</td><td>Token Meta Business, phone number ID, template disetujui</td><td>Skala besar, gratis kuota awal</td></tr>
            <tr><td><b>Fonnte / Wablas</b></td><td>Gateway lokal</td><td>Device token (di Edge Function)</td><td>Instalasi cepat skala sekolah</td></tr>
          </tbody></table></div>
        <div class="alert alert-warning small py-2 mb-0"><i class="bi bi-exclamation-triangle me-1"></i>
          <b>Keamanan:</b> JANGAN pernah menaruh token WhatsApp / API key di file frontend (GitHub). Semua kredensial hanya di
          Supabase <b>Edge Function secrets</b> (<code>supabase secrets set WA_TOKEN=...</code>).
          Pesan WA hanya berisi <b>pengingat umum</b> (jadwal MCU) — tidak pernah berisi hasil/diagnosis medis.</div>
      </div></div>`;
  }
};

/* helper kecil agar tab Audit hanya muncul untuk SA */
function bi_or(a, cond) { return cond ? a : ''; }
