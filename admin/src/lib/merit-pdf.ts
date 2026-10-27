// Compiles the merit list from the admin's formula and renders it as a PDF.
// Everything runs in the browser from the data the Merit page already loaded.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MeritRow, MeritWeights } from '@/lib/api';

export interface CompiledMerit {
  ranked: Array<MeritRow & { rank: number; score: number }>;
  unranked: MeritRow[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Merit % = (matric% × wM + fsc% × wF + mdcat% × wD) / (wM + wF + wD). Only students with all three results are ranked. */
export function compileMerit(rows: MeritRow[], w: MeritWeights): CompiledMerit {
  const sum = w.matric + w.fsc + w.mdcat;
  const scored: Array<MeritRow & { score: number }> = [];
  const unranked: MeritRow[] = [];
  for (const r of rows) {
    if (r.matricPct == null || r.fscPct == null || r.mdcatPct == null || sum <= 0) { unranked.push(r); continue; }
    scored.push({ ...r, score: r2((r.matricPct * w.matric + r.fscPct * w.fsc + r.mdcatPct * w.mdcat) / sum) });
  }
  // Tie-break: higher MDCAT %, then higher FSc %, then higher matric %, then name.
  scored.sort((a, b) => b.score - a.score || (b.mdcatPct ?? 0) - (a.mdcatPct ?? 0) || (b.fscPct ?? 0) - (a.fscPct ?? 0) || (b.matricPct ?? 0) - (a.matricPct ?? 0) || a.name.localeCompare(b.name));
  unranked.sort((a, b) => a.name.localeCompare(b.name));
  return { ranked: scored.map((r, i) => ({ ...r, rank: i + 1 })), unranked };
}

const pct = (n: number | null) => (n == null ? '—' : `${n.toFixed(2)}%`);
const marks = (m: number | null, t: number | null) => (m == null || t == null ? '' : `${m}/${t}`);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'merit-list';

export function downloadMeritPdf(rows: MeritRow[], w: MeritWeights, opts: { siteName?: string; title?: string } = {}) {
  const { ranked, unranked } = compileMerit(rows, w);
  const title = opts.title?.trim() || 'Merit List';
  const site = opts.siteName?.trim() || '';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const indigo: [number, number, number] = [67, 56, 202];
  const generated = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Header band
  doc.setFillColor(...indigo); doc.rect(0, 0, W, 74, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text(title, M, 36);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(site || 'Admissions', M, 54);
  doc.text(`Generated ${generated}`, W - M, 54, { align: 'right' });

  // Formula + summary
  doc.setTextColor(30, 30, 40); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Merit formula', M, 100);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(`Merit % = Matric % × ${w.matric}%  +  FSc % × ${w.fsc}%  +  MDCAT % × ${w.mdcat}%`, M, 116);
  doc.setTextColor(90, 90, 105);
  doc.text(`${ranked.length} student${ranked.length === 1 ? '' : 's'} ranked${unranked.length ? `  ·  ${unranked.length} not ranked (matric, FSc or MDCAT marks missing)` : ''}`, M, 131);
  doc.text('Ties are broken by MDCAT %, then FSc %, then Matric %.', M, 145);

  if (ranked.length) {
    autoTable(doc, {
      startY: 160,
      margin: { left: M, right: M, bottom: 50 },
      head: [['Rank', 'Student', 'Matric', 'FSc', 'MDCAT', 'Merit %']],
      body: ranked.map((r) => [String(r.rank), `${r.name}\n${r.email}`, `${pct(r.matricPct)}\n${marks(r.matricMarks, r.matricTotal)}`, `${pct(r.fscPct)}\n${marks(r.fscMarks, r.fscTotal)}`, `${pct(r.mdcatPct)}\n${marks(r.mdcatMarks, r.mdcatTotal)}`, `${r.score.toFixed(2)}%`]),
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, valign: 'middle', textColor: [30, 30, 40], lineColor: [226, 228, 240], lineWidth: 0.4 },
      headStyles: { fillColor: indigo, textColor: 255, fontStyle: 'bold', halign: 'left' },
      alternateRowStyles: { fillColor: [247, 247, 252] },
      columnStyles: { 0: { halign: 'center', cellWidth: 38, fontStyle: 'bold' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 70 }, 3: { cellWidth: 70 }, 4: { cellWidth: 70 }, 5: { cellWidth: 58, halign: 'right', fontStyle: 'bold', textColor: indigo } },
      didParseCell: (d) => { if (d.section === 'body' && d.column.index === 1 && d.row.index >= 0) d.cell.styles.fontSize = 9; },
    });
  } else {
    doc.setTextColor(90, 90, 105); doc.setFontSize(11);
    doc.text('No students have all three results (Matric, FSc and MDCAT) yet.', M, 175);
  }

  if (unranked.length) {
    const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 175;
    const y = last + 28 > H - 120 ? (doc.addPage(), 50) : last + 28;
    doc.setTextColor(30, 30, 40); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Not ranked — incomplete marks', M, y);
    autoTable(doc, {
      startY: y + 8,
      margin: { left: M, right: M, bottom: 50 },
      head: [['Student', 'Matric', 'FSc', 'MDCAT']],
      body: unranked.map((r) => [`${r.name}\n${r.email}`, pct(r.matricPct), pct(r.fscPct), pct(r.mdcatPct)]),
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, textColor: [30, 30, 40], lineColor: [226, 228, 240], lineWidth: 0.4 },
      headStyles: { fillColor: [100, 100, 120], textColor: 255 },
      alternateRowStyles: { fillColor: [247, 247, 252] },
    });
  }

  // Footer with page numbers on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(140, 140, 155); doc.setFont('helvetica', 'normal');
    doc.text(`${site ? `${site} · ` : ''}${title}`, M, H - 24);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 24, { align: 'right' });
  }

  doc.save(`${slug(title)}-${new Date().toISOString().slice(0, 10)}.pdf`);
  return { ranked: ranked.length, unranked: unranked.length };
}
