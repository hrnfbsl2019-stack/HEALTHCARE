/* ============================================================================
 * MADANI HEALTHCARE - Export Excel (SheetJS) & PDF (jsPDF + AutoTable)
 * ========================================================================== */

const Export = {
  excel(filename, rows, cols) {
    if (!rows || !rows.length) { UI.toast('Tidak ada data untuk diekspor', 'warning'); return; }
    const data = rows.map(r => {
      const o = {};
      cols.forEach(c => { o[c.label] = c.plain ? c.plain(r) : (UI.get(r, c.key) ?? ''); });
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = cols.map(c => ({ wch: Math.max(12, Math.min(40, c.label.length + 6)) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    UI.toast('File Excel berhasil diunduh');
  },

  pdf(filename, title, subtitle, cols, rows) {
    if (!rows || !rows.length) { UI.toast('Tidak ada data untuk diekspor', 'warning'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(22, 101, 52);           // hijau tua
    doc.rect(0, 0, W, 64, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('MADANI HEALTHCARE', 40, 26);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`${APP_CONFIG.org}`, 40, 42);
    doc.setFontSize(10); doc.text(title, W - 40, 26, { align: 'right' });
    if (subtitle) doc.setFontSize(8), doc.text(subtitle, W - 40, 40, { align: 'right' });

    const body = rows.map(r => cols.map(c => {
      const v = c.plain ? c.plain(r) : (UI.get(r, c.key) ?? '');
      return String(v === null || v === undefined ? '-' : v);
    }));

    doc.autoTable({
      startY: 80,
      head: [cols.map(c => c.label)],
      body,
      styles: { fontSize: 7.5, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 252, 246] },
      margin: { left: 36, right: 36 }
    });

    const P = doc.internal.getNumberOfPages();
    for (let i = 1; i <= P; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5); doc.setTextColor(120);
      doc.text(`Dicetak ${new Date().toLocaleString('id-ID')} — ${title} — Halaman ${i}/${P}`,
        W / 2, doc.internal.pageSize.getHeight() - 16, { align: 'center' });
    }
    doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
    UI.toast('File PDF berhasil diunduh');
  }
};
