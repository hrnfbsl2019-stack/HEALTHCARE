/* ============================================================================
 * MADANI HEALTHCARE - Konfigurasi Aplikasi
 * ----------------------------------------------------------------------------
 * GANTI dua nilai di bawah ini dengan kredensial Supabase Anda:
 *   1. url     : Supabase Dashboard > Project Settings > API > Project URL
 *   2. anonKey : Supabase Dashboard > Project Settings > API > anon / public
 *
 * PENTING KEAMANAN:
 *  - HANYA gunakan "anon public" key. Anon key aman dipublikasikan karena
 *    seluruh proteksi data ditangani Row Level Security (RLS) di database.
 *  - JANGAN PERNAH menaruh "service_role" key di file ini / di frontend!
 *  - Lihat docs/PANDUAN-SUPABASE.md langkah 5.
 * ========================================================================== */

const SUPABASE_CONFIG = {
  url: 'https://mizsfhtkbmiyxyjkgems.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1penNmaHRrYm1peXh5amtnZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MzI2NzAsImV4cCI6MjEwOTQwODY3MH0.7u7e3jjyOILRlpQ1st12wwgrOyQGZVrPhhbycHf5i64'
};

const APP_CONFIG = {
  appName: 'MADANI HEALTHCARE',
  appTagline: 'Sistem Pemantauan Kesehatan Pegawai',
  org: 'YPPIM Nurul Fikri Boarding School Lembang',
  version: '1.0.0',
  // Integrasi WhatsApp (opsional) - lihat docs/INTEGRASI-WHATSAPP.md
  whatsapp: { enabled: false, provider: '' } // 'fonnte' | 'wablas' | 'twilio'
};

/** true jika kredensial sudah diisi, false jika masih placeholder */
function isSupabaseConfigured() {
  const u = SUPABASE_CONFIG.url || '';
  const k = SUPABASE_CONFIG.anonKey || '';
  return u.includes('.supabase.co') && !u.includes('GANTI') && k.length > 80 && !k.includes('GANTI');
}
