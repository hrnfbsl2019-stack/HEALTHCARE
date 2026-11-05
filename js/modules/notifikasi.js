/* ============================================================================
 * MODUL: Notifikasi (in-app) — dibuat oleh trigger tindak lanjut & pengingat MCU
 * ========================================================================== */

const NOTIF_ICON = { info: 'bi-info-circle', pengingat: 'bi-alarm', peringatan: 'bi-exclamation-triangle', tindak_lanjut: 'bi-arrow-repeat' };

App.modules.notifikasi = {
  async render(mount) {
    const { data: rows, error } = await sb.from('notifications')
      .select('*').eq('user_id', Auth.user.id)
      .order('created_at', { ascending: false }).limit(200);
    if (error) { mount.innerHTML = `<div class="alert alert-danger">${UI.esc(db.errMessage(error))}</div>`; return; }

    const unread = rows.filter(r => !r.is_read).length;
    mount.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h1 class="h4 fw-bold mb-1">Notifikasi</h1>
          <div class="text-muted small">${rows.length} notifikasi · ${unread} belum dibaca</div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-success btn-sm" id="nf_all"><i class="bi bi-check2-all me-1"></i>Tandai Semua Dibaca</button>
        </div>
      </div>
      <div class="row g-3" id="nf_list">
        ${rows.length ? rows.map(n => `
          <div class="col-12">
            <div class="card border-0 shadow-sm nf-item ${n.is_read ? 'read' : ''}" data-id="${n.id}" data-link="${UI.esc(n.link || '')}" role="button">
              <div class="card-body d-flex align-items-start gap-3 py-3">
                <div class="stat-icon ${n.is_read ? 'bg-secondary-subtle text-secondary' : 'bg-success-subtle text-success'}">
                  <i class="bi ${NOTIF_ICON[n.notification_type] || 'bi-bell'}"></i>
                </div>
                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between flex-wrap gap-1">
                    <span class="fw-bold small ${n.is_read ? '' : 'text-success'}">${UI.esc(n.title)}</span>
                    <span class="small text-muted">${UI.fmtDateTime(n.created_at)}</span>
                  </div>
                  <div class="small">${UI.esc(n.message || '')}</div>
                </div>
                ${n.is_read ? '' : '<span class="badge text-bg-danger rounded-pill">Baru</span>'}
              </div>
            </div>
          </div>`).join('')
          : `<div class="col-12"><div class="card border-0 shadow-sm"><div class="card-body text-center py-5 text-muted">
              <i class="bi bi-bell-slash fs-1 d-block mb-2 opacity-50"></i>Belum ada notifikasi</div></div></div>`}
      </div>`;

    document.getElementById('nf_all').onclick = async () => {
      await sb.from('notifications').update({ is_read: true }).eq('user_id', Auth.user.id).eq('is_read', false);
      UI.toast('Semua notifikasi ditandai dibaca');
      App.refreshNotifBadge();
      this.render(mount);
    };

    mount.querySelectorAll('.nf-item').forEach(el => el.onclick = async () => {
      const id = el.dataset.id, link = el.dataset.link;
      await sb.from('notifications').update({ is_read: true }).eq('id', id);
      App.refreshNotifBadge();
      if (link) {
        if (link.startsWith('#/')) location.hash = link;
        else if (link.startsWith('mcu:')) { location.hash = '#/mcu'; return; }
        else this.render(mount);
      } else this.render(mount);
    });
  }
};
