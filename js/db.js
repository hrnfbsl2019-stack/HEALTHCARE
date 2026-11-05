/* ============================================================================
 * MADANI HEALTHCARE - Klien Supabase & Helper Database
 * ========================================================================== */

let _sb = null;
(function initSupabase() {
  if (!window.supabase) {
    console.error('SDK Supabase gagal dimuat (cek koneksi CDN).');
    return;
  }
  if (isSupabaseConfigured()) {
    _sb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  } else if (window.DemoSupabase) {
    // Mode demo: kredensial belum diisi -> pakai data contoh lokal (js/demo-data.js)
    _sb = window.DemoSupabase.create();
    console.info('[MADANI] MODE DEMO aktif — data contoh lokal (js/demo-data.js). Isi js/config.js untuk terhubung Supabase.');
  }
  window.sb = _sb;
})();

/** true bila berjalan pada mode demo (bukan Supabase asli) */
function isDemoMode() {
  return !_sb || !!(!isSupabaseConfigured() && window.DemoSupabase);
}

const db = {
  /** Klien Supabase aktif (melempar error jika belum dikonfigurasi) */
  client() {
    if (!_sb) throw new Error('Supabase belum dikonfigurasi. Isi js/config.js terlebih dahulu (lihat docs/PANDUAN-SUPABASE.md).');
    return _sb;
  },

  /** Ambil banyak baris. opt: {eq:[[k,v]], neq, gte, lte, in, search, searchCols, order:{col,dir}, limit} */
  async list(table, select = '*', opt = {}) {
    let q = this.client().from(table).select(select);
    if (opt.eq) opt.eq.forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) q = q.eq(k, v); });
    if (opt.neq) opt.neq.forEach(([k, v]) => { if (v) q = q.neq(k, v); });
    if (opt.gte) opt.gte.forEach(([k, v]) => { if (v) q = q.gte(k, v); });
    if (opt.lte) opt.lte.forEach(([k, v]) => { if (v) q = q.lte(k, v); });
    if (opt.in) opt.in.forEach(([k, v]) => { if (v && v.length) q = q.in(k, v); });
    if (opt.or) q = q.or(opt.or);
    if (opt.search && opt.searchCols && opt.searchCols.length) {
      q = q.or(opt.searchCols.map(c => `${c}.ilike.%${opt.search}%`).join(','));
    }
    if (opt.order) q = q.order(opt.order.col, { ascending: opt.order.dir !== 'desc', nullsFirst: false });
    if (opt.limit) q = q.limit(opt.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  /** Paginasi + total. Mengembalikan {rows, total} */
  async page(table, select = '*', opt = {}) {
    const page = opt.page || 1, size = opt.pageSize || 10;
    const from = (page - 1) * size, to = from + size - 1;
    let q = this.client().from(table).select(select, { count: 'exact' });
    if (opt.eq) opt.eq.forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) q = q.eq(k, v); });
    if (opt.gte) opt.gte.forEach(([k, v]) => { if (v) q = q.gte(k, v); });
    if (opt.lte) opt.lte.forEach(([k, v]) => { if (v) q = q.lte(k, v); });
    if (opt.or) q = q.or(opt.or);
    if (opt.search && opt.searchCols && opt.searchCols.length) {
      q = q.or(opt.searchCols.map(c => `${c}.ilike.%${opt.search}%`).join(','));
    }
    const ord = opt.order || { col: 'created_at', dir: 'desc' };
    q = q.order(ord.col, { ascending: ord.dir !== 'desc', nullsFirst: false })
         .range(from, to);
    const { data, error, count } = await q;
    if (error) throw error;
    return { rows: data || [], total: count || 0 };
  },

  async one(table, id, select = '*') {
    const { data, error } = await this.client().from(table).select(select).eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async insert(table, obj) {
    const { data, error } = await this.client().from(table).insert(obj).select().single();
    if (error) throw error;
    return data;
  },

  async update(table, id, obj) {
    const { data, error } = await this.client().from(table).update(obj).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(table, id) {
    const { error } = await this.client().from(table).delete().eq('id', id);
    if (error) throw error;
  },

  async count(table, eq = [], opt = {}) {
    let q = this.client().from(table).select('id', { count: 'exact', head: true });
    eq.forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) q = q.eq(k, v); });
    if (opt.gte) opt.gte.forEach(([k, v]) => { if (v) q = q.gte(k, v); });
    if (opt.lte) opt.lte.forEach(([k, v]) => { if (v) q = q.lte(k, v); });
    const { count, error } = await q;
    if (error) throw error;
    return count || 0;
  },

  async rpc(fn, params = {}) {
    const { data, error } = await this.client().rpc(fn, params);
    if (error) throw error;
    return data;
  },

  /** Upload file ke Storage. path: {employeeUuid}/nama-file */
  async upload(bucket, path, file) {
    const { error } = await this.client().storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  },

  async fileUrl(bucket, path) {
    const { data } = await this.client().storage.from(bucket).createSignedUrl(path, 3600);
    return data ? data.signedUrl : null;
  },

  /** Ambil error message yang ramah dari Supabase/Postgres */
  errMessage(e) {
    if (!e) return 'Terjadi kesalahan tak terduga.';
    if (e.code === '23505') return 'Data dengan nilai unik tersebut sudah ada (duplikat).';
    if (e.code === '23503') return 'Data terkait tidak ditemukan / masih direferensikan tabel lain.';
    if (e.code === '42501') return 'Akses ditolak oleh kebijakan keamanan (RLS). Periksa peran pengguna Anda.';
    return e.message || String(e);
  }
};
