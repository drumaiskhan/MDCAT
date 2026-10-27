// Admin → Merit data. One row per student with their matric, FSc and MDCAT
// marks collected in one place, plus the merit score used for the merit list.
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Award, Download, Pencil, Search, Users, X, ClipboardCheck, Trophy, Scale, FileDown } from 'lucide-react';
import { meritApi, siteContentApi, ApiRequestError, type MeritRow, type MeritWeights } from '@/lib/api';
import { downloadMeritPdf } from '@/lib/merit-pdf';
import { queryClient } from '@/lib/query-client';
import { toast } from '@/hooks/use-toast';
import { EmptyState, SectionHeader, SkeletonPage, cn } from '@/lib/shared';

const KEY = ['admin-merit'];
type Filter = 'all' | 'mdcat' | 'pending';
type Sort = 'merit' | 'name' | 'recent';

const cell = (m: number | null, t: number | null, pct: number | null) => m == null || t == null
  ? <span className="text-muted-foreground">—</span>
  : <div><div className="font-semibold">{m} <span className="text-muted-foreground">/ {t}</span></div><div className="text-[10px] font-bold text-primary">{pct}%</div></div>;

function WeightsPanel({ weights, rows }: { weights: MeritWeights; rows: MeritRow[] }) {
  const [w, setW] = useState({ matric: String(weights.matric), fsc: String(weights.fsc), mdcat: String(weights.mdcat) });
  const sum = Number(w.matric) + Number(w.fsc) + Number(w.mdcat);
  const ok = Math.abs(sum - 100) < 0.001;
  const save = useMutation({
    mutationFn: () => meritApi.saveWeights({ matric: Number(w.matric), fsc: Number(w.fsc), mdcat: Number(w.mdcat) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: KEY }); toast({ title: 'Merit weights saved' }); },
    onError: (e: unknown) => toast({ title: 'Could not save weights', description: e instanceof ApiRequestError ? e.message : undefined, variant: 'destructive' }),
  });
  const siteQ = useQuery({ queryKey: ['site-content'], queryFn: siteContentApi.get });
  // Uses the percentages currently typed in the boxes, so the admin can try a
  // formula and download the list without saving it first.
  const generate = () => {
    try {
      const out = downloadMeritPdf(rows, { matric: Number(w.matric), fsc: Number(w.fsc), mdcat: Number(w.mdcat) }, { siteName: siteQ.data?.PLATFORM_NAME });
      toast({ title: 'Merit list downloaded', description: `${out.ranked} ranked${out.unranked ? ` · ${out.unranked} not ranked (incomplete marks)` : ''}` });
    } catch (e) {
      toast({ title: 'Could not generate PDF', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };
  const field = (k: keyof typeof w, label: string) => <label className="block text-[11px] font-bold">{label}
    <div className="relative mt-1"><input type="number" min={0} max={100} step="any" value={w[k]} onChange={(e) => setW((p) => ({ ...p, [k]: e.target.value }))} className="h-10 w-full rounded-xl border border-border bg-background pl-3 pr-8 text-sm outline-none focus:border-primary" data-testid={`input-weight-${k}`} /><span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span></div></label>;
  return <div className="mb-4 rounded-2xl border border-border bg-card p-4" data-testid="panel-merit-weights">
    <div className="mb-3 flex items-center gap-2 text-sm font-extrabold"><Scale size={15} className="text-primary" />Merit formula</div>
    <p className="mb-3 text-[11px] text-muted-foreground">Merit = matric % × weight + FSc % × weight + MDCAT % × weight. The PDF ranks every student who has all three results using the percentages below.</p>
    <div className="grid gap-3 sm:grid-cols-4">
      {field('matric', 'Matric weight')}{field('fsc', 'FSc weight')}{field('mdcat', 'MDCAT weight')}
      <div className="flex items-end"><button type="button" disabled={!ok || save.isPending} onClick={() => save.mutate()} className="h-10 w-full rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground disabled:opacity-50" data-testid="button-save-weights">{save.isPending ? 'Saving…' : 'Save weights'}</button></div>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
      <p className={cn('text-[11px] font-semibold', ok ? 'text-muted-foreground' : 'text-destructive')}>Total: {Number.isFinite(sum) ? sum : '—'}% {ok ? '' : '— must add up to 100'}</p>
      <button type="button" disabled={!ok || !rows.length} onClick={generate} className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-xs font-extrabold text-background disabled:opacity-50" data-testid="button-generate-merit-pdf"><FileDown size={14} />Generate merit list (PDF)</button>
    </div>
  </div>;
}

function EditDialog({ row, onClose }: { row: MeritRow; onClose: () => void }) {
  const [v, setV] = useState({
    matricMarks: row.matricMarks ?? '', matricTotal: row.matricTotal ?? '',
    fscMarks: row.fscMarks ?? '', fscTotal: row.fscTotal ?? '',
    mdcatMarks: row.mdcatMarks ?? '', mdcatTotal: row.mdcatTotal ?? 200,
  } as Record<string, string | number>);
  const save = useMutation({
    mutationFn: () => {
      const n = (k: string) => (v[k] === '' ? null : Number(v[k]));
      return meritApi.updateMarks(row.id, { matricMarks: n('matricMarks'), matricTotal: n('matricTotal'), fscMarks: n('fscMarks'), fscTotal: n('fscTotal'), mdcatMarks: n('mdcatMarks'), mdcatTotal: n('mdcatTotal') });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: KEY }); toast({ title: 'Marks updated' }); onClose(); },
    onError: (e: unknown) => toast({ title: 'Could not update marks', description: e instanceof ApiRequestError ? e.message : undefined, variant: 'destructive' }),
  });
  const pair = (label: string, a: string, b: string) => <div><div className="mb-1 text-[11px] font-bold">{label}</div>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <input type="number" min={0} step="any" value={v[a]} onChange={(e) => setV((p) => ({ ...p, [a]: e.target.value }))} placeholder="Marks" aria-label={`${label} marks`} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
      <span className="text-[11px] text-muted-foreground">out of</span>
      <input type="number" min={0} step="any" value={v[b]} onChange={(e) => setV((p) => ({ ...p, [b]: e.target.value }))} placeholder="Total" aria-label={`${label} total`} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
    </div></div>;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose} data-testid="dialog-edit-merit">
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="font-extrabold">Edit marks</h3><p className="text-xs text-muted-foreground">{row.name}</p></div><button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Close"><X size={16} /></button></div>
      <div className="space-y-3">{pair('Matric', 'matricMarks', 'matricTotal')}{pair('FSc', 'fscMarks', 'fscTotal')}{pair('MDCAT', 'mdcatMarks', 'mdcatTotal')}</div>
      <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-xs font-extrabold">Cancel</button><button disabled={save.isPending} onClick={() => save.mutate()} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground disabled:opacity-60" data-testid="button-save-merit-marks">{save.isPending ? 'Saving…' : 'Save'}</button></div>
    </div>
  </div>;
}

