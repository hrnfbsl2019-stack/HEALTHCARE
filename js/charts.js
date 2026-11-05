/* ============================================================================
 * MADANI HEALTHCARE - Chart.js helpers (tema hijau-emas)
 * ========================================================================== */

const Charts = {
  _reg: {},
  COLORS: {
    green: '#166534', greenLight: '#22c55e', greenPale: '#86efac',
    gold: '#d97706', goldLight: '#fbbf24',
    red: '#dc2626', amber: '#f59e0b', blue: '#2563eb', gray: '#94a3b8', teal: '#0d9488',
    status: ['#22c55e', '#0d9488', '#f59e0b', '#ea580c', '#7f1d1d', '#94a3b8']
  },
  destroy(id) {
    if (this._reg[id]) { this._reg[id].destroy(); delete this._reg[id]; }
  },
  render(id, type, data, options = {}) {
    const el = document.getElementById(id);
    if (!el) return;
    this.destroy(id);
    this._reg[id] = new Chart(el.getContext('2d'), {
      type, data,
      options: Object.assign({
        responsive: true, maintainAspectRatio: false,
        animation: false,          // render langsung — stabil & ramah cetak/PDF
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
      }, options)
    });
  },
  doughnut(id, labels, values, colors) {
    this.render(id, 'doughnut', {
      labels, datasets: [{ data: values, backgroundColor: colors || this.COLORS.status, borderWidth: 2, borderColor: '#fff' }]
    }, { cutout: '62%' });
  },
  line(id, labels, datasets, opts = {}) {
    this.render(id, 'line', { labels, datasets }, Object.assign({
      interaction: { mode: 'index', intersect: false },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }, opts));
  },
  bar(id, labels, datasets, horizontal = false) {
    this.render(id, 'bar', { labels, datasets }, {
      indexAxis: horizontal ? 'y' : 'x',
      scales: horizontal
        ? { x: { beginAtZero: true, ticks: { precision: 0 } } }
        : { y: { beginAtZero: true, ticks: { precision: 0 } } }
    });
  },
  /** Bar bertumpuk (dipakai grafik triase per unit) */
  barStacked(id, labels, datasets) {
    this.render(id, 'bar', { labels, datasets }, {
      indexAxis: 'x',
      scales: {
        x: { stacked: true, ticks: { precision: 0 } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
      }
    });
  }
};
