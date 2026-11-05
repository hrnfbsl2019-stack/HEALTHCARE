/* ============================================================================
 * MADANI HEALTHCARE - UI Engine: helper, toast, modal, form builder, table builder
 * ========================================================================== */

const UI = {
  /* ---------------- util dasar ---------------- */
  get(o, path) {
    return path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  },
  esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  fmtDate(d) {
    if (!d) return '-';
    const dt = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(dt)) return '-';
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  fmtDateTime(d) {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt)) return '-';
    return dt.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  debounce(fn, ms = 400) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },
  async employeeOptions(force = false) {
    if (UI._empOpts && !force) return UI._empOpts;
    let rows;
    if (Auth.role === ROLES.PEG && Auth.employeeId) {
      rows = await db.list('employees', 'id,employee_id,full_name,unit', { eq: [['id', Auth.employeeId]] });
    } else {
      rows = await db.list('employees', 'id,employee_id,full_name,unit', { order: { col: 'full_name' }, eq: [['employment_status', 'aktif']] });
    }
    UI._empOpts = rows.map(r => ({ value: r.id, label: `${r.employee_id} — ${r.full_name}${r.unit ? ' (' + r.unit + ')' : ''}` }));
    return UI._empOpts;
  },

  /* ---------------- badge & label ---------------- */
  badge(text, color = 'secondary') {
    return `<span class="badge text-bg-${color}">${UI.esc(text)}</span>`;
  },
  HL: { // label + warna health_status (5 tingkat)
    sehat: ['Sehat', 'success'], sehat_catatan: ['Sehat dgn Catatan', 'info'],
    pemantauan: ['Perlu Pemantauan', 'warning'], tindak_lanjut: ['Perlu Tindak Lanjut', 'danger'],
    perawatan: ['Perlu Perawatan', 'dark']
  },
  healthBadge(v) {
    if (!v) return UI.badge('Belum dinilai', 'light');
    const [l, c] = UI.HL[v] || [v, 'secondary'];
    return UI.badge(l, c);
  },

  /* ---- Klasifikasi 3 level "lampu lalu lintas" (Grafik Analisis Kondisi) ----
   * Pemetaan dari klasifikasi 5 tingkat petugas kesehatan:
   *   HIJAU  = sehat                       -> pegawai sehat & baik-baik saja
   *   ORANGE = sehat_catatan, pemantauan   -> ada yang kurang baik, perlu perhatian
   *   MERAH  = tindak_lanjut, perawatan    -> perlu penanganan lebih & tindak lanjut
   * Harus sinkron dengan RPC SQL: rpc_health_triage*  */
  TRIAGE: {
    hijau: {
      key: 'hijau', label: 'HIJAU', short: 'Hijau', meaning: 'Sehat & Baik', color: '#22c55e', cls: 'success',
      desc: 'Kondisi kesehatan baik-baik saja. Tidak ada keluhan/temuan berarti — pertahankan pola hidup sehat & MCU rutin.'
    },
    orange: {
      key: 'orange', label: 'ORANGE', short: 'Orange', meaning: 'Kurang Baik / Perlu Perhatian', color: '#f59e0b', cls: 'warning',
      desc: 'Ada indikasi yang kurang baik (catatan kesehatan / perlu pemantauan). Perlu edukasi, kontrol berkala & pemantauan petugas.'
    },
    merah: {
      key: 'merah', label: 'MERAH', short: 'Merah', meaning: 'Perlu Penanganan Lebih & Tindak Lanjut', color: '#dc2626', cls: 'danger',
      desc: 'Butuh penanganan lebih lanjut (rujukan/terapi/program pengobatan). Wajib tindak lanjut segera oleh petugas kesehatan.'
    },
    belum: {
      key: 'belum', label: 'Belum MCU', short: 'Belum MCU', meaning: 'Belum ada data MCU', color: '#94a3b8', cls: 'secondary',
      desc: 'Belum memiliki hasil Medical Check Up yang selesai — jadwalkan MCU.'
    }
  },

  /** health_status 5 tingkat -> kunci level triase (hijau/orange/merah/belum) */
  triageLevel(status) {
    if (!status) return 'belum';
    if (status === 'sehat') return 'hijau';
    if (status === 'sehat_catatan' || status === 'pemantauan') return 'orange';
    if (status === 'tindak_lanjut' || status === 'perawatan') return 'merah';
    return 'belum';
  },

  /** Badge level triase dari health_status 5 tingkat */
  triageBadge(status) {
    const t = UI.TRIAGE[UI.triageLevel(status)];
    return `<span class="badge triage-badge triage-${t.key}"><i class="bi bi-circle-fill me-1" style="font-size:.5rem"></i>${t.label}</span>`;
  },

  /** Blok kartu level (dipakai Dashboard & halaman Analisis) */
  triageTile(key, count, total, extra) {
    const t = UI.TRIAGE[key];
    const pct = total ? Math.round(count * 100 / total) : 0;
    return `<div class="col-6 col-lg-3">
      <div class="card border-0 shadow-sm h-100 triage-tile triage-tile-${t.key}">
        <div class="card-body d-flex align-items-center gap-3">
          <div class="triage-dot" style="background:${t.color}"></div>
          <div class="flex-grow-1">
            <div class="d-flex align-items-baseline gap-2">
              <span class="h3 fw-bold mb-0" style="color:${t.color}">${count}</span>
              <span class="small text-muted">${pct}% dari pegawai</span>
            </div>
            <div class="fw-semibold small">${t.label} — ${t.meaning}</div>
            ${extra || ''}
          </div>
        </div>
      </div></div>`;
  },
  enumBadge(v, map) {
    if (!v) return '-';
    const [l, c] = map[v] || [v, 'secondary'];
    return UI.badge(l, c);
  },

  /* ---------------- toast & modal ---------------- */
  toast(msg, type = 'success') {
    const wrap = document.getElementById('toast-root');
    const el = document.createElement('div');
    const bg = { success: 'text-bg-success', danger: 'text-bg-danger', warning: 'text-bg-warning', info: 'text-bg-primary' }[type] || 'text-bg-secondary';
    el.className = `toast align-items-center border-0 ${bg}`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${UI.esc(msg)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    wrap.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 4200 });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  },

  modal({ title, body, size = '', footer = '' }) {
    const root = document.getElementById('modal-root');
    const el = document.createElement('div');
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `<div class="modal-dialog modal-${size} modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header py-2"><h5 class="modal-title fs-6 fw-bold">${title}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer py-2">${footer}</div>` : ''}
      </div></div>`;
    root.appendChild(el);
    const m = new bootstrap.Modal(el);
    el.addEventListener('hidden.bs.modal', () => el.remove());
    m.show();
    return { el, modal: m };
  },

  confirm(message, title = 'Konfirmasi') {
    return new Promise(resolve => {
      const { el, modal } = UI.modal({
        title, size: 'md',
        body: `<p class="mb-0">${message}</p>`,
        footer: `<button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
                 <button class="btn btn-danger btn-sm" id="__cf_yes">Ya, Lanjutkan</button>`
      });
      el.querySelector('#__cf_yes').onclick = () => { modal.hide(); resolve(true); };
      el.addEventListener('hidden.bs.modal', () => resolve(false));
    });
  },

  /* ---------------- FORM BUILDER ----------------
   * fields: {key,label,type,options,required,col,step,min,max,placeholder,help,rows,
   *          onChange(vals, formEl), show(vals), value}
   * type: text|number|date|email|tel|password|textarea|select|checkbox|file|hidden
   * onSubmit: async(values) => true bila sukses (modal ditutup)
   */
  async formModal({ title, size = 'lg', fields, values = {}, submitLabel = 'Simpan', onSubmit }) {
    const col = f => `col-12 col-md-${f.col || 12}`;
    const bodyParts = ['<form id="__frm" class="row g-3" novalidate>'];
    for (const f of fields) {
      if (f.show && !f.show(values)) continue;
      const v = values[f.key] !== undefined && values[f.key] !== null ? values[f.key] : (f.value !== undefined ? f.value : '');
      let opts = f.options || [];
      if (typeof opts === 'function') opts = await opts();
      let input = '';
      const req = f.required ? ' required' : '';
      const ph = f.placeholder ? ` placeholder="${UI.esc(f.placeholder)}"` : '';
      if (f.type === 'select') {
        input = `<select class="form-select form-select-sm" name="${f.key}"${req}>
          <option value="">— Pilih ${UI.esc(f.label)} —</option>
          ${opts.map(o => `<option value="${UI.esc(o.value)}" ${String(v) === String(o.value) ? 'selected' : ''}>${UI.esc(o.label)}</option>`).join('')}
        </select>`;
      } else if (f.type === 'textarea') {
        input = `<textarea class="form-control form-control-sm" name="${f.key}" rows="${f.rows || 3}"${req}${ph}>${UI.esc(v)}</textarea>`;
      } else if (f.type === 'checkbox') {
        input = `<div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" role="switch" name="${f.key}" id="ck_${f.key}" ${v ? 'checked' : ''}>
          <label class="form-check-label small" for="ck_${f.key}">${UI.esc(f.label)}</label></div>`;
      } else if (f.type === 'file') {
        input = `<input type="file" class="form-control form-control-sm" name="${f.key}"${req} ${f.accept ? `accept="${f.accept}"` : ''}>`;
      } else if (f.type === 'hidden') {
        input = `<input type="hidden" name="${f.key}" value="${UI.esc(v)}">`;
      } else {
        const t = f.type || 'text';
        input = `<input type="${t}" class="form-control form-control-sm" name="${f.key}" value="${UI.esc(v)}"${req}${ph}
          ${f.step ? ` step="${f.step}"` : ''}${f.min !== undefined ? ` min="${f.min}"` : ''}${f.max !== undefined ? ` max="${f.max}"` : ''}>`;
      }
      const label = f.type === 'checkbox' ? '' : `<label class="form-label small fw-semibold mb-1">${UI.esc(f.label)}${f.required ? ' <span class="text-danger">*</span>' : ''}</label>`;
      bodyParts.push(`<div class="${col(f)}" data-field="${f.key}">${label}${input}
        ${f.help ? `<div class="form-text small">${f.help}</div>` : ''}</div>`);
    }
    bodyParts.push('</form>');
    const { el, modal } = UI.modal({
      title, size,
      body: bodyParts.join(''),
      footer: `<button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
               <button class="btn btn-success btn-sm" id="__frm_save"><i class="bi bi-save me-1"></i>${submitLabel}</button>`
    });

    const form = el.querySelector('#__frm');
    const collect = () => {
      const vals = {};
      for (const f of fields) {
        if (f.type === 'checkbox') { vals[f.key] = form.elements[f.key] ? form.elements[f.key].checked : false; continue; }
        if (f.type === 'file') { vals[f.key] = form.elements[f.key] ? (form.elements[f.key].files[0] || null) : null; continue; }
        vals[f.key] = form.elements[f.key] ? form.elements[f.key].value.trim() : '';
      }
      return vals;
    };
    // hook onChange (mis. kalkulasi BMI langsung)
    fields.forEach(f => {
      if (!f.onChange) return;
      const elx = form.elements[f.key];
      if (elx) elx.addEventListener('input', () => f.onChange(collect(), form));
      if (elx && (f.type === 'select' || f.type === 'date')) elx.addEventListener('change', () => f.onChange(collect(), form));
    });

    form.addEventListener('submit', e => e.preventDefault());
    el.querySelector('#__frm_save').onclick = async () => {
      const vals = collect();
      // validasi required
      for (const f of fields) {
        if (f.show && !f.show(vals)) continue;
        if (f.required && (vals[f.key] === '' || vals[f.key] === null)) {
          const wrap = form.querySelector(`[data-field="${f.key}"]`);
          if (wrap) { wrap.classList.add('was-validated'); wrap.querySelector('[name]')?.classList.add('is-invalid'); }
          UI.toast(`Kolom "${f.label}" wajib diisi`, 'warning');
          return;
        }
      }
      const btn = el.querySelector('#__frm_save');
      btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...';
      try {
        const ok = await onSubmit(vals);
        if (ok !== false) modal.hide();
      } catch (e) {
        UI.toast(db.errMessage(e), 'danger');
      } finally {
        btn.disabled = false; btn.innerHTML = `<i class="bi bi-save me-1"></i>${submitLabel}`;
      }
    };
    return { el, modal, form };
  },

  /* ---------------- TABLE BUILDER (listPage) ----------------
   * cfg = {
   *   mount, title, subtitle, table, select, columns:[{key,label,render,thClass,tdClass,sortable}],
   *   searchCols, filters:[{key,label,options:{val:label}}], defaultSort:{col,dir}, pageSize,
   *   canCreate, createLabel, form:{title,size,fields,transform},
   *   canEdit(row), canDelete(row), rowActions:[{icon,label,cls,onClick(row),show(row)}],
   *   customFetch({page,pageSize,search,filters}) -> {rows,total},   // override utk RPC (mis. HRD)
   *   exportCols:[{key,label}], exportFilename, headerExtra
   * }
   */
  listPage(cfg) {
    const st = {
      page: 1, pageSize: cfg.pageSize || 10, search: '',
      filters: {}, sort: cfg.defaultSort || { col: 'created_at', dir: 'desc' },
      total: 0, rows: []
    };
    const mount = cfg.mount;
    const hasCreate = cfg.canCreate && cfg.form;
    const canEditRow = row => cfg.canEdit && cfg.canEdit(row) && cfg.form;
    const canDelRow = row => cfg.canDelete && cfg.canDelete(row);
    const hasActionCol = !!((cfg.rowActions && cfg.rowActions.length) || cfg.canEdit || cfg.canDelete);
    const colspan = cfg.columns.length + (hasActionCol ? 1 : 0);

    mount.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h1 class="h4 fw-bold mb-1">${cfg.title}</h1>
          <div class="text-muted small">${cfg.subtitle || ''}</div>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          ${cfg.headerExtra || ''}
          ${cfg.exportCols ? `<button class="btn btn-outline-secondary btn-sm" id="lp_xls"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>` : ''}
          ${hasCreate ? `<button class="btn btn-success btn-sm" id="lp_add"><i class="bi bi-plus-lg me-1"></i>${cfg.createLabel || 'Tambah'}</button>` : ''}
        </div>
      </div>
      <div class="card shadow-sm border-0">
        <div class="card-body p-3">
          <div class="d-flex flex-wrap gap-2 mb-3 align-items-center">
            ${cfg.searchCols && cfg.searchCols.length ? `
              <div class="input-group input-group-sm" style="max-width:280px">
                <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
                <input type="text" class="form-control" id="lp_q" placeholder="Cari...">
              </div>` : ''}
            ${(cfg.filters || []).map(f => `
              <select class="form-select form-select-sm w-auto" data-filter="${f.key}">
                <option value="">${UI.esc(f.label)}: Semua</option>
                ${Object.entries(f.options).map(([v, l]) => `<option value="${UI.esc(v)}">${UI.esc(l)}</option>`).join('')}
              </select>`).join('')}
            <button class="btn btn-outline-secondary btn-sm ms-auto" id="lp_refresh" title="Muat ulang"><i class="bi bi-arrow-clockwise"></i></button>
          </div>
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light"><tr id="lp_head"></tr></thead>
              <tbody id="lp_body"></tbody>
            </table>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
            <div class="small text-muted" id="lp_info"></div>
            <nav><ul class="pagination pagination-sm mb-0" id="lp_pager"></ul></nav>
          </div>
        </div>
      </div>`;

    const tbody = mount.querySelector('#lp_body');
    const thead = mount.querySelector('#lp_head');

    function renderHead() {
      thead.innerHTML = (cfg.columns || []).map(c => {
        if (!c.sortable) return `<th class="${c.thClass || ''}">${c.label}</th>`;
        const active = st.sort.col === c.key;
        return `<th class="${c.thClass || ''}" role="button" data-sort="${c.key}">
          ${c.label} <i class="bi ${active ? (st.sort.dir === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill') : 'bi-arrow-down-up opacity-25'} small"></i></th>`;
      }).join('') + (hasActionCol ? '<th class="text-end">Aksi</th>' : '');
      thead.querySelectorAll('[data-sort]').forEach(th => th.onclick = () => {
        const k = th.dataset.sort;
        if (st.sort.col === k) st.sort.dir = st.sort.dir === 'asc' ? 'desc' : 'asc';
        else st.sort = { col: k, dir: 'asc' };
        load();
      });
    }

    function renderRows() {
      if (!st.rows.length) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-muted py-5">
          <i class="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>Tidak ada data</td></tr>`;
        return;
      }
      tbody.innerHTML = st.rows.map(row => {
        const tds = cfg.columns.map(c => {
          const val = c.render ? c.render(row) : UI.esc(UI.get(row, c.key) ?? '-');
          return `<td class="${c.tdClass || ''}">${val === undefined || val === null || val === '' ? '-' : val}</td>`;
        }).join('');
        const acts = [];
        (cfg.rowActions || []).forEach((a, i) => {
          if (a.show && !a.show(row)) return;
          acts.push(`<button class="btn btn-outline-${a.cls || 'primary'} btn-sm" data-act="ra${i}" title="${a.label}"><i class="bi ${a.icon}"></i>${a.label ? ' ' + a.label : ''}</button>`);
        });
        if (canEditRow(row)) acts.push(`<button class="btn btn-outline-secondary btn-sm" data-act="edit" title="Ubah"><i class="bi bi-pencil"></i></button>`);
        if (canDelRow(row)) acts.push(`<button class="btn btn-outline-danger btn-sm" data-act="del" title="Hapus"><i class="bi bi-trash"></i></button>`);
        const actTd = acts.length ? `<td class="text-end text-nowrap"><div class="d-inline-flex gap-1">${acts.join('')}</div></td>` : '';
        return `<tr>${tds}${actTd}</tr>`;
      }).join('');

      tbody.querySelectorAll('button[data-act]').forEach(btn => {
        btn.onclick = async () => {
          const row = st.rows[+btn.closest('tr').rowIndex - 1];
          const act = btn.dataset.act;
          try {
            if (act === 'edit') return openForm(row);
            if (act === 'del') {
              if (await UI.confirm('Data yang dihapus tidak dapat dikembalikan. Lanjutkan menghapus data ini?')) {
                await db.remove(cfg.table, row.id);
                UI.toast('Data berhasil dihapus');
                load();
              }
              return;
            }
            const idx = +act.replace('ra', '');
            await cfg.rowActions[idx].onClick(row);
          } catch (e) { UI.toast(db.errMessage(e), 'danger'); }
        };
      });
    }

    function renderPager() {
      const pages = Math.max(1, Math.ceil(st.total / st.pageSize));
      mount.querySelector('#lp_info').textContent =
        st.total ? `Menampilkan ${(st.page - 1) * st.pageSize + 1}–${Math.min(st.page * st.pageSize, st.total)} dari ${st.total} data` : '0 data';
      let html = `<li class="page-item ${st.page <= 1 ? 'disabled' : ''}"><a class="page-link" data-p="${st.page - 1}">&laquo;</a></li>`;
      const start = Math.max(1, st.page - 2), end = Math.min(pages, start + 4);
      for (let p = start; p <= end; p++) html += `<li class="page-item ${p === st.page ? 'active' : ''}"><a class="page-link" data-p="${p}">${p}</a></li>`;
      html += `<li class="page-item ${st.page >= pages ? 'disabled' : ''}"><a class="page-link" data-p="${st.page + 1}">&raquo;</a></li>`;
      const pg = mount.querySelector('#lp_pager');
      pg.innerHTML = html;
      pg.querySelectorAll('a[data-p]').forEach(a => a.onclick = e => {
        e.preventDefault();
        const p = +a.dataset.p;
        if (p >= 1 && p <= pages) { st.page = p; load(); }
      });
    }

    async function load() {
      tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-4">
        <span class="spinner-border spinner-border-sm text-success"></span> Memuat data...</td></tr>`;
      try {
        if (cfg.customFetch) {
          const res = await cfg.customFetch(st);
          st.rows = res.rows; st.total = res.total;
        } else {
          const eq = Object.entries(st.filters);
          const res = await db.page(cfg.table, cfg.select || '*', {
            page: st.page, pageSize: st.pageSize, eq,
            search: st.search, searchCols: cfg.searchCols,
            order: st.sort
          });
          st.rows = res.rows; st.total = res.total;
        }
        renderRows(); renderPager();
        if (cfg.onAfterLoad) cfg.onAfterLoad(st);
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="${cfg.columns.length + 1}" class="text-center text-danger py-4">${UI.esc(db.errMessage(e))}</td></tr>`;
      }
    }

    function openForm(row) {
      const isEdit = !!row;
      const fields = cfg.form.fields;
      UI.formModal({
        title: cfg.form.title + (isEdit ? ' (Ubah)' : ''), size: cfg.form.size || 'lg',
        fields, values: isEdit ? row : {},
        onSubmit: async vals => {
          const payload = cfg.form.transform ? await cfg.form.transform(vals, row) : vals;
          if (isEdit) await db.update(cfg.table, row.id, payload);
          else await db.insert(cfg.table, payload);
          UI.toast(isEdit ? 'Perubahan berhasil disimpan' : 'Data baru berhasil ditambahkan');
          load();
          return true;
        }
      });
    }

    /* toolbar events */
    if (cfg.searchCols && cfg.searchCols.length) {
      mount.querySelector('#lp_q').addEventListener('input', UI.debounce(e => {
        st.search = e.target.value.trim(); st.page = 1; load();
      }));
    }
    mount.querySelectorAll('[data-filter]').forEach(sel => sel.addEventListener('change', () => {
      st.filters[sel.dataset.filter] = sel.value; st.page = 1; load();
    }));
    mount.querySelector('#lp_refresh').onclick = () => load();
    if (hasCreate) mount.querySelector('#lp_add').onclick = () => openForm(null);
    if (cfg.exportCols) mount.querySelector('#lp_xls').onclick = async () => {
      try {
        const eq = Object.entries(st.filters);
        const rows = await db.list(cfg.table, cfg.select || '*', { eq, search: st.search, searchCols: cfg.searchCols, order: st.sort, limit: 5000 });
        Export.excel(cfg.exportFilename || 'data', rows, cfg.exportCols);
      } catch (e) { UI.toast(db.errMessage(e), 'danger'); }
    };

    renderHead();
    load();
    return { reload: load, state: st };
  },

  /* Kartu statistik dashboard */
  statCard({ icon, label, value, color = 'success', sub = '', href }) {
    return `<div class="col-6 col-md-4 col-xl-3">
      <div class="card border-0 shadow-sm h-100 stat-card" ${href ? `role="button" data-href="#/${href}"` : ''}>
        <div class="card-body d-flex align-items-center gap-3">
          <div class="stat-icon bg-${color}-subtle text-${color}"><i class="bi ${icon}"></i></div>
          <div>
            <div class="h4 fw-bold mb-0 counter" data-v="${value}">${value}</div>
            <div class="small text-muted">${label}</div>
            ${sub ? `<div class="small text-${color}">${sub}</div>` : ''}
          </div>
        </div>
      </div></div>`;
  }
};
