/* ============================================================================
 * MODUL: AI Health Assistant (basis pengetahuan edukasi kesehatan)
 * BATAS WAJIB: TIDAK mendiagnosis, TIDAK memberi/mengubah resep obat,
 * TIDAK menilai kelayakan kerja, TIDAK ikut keputusan kepegawaian,
 * TIDAK menampilkan data medis orang lain.
 * ========================================================================== */

const AI_KB = [
  { keys: ['gula darah puasa', 'gdp'], title: 'Gula Darah Puasa', unit: 'mg/dL',
    rendah: 'di bawah 70 = hipoglikemia', normal: '70–100 (puasa 8 jam)', tinggi: '100–125 = pradiabetes; ≥126 (2x) perlu evaluasi dokter',
    arti: 'Kadar glukosa darah saat perut kosong; indikator awal gangguan metabolisme gula.',
    tips: 'Kurangi gula & karbohidrat olahan, konsumsi serat, aktivitas fisik rutin 30 menit/hari.' },
  { keys: ['kolesterol total', 'kolesterol'], title: 'Kolesterol Total', unit: 'mg/dL',
    rendah: 'di bawah 120 (jarang, perlu evaluasi)', normal: 'di bawah 200', tinggi: '200–239 batas tinggi; ≥240 tinggi',
    arti: 'Jumlah seluruh kolesterol dalam darah; tinggi berjangka risiko penyakit jantung.',
    tips: 'Batasi gorengan & lemak jenuh, perbanyak sayur, ikan, kacang, jalan kaki rutin.' },
  { keys: ['ldl'], title: 'LDL (Kolesterol Jahat)', unit: 'mg/dL',
    rendah: 'umumnya aman', normal: 'di bawah 100', tinggi: '100–129 sedikit tinggi; ≥160 tinggi',
    arti: 'Kolesterol yang menumpuk di dinding pembuluh darah.',
    tips: 'Kurangi lemak trans (margarin, jajanan), perbanyak oat, ikan, alpukat.' },
  { keys: ['hdl'], title: 'HDL (Kolesterol Baik)', unit: 'mg/dL',
    rendah: 'laki-laki <40; perempuan <50 = rendah', normal: 'laki-laki 40–60; perempuan 50–60+; semakin tinggi semakin baik', tinggi: 'di atas 60 = baik',
    arti: 'Kolesterol yang membantu membersihkan lemak dari pembuluh darah.',
    tips: 'Olahraga aerobik rutin, berhenti merokok, turunkan berat badan bila berlebih.' },
  { keys: ['trigliserida', 'tg'], title: 'Trigliserida', unit: 'mg/dL',
    rendah: 'umumnya aman', normal: 'di bawah 150', tinggi: '150–199 batas tinggi; ≥200 tinggi',
    arti: 'Lemak darah; tinggi sering terkait gula berlebih, alkohol, kegemukan.',
    tips: 'Kurangi gula, nasi putih berlebihan; perbanyak ikan; kontrol berat badan.' },
  { keys: ['asam urat', 'urat'], title: 'Asam Urat', unit: 'mg/dL',
    rendah: 'di bawah 3.5', normal: '3.5–7.2', tinggi: 'di atas 7.2 = hiperurisemia',
    arti: 'Zat hasil pemecahan purin; tinggi dapat memicu nyeri sendi (pirai).',
    tips: 'Batasi jeroan, seafood, daging merah, minuman manis; banyak minum air putih.' },
  { keys: ['hemoglobin', 'hb'], title: 'Hemoglobin (Hb)', unit: 'g/dL',
    rendah: 'laki-laki <13; perempuan <12 = anemia', normal: 'laki-laki 13–17; perempuan 12–16', tinggi: 'di atas batas = perlu evaluasi (dehidrasi, dll.)',
    arti: 'Protein darah pembawa oksigen; rendah = anemia (lemah, lelah, pucat).',
    tips: 'Konsumsi makanan kaya zat besi (daging, bayam, kacang) + vitamin C.' },
  { keys: ['sgot', 'sgpt', 'transaminase', 'liver', 'hati'], title: 'SGOT / SGPT (Enzim Hati)', unit: 'U/L',
    rendah: 'umumnya bukan masalah', normal: 'di bawah 40', tinggi: 'di atas 40 = hati sedang bekerja keras / ada iritasi',
    arti: 'Enzim yang naik bila sel hati teriritasi (lemak, virus, obat, alkohol).',
    tips: 'Kurangi makanan berlemak & minuman manis, jaga berat badan, istirahat cukup, konsultasi bila tinggi.' },
  { keys: ['tekanan darah', 'tensai', 'hipertensi', 'tensi'], title: 'Tekanan Darah', unit: 'mmHg',
    rendah: 'di bawah 90/60 = hipotensi', normal: 'di bawah 120/80', tinggi: '130–139/85–89 = perlu diperhatikan; ≥140/90 = hipertensi (perlu pemeriksaan)',
    arti: 'Tekanan darah diukur dua angka: sistolik (kontraksi) & diastolik (relaksasi).',
    tips: 'Kurangi garam, kelola stres, olahraga rutin, tidur cukup, berhenti merokok.' },
  { keys: ['kreatinin', 'ginjal'], title: 'Kreatinin (Fungsi Ginjal)', unit: 'mg/dL',
    rendah: 'umumnya bukan masalah', normal: '0.6–1.3', tinggi: 'di atas 1.3 = perlu evaluasi fungsi ginjal',
    arti: 'Sisa metabolisme otot yang dibuang ginjal; naik bila ginjal menurun.',
    tips: 'Cukupi air putih, batasi obat pereda nyeri tanpa anjuran, kontrol gula & tensi.' },
  { keys: ['trombosit', 'platelet'], title: 'Trombosit', unit: 'ribu/µL',
    rendah: 'di bawah 150 = risiko perdarahan', normal: '150–450', tinggi: 'di atas 450 = perlu evaluasi',
    arti: 'Sel pembeku darah; penting saat terjadi luka.',
    tips: 'Bila jauh dari rentang normal, segera konsultasikan ke tenaga medis.' },
  { keys: ['leukosit', 'sel darah putih'], title: 'Leukosit', unit: 'sel/µL',
    rendah: 'di bawah 4000', normal: '4000–10000', tinggi: 'di atas 10000 = sering tanda infeksi',
    arti: 'Sel imun; naik saat infeksi/ peradangan, turun pada kondisi tertentu.',
    tips: 'Interpretasi selalu bersama tenaga medis.' }
];

