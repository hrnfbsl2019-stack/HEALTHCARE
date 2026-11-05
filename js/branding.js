/* ============================================================================
 * MADANI HEALTHCARE - Branding: Identitas organisasi + logo
 * ----------------------------------------------------------------------------
 * - Sumber kebenaran: tabel public.app_settings (baris id=1, lihat 08_branding.sql)
 * - Mode demo / tabel belum ada: fallback ke localStorage (per browser).
 * - Diterapkan pada: halaman login, sidebar, judul dokumen, sapaan dashboard.
 * Kebijakan RLS: semua pengguna autentikasi + anonim boleh MEMBACA;
 * hanya super_admin / hrd boleh MENGUBAH.
 * ========================================================================== */

const Branding = {
  cacheKey: 'madani.branding.v1',
  /* nilai bawaan dari js/config.js — ditangkap SEBELUM init() mengubah APP_CONFIG */
  defaults: {
    org: (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.org : ''),
    tagline: (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.appTagline : '')
  },
  data: { org_name: null, org_tagline: null, logo_url: null },

  org() { return this.data.org_name || APP_CONFIG.org; },
  tagline() { return this.data.org_tagline || APP_CONFIG.appTagline; },
  logo() { return this.data.logo_url || null; },

  fromCache() {
    try { return JSON.parse(localStorage.getItem(this.cacheKey)) || {}; }
    catch (e) { return {}; }
  },

  /** Muat dari cache (instan) lalu dari Supabase bila tersambung */
  async init() {
    Object.assign(this.data, this.fromCache());
    this.apply();
    if (typeof isDemoMode === 'function' && isDemoMode()) return;
    try {
      const { data, error } = await db.client().from('app_settings')
        .select('org_name, org_tagline, logo_url').eq('id', 1).maybeSingle();
      if (error) throw error;
      if (data) {
        this.data = data;
        this.cache();
        this.apply();
      }
    } catch (e) {
      // tabel belum dibuat (08_branding.sql belum dijalankan) -> diamkan, pakai default
      console.warn('[MADANI] branding: pakai nilai bawaan —', (e && e.message) || e);
    }
  },

  cache() {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({
        org_name: this.data.org_name, org_tagline: this.data.org_tagline, logo_url: this.data.logo_url
      }));
    } catch (e) { /* localStorage penuh/blokir -> abaikan */ }
  },

  /** Simpan perubahan. fields: {org_name, org_tagline}; logoDataUrl: string data-URL atau null */
  async save(fields = {}, logoDataUrl) {
    if (typeof isDemoMode === 'function' && isDemoMode()) {
      Object.assign(this.data, fields);
      if (logoDataUrl !== undefined) this.data.logo_url = logoDataUrl;
      this.cache(); this.apply();
      return;
    }
    const payload = Object.assign({ id: 1, updated_by: (typeof Auth !== 'undefined' && Auth.user) ? Auth.user.id : null }, fields);
    if (logoDataUrl !== undefined) payload.logo_url = logoDataUrl;
    const { error } = await db.client().from('app_settings').upsert(payload);
    if (error) {
      if (/app_settings|does not exist|schema cache|PGRST/i.test(error.message || '')) {
        throw new Error('Tabel app_settings belum ada di database — jalankan supabase/08_branding.sql di SQL Editor terlebih dahulu.');
      }
      throw error;
    }
    Object.assign(this.data, fields);
    if (logoDataUrl !== undefined) this.data.logo_url = logoDataUrl;
    this.cache(); this.apply();
  },

  /** Kompres & kecilkan gambar logo (maks sisi 320px, JPEG 85%) menjadi data URL */
  compressLogo(file, max = 320) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type || '')) return reject(new Error('File bukan gambar.'));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const scale = Math.min(1, max / Math.max(img.width || 1, img.height || 1));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round((img.width || max) * scale));
          c.height = Math.max(1, Math.round((img.height || max) * scale));
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          resolve(c.toDataURL('image/jpeg', 0.85));
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak dapat dibaca.')); };
      img.src = url;
    });
  },

  /** Terapkan branding ke seluruh elemen yang terdaftar */
  apply() {
    APP_CONFIG.org = this.org();
    APP_CONFIG.appTagline = this.tagline();
    document.querySelectorAll('[data-org]').forEach(el => { el.textContent = this.org(); });
    document.querySelectorAll('[data-tagline]').forEach(el => { el.textContent = this.tagline(); });
    const logo = this.logo();
    document.querySelectorAll('.brand-logo, .brand-logo-sm').forEach(el => {
      el.innerHTML = logo
        ? `<img src="${logo}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:inherit;background:#fff">`
        : '<i class="bi bi-heart-pulse-fill"></i>';
    });
    document.title = `${APP_CONFIG.appName} — ${this.org()}`;
  }
};

Branding.init();