function exportCsv(rows: MeritRow[]) {
  const head = ['Rank', 'Name', 'Email', 'Phone', 'Matric marks', 'Matric total', 'Matric %', 'FSc marks', 'FSc total', 'FSc %', 'MDCAT marks', 'MDCAT total', 'MDCAT %', 'Merit %', 'Provisional %'];
  const esc = (x: unknown) => { const t = x == null ? '' : String(x); return /[",\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t; };
  const lines = rows.map((r, i) => [i + 1, r.name, r.email, r.phone, r.matricMarks, r.matricTotal, r.matricPct, r.fscMarks, r.fscTotal, r.fscPct, r.mdcatMarks, r.mdcatTotal, r.mdcatPct, r.merit, r.provisional].map(esc).join(','));
  const url = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'merit-list.csv'; a.click(); URL.revokeObjectURL(url);
}

function AdminMerit() {
  const q = useQuery({ queryKey: KEY, queryFn: meritApi.list });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('merit');
  const [editing, setEditing] = useState<MeritRow | null>(null);

  const all = q.data?.students ?? [];
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = all.filter((r) => (!needle || `${r.name} ${r.email} ${r.phone ?? ''}`.toLowerCase().includes(needle))
      && (filter === 'all' || (filter === 'mdcat' ? r.mdcatMarks != null : r.mdcatMarks == null)));
    const score = (r: MeritRow) => r.merit ?? -1;
    const prov = (r: MeritRow) => r.provisional ?? -1;
    return [...list].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name)
      : sort === 'recent' ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : score(b) - score(a) || prov(b) - prov(a) || a.name.localeCompare(b.name));
  }, [all, search, filter, sort]);

  const withMdcat = all.filter((r) => r.mdcatMarks != null).length;
  const ranked = all.filter((r) => r.merit != null);
  const top = ranked.length ? Math.max(...ranked.map((r) => r.merit as number)) : null;
  const incomplete = all.filter((r) => r.matricMarks == null || r.fscMarks == null).length;
  const kpis: Array<[string, string, typeof Users]> = [
    ['Students', String(all.length), Users], ['MDCAT marks added', `${withMdcat}`, ClipboardCheck],
    ['Missing matric / FSc', String(incomplete), Award], ['Top merit', top == null ? '—' : `${top}%`, Trophy],
  ];

  return <div>
    <SectionHeader eyebrow="Admissions" title="Merit data" action={<button type="button" disabled={!rows.length} onClick={() => exportCsv(rows)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-extrabold hover:bg-muted disabled:opacity-50" data-testid="button-export-merit"><Download size={13} />Export CSV</button>} />
    {q.isLoading ? <SkeletonPage /> : q.isError ? <EmptyState title="Couldn't load merit data" body="Please refresh and try again." /> : <>
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">{kpis.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-border bg-card p-3.5"><div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"><Icon size={11} />{label}</div><div className="mt-1 font-display text-xl">{value}</div></div>)}</div>
      {q.data && <WeightsPanel key={`${q.data.weights.matric}-${q.data.weights.fsc}-${q.data.weights.mdcat}`} weights={q.data.weights} rows={all} />}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-3 text-muted-foreground" size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone…" className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-xs outline-none focus:border-primary" data-testid="input-merit-search" /></div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="h-10 rounded-xl border border-border bg-card px-3 text-xs" data-testid="select-merit-filter"><option value="all">All students</option><option value="mdcat">MDCAT marks added</option><option value="pending">MDCAT pending</option></select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-xl border border-border bg-card px-3 text-xs" data-testid="select-merit-sort"><option value="merit">Sort: Merit rank</option><option value="name">Sort: Name</option><option value="recent">Sort: Newest</option></select>
        <span className="text-[10px] text-muted-foreground">{rows.length} of {all.length}</span>
      </div>
      {rows.length ? <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="bg-muted text-[10px] uppercase tracking-[.12em] text-muted-foreground"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Matric</th><th className="px-4 py-3">FSc</th><th className="px-4 py-3">MDCAT</th><th className="px-4 py-3">Merit</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-border">{rows.map((r, i) => <tr key={r.id} className="hover:bg-muted/30" data-testid={`row-merit-${r.id}`}>
            <td className="px-4 py-3 font-mono-app text-muted-foreground">{sort === 'merit' ? i + 1 : ''}</td>
            <td className="px-4 py-3"><div className="font-bold">{r.name}</div><div className="text-[10px] text-muted-foreground">{r.email}{r.phone ? ` · ${r.phone}` : ''}</div></td>
            <td className="px-4 py-3">{cell(r.matricMarks, r.matricTotal, r.matricPct)}</td>
            <td className="px-4 py-3">{cell(r.fscMarks, r.fscTotal, r.fscPct)}</td>
            <td className="px-4 py-3">{cell(r.mdcatMarks, r.mdcatTotal, r.mdcatPct)}</td>
            <td className="px-4 py-3">{r.merit != null ? <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-extrabold text-primary">{r.merit}%</span> : r.provisional != null ? <span className="text-[11px] italic text-muted-foreground" title="Provisional — matric + FSc only">{r.provisional}% <span className="not-italic">(prov.)</span></span> : <span className="text-muted-foreground">—</span>}</td>
            <td className="px-4 py-3 text-right"><button type="button" onClick={() => setEditing(r)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Edit marks for ${r.name}`} data-testid={`button-edit-merit-${r.id}`}><Pencil size={14} /></button></td>
          </tr>)}</tbody>
        </table>
      </div> : <EmptyState icon={Users} title="No students found" body="Students' marks appear here once they register." />}
    </>}
    {editing && <EditDialog row={editing} onClose={() => setEditing(null)} />}
  </div>;
}

export default AdminMerit;
