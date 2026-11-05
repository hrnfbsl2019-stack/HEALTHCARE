/* ============================================================================
 * MADANI HEALTHCARE - Autentikasi (login, daftar, sesi, profil peran)
 * ========================================================================== */

const Auth = {
  user: null, session: null, role: null, employeeId: null, name: '', blockedReason: null,
  _emp: null,

  is(role) { return this.role === role; },
  isAny(...roles) { return roles.includes(this.role); },
  isMyRow(row) { return this.employeeId && row.employee_id === this.employeeId; },

  async init() {
    if (!_sb) return false;
    const { data } = await _sb.auth.getSession();
    this.session = data.session || null;
    this.user = this.session ? this.session.user : null;
    if (this.user) await this.loadProfile();

    _sb.auth.onAuthStateChange(async (event, sess) => {
      this.session = sess; this.user = sess ? sess.user : null;
      if (event === 'SIGNED_OUT' || !sess) { this._reset(); App.showLogin(); return; }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (!this.role || !this.session) {
          await this.loadProfile();
          if (this.role) App.start();
        }
      }
    });
    return !!this.session;
  },

  _reset() {
    this.user = null; this.session = null; this.role = null;
    this.employeeId = null; this.name = ''; this.blockedReason = null; this._emp = null;
  },

  /** Muat peran + pegawai terkait dari user_roles */
  async loadProfile() {
    this.blockedReason = null; this.role = null; this.employeeId = null; this._emp = null;
    const { data: ur, error } = await _sb.from('user_roles')
      .select('role,is_active,employee_id,employees(full_name)')
      .eq('user_id', this.user.id).maybeSingle();
    if (error) { console.warn(error); }
    if (!ur) { this.blockedReason = 'Akun Anda belum terdaftar di sistem. Hubungi Super Admin untuk aktivasi.'; return; }
    if (!ur.is_active) { this.blockedReason = 'Akun Anda masih MENUNGGU PERSETUJUAN admin. Anda akan diberi tahu setelah diaktifkan.'; return; }
    this.role = ur.role;
    this.employeeId = ur.employee_id;
    this.name = (ur.employees && ur.employees.full_name)
      || (this.user.user_metadata && this.user.user_metadata.display_name)
      || (this.user.email || '').split('@')[0];
  },

  async signIn(email, password) {
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.session = data.session; this.user = data.user;
    await this.loadProfile();
    return this;
  },

  async signUp(nama, email, password) {
    const { data, error } = await _sb.auth.signUp({
      email, password,
      options: { data: { display_name: nama } }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await _sb.auth.signOut();
    this._reset();
  },

  async changePassword(newPass) {
    const { error } = await _sb.auth.updateUser({ password: newPass });
    if (error) throw error;
  }
};

/* ==================== Layar Login ==================== */
const LoginScreen = {
  show(mode = 'login') {
    const page = document.getElementById('login-page');
    document.getElementById('app').classList.add('d-none');
    page.classList.remove('d-none');

    // Banner konfigurasi / info mode demo
    const cfgBox = document.getElementById('login-config-alert');
    if (isDemoMode() && window.DemoSupabase) {
      cfgBox.classList.remove('d-none');
      const acc = window.DemoSupabase.accounts || [];
      cfgBox.innerHTML = `<div class="alert alert-success mb-3 small shadow-sm border-0">
        <b><i class="bi bi-lightning-charge-fill me-1"></i>MODE DEMO aktif</b> — aplikasi berjalan dengan
        <b>data contoh lokal</b> (12 pegawai). Tidak ada data yang tersimpan permanen.<br>
        Isi <code>js/config.js</code> dengan Project URL &amp; anon key Supabase Anda untuk beralih ke
        database sungguhan (panduan: <code>docs/PANDUAN-SUPABASE.md</code>).
        <div class="mt-2 fw-semibold">Coba masuk dengan akun demo (kata sandi: <code>demo123</code>):</div>
        <div class="d-flex flex-wrap gap-1 mt-1">
          ${acc.map(a => `<button type="button" class="btn btn-sm btn-outline-success" data-demo-email="${UI.esc(a.email)}"
            data-demo-pass="${UI.esc(a.pass)}"><i class="bi bi-box-arrow-in-right me-1"></i>${UI.esc(a.role)}</button>`).join('')}
        </div>
      </div>`;
      cfgBox.querySelectorAll('[data-demo-email]').forEach(b => {
        b.onclick = async () => {
          b.disabled = true;
          try {
            await Auth.signIn(b.dataset.demoEmail, b.dataset.demoPass);
            if (!Auth.role) { await Auth.signOut(); UI.toast(Auth.blockedReason || 'Akun belum aktif.', 'warning'); return; }
            UI.toast('Selamat datang, ' + Auth.name + '! (demo)');
            App.start();
          } catch (err) { UI.toast(db.errMessage(err), 'danger'); }
          finally { b.disabled = false; }
        };
      });
    } else if (!isSupabaseConfigured()) {
      cfgBox.classList.remove('d-none');
      cfgBox.innerHTML = `<div class="alert alert-warning mb-3 small shadow-sm border-0">
        <b><i class="bi bi-gear-fill me-1"></i>Supabase belum terhubung.</b><br>
        Isi <code>js/config.js</code> dengan <b>Project URL</b> &amp; <b>anon key</b> Anda, lalu jalankan
        <code>supabase/01_schema.sql</code>, <code>02_policies.sql</code>, <code>03_seed.sql</code>.
        Petunjuk lengkap ada di <b>docs/PANDUAN-SUPABASE.md</b>.
      </div>`;
    } else cfgBox.classList.add('d-none');

    document.getElementById('login-form-wrap').classList.toggle('d-none', mode !== 'login');
    document.getElementById('signup-form-wrap').classList.toggle('d-none', mode !== 'signup');

    const lf = document.getElementById('login-form');
    const sf = document.getElementById('signup-form');
    if (!lf.dataset.bound) {
      lf.dataset.bound = '1';
      lf.onsubmit = async e => {
        e.preventDefault();
        const btn = lf.querySelector('button[type=submit]');
        btn.disabled = true;
        try {
          await Auth.signIn(lf.email.value.trim(), lf.password.value);
          if (!Auth.role) { // terblokir / belum diaktifkan
            await Auth.signOut();
            UI.toast(Auth.blockedReason || 'Akun belum aktif. Hubungi Super Admin.', 'warning');
            return;
          }
          UI.toast('Selamat datang, ' + Auth.name + '!');
          App.start();
        } catch (err) {
          UI.toast(err.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : db.errMessage(err), 'danger');
        } finally { btn.disabled = false; }
      };
    }
    if (!sf.dataset.bound) {
      sf.dataset.bound = '1';
      sf.onsubmit = async e => {
        e.preventDefault();
        if (sf.password.value.length < 6) { UI.toast('Kata sandi minimal 6 karakter', 'warning'); return; }
        if (sf.password.value !== sf.confirm.value) { UI.toast('Konfirmasi kata sandi tidak sama', 'warning'); return; }
        const btn = sf.querySelector('button[type=submit]');
        btn.disabled = true;
        try {
          await Auth.signUp(sf.nama.value.trim(), sf.email.value.trim(), sf.password.value);
          UI.toast('Pendaftaran berhasil! Akun Anda menunggu persetujuan Super Admin.', 'info');
          LoginScreen.show('login');
          sf.reset();
        } catch (err) {
          UI.toast(db.errMessage(err), 'danger');
        } finally { btn.disabled = false; }
      };
    }
    document.querySelectorAll('[data-goto]').forEach(a => a.onclick = e => { e.preventDefault(); LoginScreen.show(a.dataset.goto); });
  }
};
