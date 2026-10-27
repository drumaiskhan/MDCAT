// Profile → Account: the student's merit inputs. Matric and FSc come from
// registration and are read-only here; MDCAT marks are entered by the student
// once they have passed, and can be updated any time afterwards.
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Pencil, Check, Award } from 'lucide-react';
import { marksApi, ApiRequestError } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const fmt = (m: number | null, t: number | null) => (m == null || t == null ? 'Not added' : `${m} / ${t}`);
const fmtPct = (p: number | null) => (p == null ? '' : `${p}%`);

export function MeritMarksCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['my-marks'], queryFn: marksApi.get });
  const [editing, setEditing] = useState(false);
  const [marks, setMarks] = useState('');
  const [total, setTotal] = useState('200');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!q.data) return;
    setMarks(q.data.mdcatMarks != null ? String(q.data.mdcatMarks) : '');
    setTotal(String(q.data.mdcatTotal ?? 200));
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => marksApi.saveMdcat({ mdcatMarks: Number(marks), mdcatTotal: Number(total) }),
    onSuccess: () => { setEditing(false); setError(null); qc.invalidateQueries({ queryKey: ['my-marks'] }); toast({ title: 'MDCAT marks saved' }); },
    onError: (err: unknown) => setError(err instanceof ApiRequestError ? err.message : 'Could not save your marks. Please try again.'),
  });

  const submit = () => {
    const m = Number(marks), t = Number(total);
    if (!marks || !(m > 0)) return setError('Enter your MDCAT marks.');
    if (!(t > 0)) return setError('Enter the total MDCAT marks.');
    if (m > t) return setError("MDCAT marks can't be higher than the total.");
    setError(null);
    save.mutate();
  };

  const d = q.data;
  const rows: Array<[string, string, string]> = d ? [
    ['Matric', fmt(d.matricMarks, d.matricTotal), fmtPct(d.matricPct)],
    ['FSc', fmt(d.fscMarks, d.fscTotal), fmtPct(d.fscPct)],
    ['MDCAT', fmt(d.mdcatMarks, d.mdcatMarks == null ? null : d.mdcatTotal), fmtPct(d.mdcatPct)],
  ] : [];

  return <div className="rounded-2xl border border-border bg-card p-6" data-testid="card-merit-marks">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><GraduationCap size={18} /></span><div><h3 className="font-bold">Merit marks</h3><p className="text-xs text-muted-foreground">Used to calculate your merit position.</p></div></div>
      {d && !editing && <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold hover:bg-muted" data-testid="button-edit-mdcat"><Pencil size={13} />{d.mdcatMarks == null ? 'Add MDCAT marks' : 'Update MDCAT'}</button>}
    </div>

    {q.isLoading && <p className="mt-5 text-xs text-muted-foreground">Loading…</p>}
    {q.isError && <p className="mt-5 text-xs font-semibold text-destructive">Couldn't load your marks.</p>}

    {d && <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {rows.map(([label, value, pct]) => <div key={label} className="rounded-xl border border-border bg-background p-4">
        <div className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</div>
        <div className="mt-2 text-sm font-extrabold">{value}</div>
        <div className="mt-0.5 h-4 text-[11px] font-bold text-primary">{pct}</div>
      </div>)}
    </div>}

    {d && editing && <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
      <div className="text-xs font-bold">MDCAT result</div>
      <div className="mt-2 grid grid-cols-[1fr_auto_.8fr] items-center gap-2">
        <input type="number" inputMode="decimal" min={0} step="any" value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="Marks obtained" aria-label="MDCAT marks obtained" className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-mdcat-marks" />
        <span className="text-[11px] font-semibold text-muted-foreground">out of</span>
        <input type="number" inputMode="decimal" min={1} step="any" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Total" aria-label="MDCAT total marks" className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-mdcat-total" />
      </div>
      {error && <p className="mt-2 text-[11px] font-semibold text-destructive" data-testid="text-mdcat-error">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={save.isPending} onClick={submit} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground disabled:opacity-60" data-testid="button-save-mdcat"><Check size={14} />{save.isPending ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={() => { setEditing(false); setError(null); }} className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-extrabold">Cancel</button>
      </div>
    </div>}

    {d && !editing && d.mdcatMarks == null && <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground"><Award size={14} className="mt-0.5 shrink-0 text-primary" />Passed MDCAT? Add your marks so they count towards your merit score.</p>}
    {d && d.merit != null && <p className="mt-4 text-xs font-bold" data-testid="text-merit-score">Merit score: <span className="text-primary">{d.merit}%</span></p>}
  </div>;
}