App.modules.ai = {
  _history: [],

  async render(mount) {
    mount.innerHTML = `
      <div class="row g-3">
        <div class="col-lg-8 mx-auto">
          <div class="card border-0 shadow-sm chat-card">
            <div class="card-header bg-success text-white py-3 d-flex align-items-center gap-2">
              <i class="bi bi-robot fs-4"></i>
              <div>
                <div class="fw-bold">AI Health Assistant</div>
                <div class="small opacity-75">Edukasi kesehatan untuk pegawai ${UI.esc(APP_CONFIG.org)}</div>
              </div>
            </div>
            <div class="card-body chat-body" id="ai_chat"></div>
            <div class="card-footer bg-white py-2">
              <div class="d-flex flex-wrap gap-1 mb-2" id="ai_chips"></div>
              <form id="ai_form" class="input-group input-group-sm">
                <input class="form-control" id="ai_input" placeholder="Tulis pertanyaan Anda... (mis. apa itu kolesterol total?)" autocomplete="off">
                <button class="btn btn-success" type="submit"><i class="bi bi-send"></i> Kirim</button>
              </form>
              <div class="form-text small mt-1 text-warning-emphasis">
                <i class="bi bi-shield-exclamation me-1"></i>Asisten ini memberikan <b>edukasi umum</b>, bukan diagnosis.
                Untuk penilaian kondisi &amp; pengobatan, selalu konsultasi dengan petugas kesehatan / tenaga medis.
              </div>
            </div>
          </div>
        </div>
      </div>`;

    const chips = [
      'Hitung BMI saya', 'Apa arti gula darah puasa?', 'Jelaskan hasil kolesterol saya',
      'Tekanan darah normal berapa?', 'Jadwal MCU saya kapan?', 'Program kesehatan apa yang tersedia?'
    ];
    document.getElementById('ai_chips').innerHTML =
      chips.map(c => `<button class="btn btn-sm btn-outline-success rounded-pill" data-q="${UI.esc(c)}">${UI.esc(c)}</button>`).join('');
    document.querySelectorAll('#ai_chips [data-q]').forEach(b => b.onclick = () => this.ask(b.dataset.q));

    document.getElementById('ai_form').onsubmit = e => {
      e.preventDefault();
      const inp = document.getElementById('ai_input');
      const q = inp.value.trim();
      if (!q) return;
      inp.value = '';
      this.ask(q);
    };

    if (!this._history.length) {
      this.bot('Assalamu\'alaikum! 👋 Saya <b>AI Health Assistant</b> MADANI HEALTHCARE.<br><br>' +
        'Saya bisa membantu:<ul class="mb-0"><li>Menghitung <b>BMI</b> & menjelaskan artinya</li>' +
        '<li>Menjelaskan <b>arti umum</b> parameter MCU (gula darah, kolesterol, tensi, dll.)</li>' +
        '<li>Menampilkan <b>hasil lab Anda sendiri</b> dibanding rentang normal</li>' +
        '<li>Info jadwal MCU &amp; program kesehatan</li></ul>' +
        '<div class="small text-muted mt-2">Catatan: saya tidak mendiagnosis, tidak memberi resep, dan tidak menilai kelayakan kerja.</div>');
    } else {
      this._history.forEach(m => this.renderMsg(m.who, m.html));
    }
  },

  renderMsg(who, html) {
    const box = document.getElementById('ai_chat');
    const wrap = document.createElement('div');
    wrap.className = `chat-msg ${who}`;
    wrap.innerHTML = `<div class="chat-bubble ${who === 'me' ? 'chat-me' : 'chat-bot'}">${html}</div>`;
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  },
  bot(html) { this._history.push({ who: 'bot', html }); this.renderMsg('bot', html); },
  me(html) { this._history.push({ who: 'me', html }); this.renderMsg('me', html); },

  async ask(text) {
    this.me(UI.esc(text));
    const box = document.getElementById('ai_chat');
    const th = document.createElement('div');
    th.className = 'chat-msg bot';
    th.innerHTML = '<div class="chat-bubble chat-bot"><span class="typing">● ● ●</span></div>';
    box.appendChild(th); box.scrollTop = box.scrollHeight;
    await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
    th.remove();
    try { this.bot(await this.answer(text)); }
    catch (e) { this.bot('Maaf, terjadi kendala: ' + UI.esc(db.errMessage(e))); }
  },

  /* ---------- Mesin jawaban ---------- */
  async answer(q) {
    const t = q.toLowerCase();

    // 1) Batasan wajib
    const boundary = [
      [/diagnos|kenapa saya sakit|penyakit apa|apakah saya (.*) sakit/, 'Saya <b>tidak dapat mendiagnosis</b> kondisi kesehatan. Diagnosis hanya boleh dilakukan tenaga medis. Silakan ajukan <b>konsultasi</b> di menu Profil Kesehatan, atau bicara dengan petugas kesehatan sekolah. Saya bisa menjelaskan <i>arti umum</i> parameter pemeriksaan bila Anda mau.'],
      [/obat|resep|dosis|pil |tablet/, 'Saya <b>tidak boleh memberikan atau mengubah resep obat</b>. Pengobatan hanya melalui dokter/petugas kesehatan. Saya bisa membantu edukasi gaya hidup umum.'],
      [/layak kerja|kinerja|kenaikan|gaji|promosi|mutasi|penilaian/, 'Sistem ini <b>tidak digunakan untuk keputusan kepegawaian</b> (kelayakan kerja, kinerja, promosi). Data kesehatan dipisahkan dari penilaian SDM sesuai kebijakan & UU No. 27/2022.'],
      [/data (pegawai|orang) lain|rekam medis (pegawai|orang) lain|kesehatan budi|kesehatan (pak|bu|mas|mbak)/, 'Saya <b>tidak dapat menampilkan data medis pegawai lain</b>. Setiap pengguna hanya dapat melihat data miliknya sendiri.']
    ];
    for (const [re, msg] of boundary) if (re.test(t)) return msg + this.disclaimer();

    // 2) Salam & terima kasih
    if (/^(hai|halo|hi|assalam|selamat|pagi|siang|sore|malam)/.test(t))
      return 'Wa\'alaikumussalam / Halo! Ada yang bisa saya bantu tentang kesehatan hari ini? 😊 Coba tanya misalnya: <i>"apa arti gula darah puasa"</i> atau <i>"hitung BMI saya"</i>.';
    if (/terima kasih|makasih|thanks/.test(t)) return 'Sama-sama! Jaga kesehatan ya. 💚';

    // 3) BMI
    if (/bmi|berat badan ideal|indeks massa/.test(t)) return this.bmiAnswer(t);

    // 4) Jadwal MCU
    if (/jadwal|kapan (mcu|medical)/.test(t)) return this.scheduleAnswer();

    // 5) Program kesehatan
    if (/program|senam|imunisasi|screening/.test(t)) return this.programAnswer();

    // 6) Parameter lab / KB
    for (const k of AI_KB) {
      if (k.keys.some(key => t.includes(key))) return this.kbAnswer(k, t);
    }
    if (/hasil|lab|mcu|pemeriksaan/.test(t)) return this.myResultsAnswer();

    // 7) Tips umum
    if (/tips|gaya hidup|sehat cara|cara sehat|pola makan|olahraga/.test(t))
      return '<b>Tips gaya hidup sehat (umum):</b><ul class="mb-1"><li>Makan seimbang: setengah piring sayur-buah</li>' +
        '<li>Batasi gula, garam, lemak (G-G-L)</li><li>Aktivitas fisik minimal 30 menit/hari</li>' +
        '<li>Tidur 7–8 jam</li><li>Minum air putih cukup, kurangi minuman manis</li>' +
        '<li>Tidak merokok, kelola stres</li><li>Pemeriksaan kesehatan rutin (MCU periodik)</li></ul>' + this.disclaimer();

    // 8) Fallback
    return 'Maaf, saya belum memahami pertanyaan itu. Saya bisa membantu menjelaskan arti umum: <b>gula darah, kolesterol, trigliserida, asam urat, hemoglobin, SGOT/SGPT, tekanan darah, kreatinin, trombosit</b>, menghitung <b>BMI</b>, atau info <b>jadwal MCU</b> &amp; <b>program kesehatan</b>.' + this.disclaimer();
  },

  disclaimer() {
    return '<div class="small text-muted mt-2">⚠️ Edukasi umum — bukan diagnosis. Konsultasikan kondisi Anda ke petugas kesehatan / tenaga medis.</div>';
  },

  async _own() {
    if (this._ownCache) return this._ownCache;
    const out = { prof: null, lab: null, mcu: null };
    if (Auth.employeeId) {
      const [prof] = await db.list('health_profiles', '*', { eq: [['employee_id', Auth.employeeId]] });
      out.prof = prof || null;
      const labs = await db.list('laboratory_results', '*', { eq: [['employee_id', Auth.employeeId]], order: { col: 'created_at' }, limit: 1 });
      out.lab = labs[0] || null;
      const mcus = await db.list('medical_checkups', '*', { eq: [['employee_id', Auth.employeeId]], order: { col: 'checkup_date' }, limit: 1 });
      out.mcu = mcus[0] || null;
    }
    this._ownCache = out;
    return out;
  },

  async bmiAnswer(t) {
    const h = t.match(/tinggi\s*[:=]?\s*(\d{2}(\.\d+)?)/);
    const w = t.match(/berat\s*[:=]?\s*(\d{2,3}(\.\d+)?)/);
    let height = h ? +h[1] : null, weight = w ? +w[1] : null;
    const own = await this._own();
    if (!height && own.prof?.height_cm) height = +own.prof.height_cm;
    if (!weight && own.prof?.weight_kg) weight = +own.prof.weight_kg;
    if (!height || !weight)
      return 'Untuk menghitung BMI, saya butuh <b>tinggi (cm)</b> dan <b>berat (kg)</b> Anda.<br>' +
        'Tulis misalnya: <i>"hitung BMI tinggi 170 berat 75"</i> — atau lengkapi tinggi/berat di <b>Profil Kesehatan</b> agar saya bisa mengambil data Anda.';

    const bmi = weight / Math.pow(height / 100, 2);
    const cat = bmi < 18.5 ? ['Kurus (Berat Badan Kurang)', 'warning']
      : bmi < 25 ? ['Normal', 'success']
      : bmi < 27 ? ['Berat Badan Berlebih (overweight ringan)', 'warning']
      : ['Obesitas', 'danger'];
    const ideal = (22 * Math.pow(height / 100, 2)).toFixed(1);
    return `<b>BMI Anda: ${bmi.toFixed(1)}</b> (tinggi ${height} cm, berat ${weight} kg)<br>
      Kategori: <span class="badge text-bg-${cat[1]}">${cat[0]}</span><br><br>
      <b>Arti BMI (kategori umum Kemenkes):</b> kurang dari 18.5 kurus · 18.5–24.9 normal · 25–29.9 berlebih · ≥30 obesitas.<br>
      Berat ideal perkiraan untuk tinggi Anda: <b>${ideal} kg</b>.<br><br>
      BMI hanya skrining awal — komposisi tubuh & kondisi individual perlu dinilai petugas kesehatan.` + this.disclaimer();
  },

  async kbAnswer(k, t) {
    const own = await this._own();
    let mine = '';
    if (own.lab) {
      const map = { 'Gula Darah Puasa': own.lab.gula_darah_puasa, 'Kolesterol Total': own.lab.cholesterol_total, LDL: own.lab.ldl, HDL: own.lab.hdl, Trigliserida: own.lab.trigliserida, 'Asam Urat': own.lab.asam_urat, 'Hemoglobin (Hb)': own.lab.hemoglobin, 'SGOT / SGPT (Enzim Hati)': [own.lab.sgot, own.lab.sgpt], 'Kreatinin (Fungsi Ginjal)': own.lab.creatinine, Trombosit: own.lab.trombosit, Leukosit: own.lab.leukocytes, 'Tekanan Darah': null };
      let v = map[k.title];
      if (Array.isArray(v)) v = v.filter(x => x !== null && x !== undefined).join(' / ');
      if (v) mine = `<div class="alert alert-success py-2 small mb-2"><b>Hasil terakhir Anda</b> (${UI.fmtDate(own.lab.examined_at)}): <b>${UI.esc(String(v))} ${k.unit}</b></div>`;
    }
    return `${mine}<b>${k.title}</b><ul class="mb-2 small">
      <li><b>Rentang umum:</b> ${k.normal} ${k.unit}</li>
      <li><b>Bila rendah:</b> ${k.rendah}</li>
      <li><b>Bila tinggi:</b> ${k.tinggi}</li></ul>
      <b>Arti umum:</b> ${k.arti}<br><b>Pola hidup sehat umum:</b> ${k.tips}` + this.disclaimer();
  },

  async myResultsAnswer() {
    const own = await this._own();
    if (!own.lab) return 'Belum ada hasil laboratorium yang tercatat untuk Anda. Hasil lab akan muncul setelah MCU dilakukan & diinput petugas kesehatan (menu <b>Laboratorium</b>).';
    const l = own.lab;
    const rows = [
      ['Hemoglobin', l.hemoglobin, 'g/dL'], ['Gula Darah Puasa', l.gula_darah_puasa, 'mg/dL'],
      ['Kolesterol Total', l.cholesterol_total, 'mg/dL'], ['LDL', l.ldl, 'mg/dL'], ['HDL', l.hdl, 'mg/dL'],
      ['Trigliserida', l.trigliserida, 'mg/dL'], ['Asam Urat', l.asam_urat, 'mg/dL'],
      ['SGOT', l.sgot, 'U/L'], ['SGPT', l.sgpt, 'U/L'], ['Kreatinin', l.creatinine, 'mg/dL']
    ].filter(r => r[1] !== null && r[1] !== undefined);
    return `Hasil lab terakhir Anda (${UI.fmtDate(l.examined_at)}):<div class="table-responsive"><table class="table table-sm table-bordered mb-2 small">
      <thead class="table-light"><tr><th>Parameter</th><th>Nilai</th><th>Rentang umum</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${r[0]}</td><td class="fw-bold">${r[1]} ${r[2]}</td>
        <td class="small text-muted">${LAB_RANGES[Object.keys(LAB_RANGES).find(k => LAB_LABELS[k] === r[0])] ? LAB_RANGES[Object.keys(LAB_RANGES).find(k => LAB_LABELS[k] === r[0])].slice(0, 2).join('–') : '-'} ${r[2]}</td></tr>`).join('')}
      </tbody></table></div>
      Penilaian hasil (termasuk klasifikasi kesehatan Anda) <b>dilakukan oleh petugas kesehatan</b> — lihat menu Medical Check Up.` + this.disclaimer();
  },

  async scheduleAnswer() {
    if (!Auth.employeeId) return 'Jadwal MCU dapat dilihat di menu <b>Medical Check Up</b>. Jika akun Anda belum terhubung data pegawai, hubungi HRD.';
    const rows = await db.list('medical_checkups', 'checkup_date,mcu_type,status', {
      eq: [['employee_id', Auth.employeeId]], order: { col: 'checkup_date' }, limit: 3
    });
    const next = rows.filter(r => r.status === 'terjadwal')[0];
    const last = rows.filter(r => r.status === 'selesai')[0];
    return (next ? `<b>Jadwal MCU berikutnya:</b> ${UI.fmtDate(next.checkup_date)} (${MCU_TYPE[next.mcu_type]?.[0] || next.mcu_type})` : 'Belum ada jadwal MCU mendatang.') +
      (last ? `<br><b>MCU terakhir:</b> ${UI.fmtDate(last.checkup_date)} — status kesehatan ditetapkan petugas.` : '') +
      `<br>Detail lengkap ada di menu <b>Medical Check Up</b>.`;
  },

  async programAnswer() {
    const rows = await db.list('health_programs', 'name,program_type,start_date,status,location', {
      order: { col: 'start_date' }, limit: 5
    });
    if (!rows.length) return 'Belum ada program kesehatan terdaftar.';
    return '<b>Program kesehatan terdekat:</b><ul class="mb-1">' +
      rows.map(p => `<li><b>${UI.esc(p.name)}</b> (${PRG_TYPE[p.program_type] || p.program_type}) — ${UI.fmtDate(p.start_date)}, ${UI.esc(p.location || '-')}</li>`).join('') +
      '</ul>Daftar ikut program: menu <b>Program Kesehatan</b> → tombol <i>Peserta</i>.';
  }
};
