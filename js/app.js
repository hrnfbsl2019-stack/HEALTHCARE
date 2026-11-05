/* ============================================================================
 * MADANI HEALTHCARE - App Shell: sidebar, topbar, router hash
 * ========================================================================== */

const App = {
  modules: {},   // diisi oleh file js/modules/*.js: App.modules.dashboard = {render}
  started: false,

  start() {
    if (!Auth.role) { LoginScreen.show(); return; }
    document.getElementById('login-page').classList.add('d-none');
    document.getElementById('login-config-alert').classList.add('d-none');
    document.getElementById('app').classList.remove('d-none');
    this.buildSidebar();
    this.renderUserChip();
    // tombol pengingat hanya untuk Super Admin / Petugas Kesehatan
    document.getElementById('btn-reminder').classList.toggle('d-none',
      !Auth.isAny(ROLES.SA, ROLES.PET));
    if (!this.started) {
      this.started = true;
      window.addEventListener('hashchange', () => this.navigate());
    }
    if (!location.hash) location.hash = '#/dashboard';
    this.navigate();
  },

  showLogin() {
    document.getElementById('app').classList.add('d-none');
    this.started = false;
    LoginScreen.show();  // render ulang banner mode demo / info konfigurasi
  },

  buildSidebar() {
    const items = RBAC.menuFor(Auth.role);
    let lastGroup = null;
    document.getElementById('sidebar-nav').innerHTML = items.map(m => {
      const hdr = (m.group && m.group !== lastGroup)
        ? `<li class="sb-group">${UI.esc(m.group)}</li>` : '';
      lastGroup = m.group || lastGroup;
      return hdr + `
      <li class="nav-item">
        <a class="nav-link d-flex align-items-center gap-2" href="#/${m.id}"
           data-id="${m.id}" title="${m.label}">
          <i class="bi ${m.icon} fs-6"></i><span class="lbl">${m.label}</span>
          ${m.id === 'notifikasi' ? '<span class="badge rounded-pill text-bg-danger ms-auto d-none" id="sb-notif-badge">0</span>' : ''}
        </a>
      </li>`;
    }).join('');
    document.getElementById('sidebar-org').textContent = Branding.org();
  },

  renderUserChip() {
    document.getElementById('tb-user-name').textContent = Auth.name || Auth.user?.email || '';
    document.getElementById('tb-user-role').textContent = ROLE_LABELS[Auth.role] || Auth.role || '';
    document.getElementById('tb-user-avatar').textContent = (Auth.name || 'U').trim().charAt(0).toUpperCase();
  },

  async navigate() {
    const id = (location.hash.replace('#/', '') || 'dashboard').split('?')[0];
    const menu = RBAC.MENU.find(m => m.id === id);

    // routing guard: menu tidak ada / tidak diizinkan utk peran ini
    if (!menu || (menu.roles !== 'all' && !menu.roles.includes(Auth.role))) {
      UI.toast('Halaman tidak tersedia untuk peran Anda.', 'warning');
      location.hash = '#/dashboard';
      return;
    }
    document.querySelectorAll('#sidebar-nav .nav-link').forEach(a => a.classList.toggle('active', a.dataset.id === id));
    document.getElementById('tb-title').textContent = menu.label;
    document.getElementById('tb-date').textContent = new Date().toLocaleDateString('id-ID',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // tutup offcanvas di layar kecil
    const oc = bootstrap.Offcanvas.getInstance(document.getElementById('sidebar'));
    if (oc) oc.hide();

    const mount = document.getElementById('page-content');
    mount.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div>
      <div class="small text-muted mt-2">Memuat ${menu.label}...</div></div>`;

    const mod = this.modules[id];
    if (!mod || typeof mod.render !== 'function') {
      mount.innerHTML = `<div class="alert alert-warning">Modul "${id}" belum tersedia.</div>`;
      return;
    }
    try {
      await mod.render(mount);
      window.scrollTo({ top: 0 });
    } catch (e) {
      console.error(e);
      const msg = String((e && e.message) || e);
      let hint = '';
      if (/PGRST202|Could not find the function|schema cache/i.test(msg))
        hint = 'Fungsi database (RPC) belum terpasang &mdash; jalankan ulang <b>supabase/01_schema.sql</b> versi terbaru ' +
               '(atau minimal <b>supabase/06_analisis_kondisi.sql</b>) di Supabase SQL Editor, tunggu &plusmn;1 menit, lalu muat ulang halaman.';
      else if (/Akses ditolak/i.test(msg))
        hint = 'Peran akun belum aktif di <b>user_roles</b>. Ikuti docs/PANDUAN-SUPABASE.md &mdash; Langkah 3.';
      else if (/Failed to fetch|NetworkError|Load failed/i.test(msg))
        hint = 'Tidak dapat menghubungi Supabase &mdash; periksa koneksi internet dan <b>js/config.js</b>.';
      mount.innerHTML = `<div class="alert alert-danger"><b>Gagal memuat modul.</b><br>${UI.esc(db.errMessage(e))}` +
        (hint ? `<hr class="my-2"><div class="small"><b>Saran perbaikan:</b> ${hint}</div>` : '') + '</div>';
    }
  },

  /* ---- Notifikasi di topbar ---- */
  async refreshNotifBadge() {
    if (!_sb) return;
    try {
      const { count } = await _sb.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', Auth.user.id).eq('is_read', false);
      const badge = document.getElementById('sb-notif-badge');
      const bell = document.getElementById('tb-notif-badge');
      const n = count || 0;
      if (badge) { badge.classList.toggle('d-none', n === 0); badge.textContent = n > 99 ? '99+' : n; }
      if (bell) { bell.classList.toggle('d-none', n === 0); bell.textContent = n > 9 ? '9+' : n; }
    } catch (e) { /* diamkan */ }
  }
};

/* ==================== Boot ==================== */
window.addEventListener('DOMContentLoaded', async () => {
  // tombol logout & pengingat
  document.getElementById('btn-logout').onclick = async () => {
    if (await UI.confirm('Keluar dari aplikasi?', 'Keluar')) {
      await Auth.signOut();
      App.showLogin();
    }
  };
  document.getElementById('btn-reminder').onclick = async () => {
    try {
      const n = await db.rpc('rpc_generate_mcu_reminders', { p_days: APP_CONFIG.reminderDays || 7 });
      UI.toast(n > 0 ? `${n} pengingat MCU terkirim ke pegawai terkait.` : 'Tidak ada jadwal MCU yang perlu diingatkan.', n > 0 ? 'success' : 'info');
      App.refreshNotifBadge();
    } catch (e) { UI.toast(db.errMessage(e), 'danger'); }
  };

  if (!_sb) { LoginScreen.show(); return; }
  const logged = await Auth.init();
  if (logged && Auth.role) {
    App.start();
    App.refreshNotifBadge();
    setInterval(() => App.refreshNotifBadge(), 60000);
  } else if (logged && Auth.blockedReason) {
    LoginScreen.show();
    UI.toast(Auth.blockedReason, 'warning');
  } else {
    LoginScreen.show();
  }
});
