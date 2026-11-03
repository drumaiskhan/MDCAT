import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowDown, ArrowUp, BookMarked, ChevronRight, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { chapterAdminApi, subjectAdminApi, topicAdminApi, type AdminChapter, type AdminTopic } from '@/lib/api';

const field = 'w-full rounded-xl border border-border bg-background p-3 text-sm';

// Chapters sit between a subject and its topics (Subject → Chapter → Topic).
// This page manages the chapters of one subject and shows the topics filed
// under each, so the whole branch can be reviewed in one place.
export default function AdminChapters() {
  const qc = useQueryClient();
  const subjects = useQuery({ queryKey: ['admin-flat-subjects'], queryFn: () => subjectAdminApi.list() });
  const [subjectId, setSubjectId] = useState('');
  const chaptersQ = useQuery({ queryKey: ['admin-chapters', subjectId], queryFn: () => chapterAdminApi.list(Number(subjectId)), enabled: !!subjectId });
  const topicsQ = useQuery({ queryKey: ['admin-flat-topics', subjectId], queryFn: () => topicAdminApi.list(Number(subjectId)), enabled: !!subjectId });
  const [name, setName] = useState('');
  const [bulk, setBulk] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const chapters = useMemo(() => [...(chaptersQ.data ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id), [chaptersQ.data]);
  const topicsByChapter = useMemo(() => {
    const map = new Map<number | null, AdminTopic[]>();
    for (const t of topicsQ.data ?? []) map.set(t.chapterId ?? null, [...(map.get(t.chapterId ?? null) ?? []), t]);
    return map;
  }, [topicsQ.data]);
  const unfiled = topicsByChapter.get(null) ?? [];

  async function run(work: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await work(); await qc.invalidateQueries(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  const resetForm = () => { setName(''); setEditing(null); };

  const save = () => run(async () => {
    const value = name.trim();
    if (!value || !subjectId) return;
    if (editing) await chapterAdminApi.update(editing, { name: value });
    else await chapterAdminApi.create({ subjectId: Number(subjectId), name: value });
    resetForm(); setMessage('Saved.');
  });

  const addBulk = () => run(async () => {
    const seen = new Set(chapters.map((c) => c.name.toLowerCase()));
    const names = [...new Set(bulk.split('\n').map((n) => n.trim()).filter(Boolean))].filter((n) => !seen.has(n.toLowerCase()));
    let added = 0;
    try { for (const n of names) { await chapterAdminApi.create({ subjectId: Number(subjectId), name: n }); added++; } }
    catch (e) { setMessage(`${added} chapters saved before an error: ${(e as Error).message}`); return; }
    setBulk(''); setMessage(`${added} chapter${added === 1 ? '' : 's'} added.${names.length < bulk.split('\n').filter((l) => l.trim()).length ? ' Duplicates were skipped.' : ''}`);
  });

  const remove = (c: AdminChapter) => {
    if (!confirm(`Delete chapter "${c.name}"? Its ${c.topicCount} topic${c.topicCount === 1 ? '' : 's'} (and their questions) are kept and move to "No chapter".`)) return;
    void run(async () => { await chapterAdminApi.remove(c.id); });
  };

  const move = (c: AdminChapter, direction: number) => run(async () => {
    const sorted = [...chapters];
    const from = sorted.findIndex((r) => r.id === c.id); const to = from + direction;
    if (to < 0 || to >= sorted.length) return;
    [sorted[from], sorted[to]] = [sorted[to], sorted[from]];
    for (const [displayOrder, item] of sorted.entries()) if (item.displayOrder !== displayOrder) await chapterAdminApi.update(item.id, { displayOrder });
  });

  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));
  const subjectName = subjects.data?.find((s) => String(s.id) === subjectId)?.name;

  return <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Curriculum</p>
      <h1 className="mt-2 text-3xl font-bold">Chapters</h1>
      <p className="mt-2 text-muted-foreground">Organise each subject into chapters, then file topics under them. MCQs, flashcards and lectures follow their topic.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <Link href="/admin/subjects" className="rounded-xl border px-4 py-2 text-sm">Subjects</Link>
      <Link href="/admin/chapters" className="rounded-xl border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">Chapters</Link>
      <Link href="/admin/topics" className="rounded-xl border px-4 py-2 text-sm">Topics</Link>
    </div>

    <label className="block text-sm font-semibold">Subject
      <select className={field + ' mt-2'} value={subjectId} onChange={(e) => { setSubjectId(e.target.value); resetForm(); setMessage(''); }} aria-label="Subject">
        <option value="">Choose subject</option>
        {subjects.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>

    {subjectId && <>
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-bold">{editing ? 'Rename' : 'Add'} chapter</h2>
        <input aria-label="Chapter name" className={field} placeholder="e.g. Chapter 1 — Cell structure and function" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void save(); }} />
        <div className="flex gap-2">
          <button disabled={busy || !name.trim()} onClick={() => void save()} className="rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
          {editing && <button onClick={resetForm} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button>}
        </div>
      </section>
      <details className="rounded-2xl border bg-card p-5">
        <summary className="cursor-pointer font-bold">Add multiple chapters</summary>
        <textarea aria-label="Chapters, one per line" className={field + ' mt-4 h-32'} placeholder="One chapter per line" value={bulk} onChange={(e) => setBulk(e.target.value)} />
        <button disabled={busy || !bulk.trim()} onClick={() => void addBulk()} className="mt-3 rounded-xl bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">Add chapters</button>
      </details>
    </>}

    <p role="status" className="text-sm">{message}</p>
    {(subjects.error || chaptersQ.error || topicsQ.error) && <p role="alert" className="text-sm text-destructive">{((subjects.error || chaptersQ.error || topicsQ.error) as Error).message}</p>}

    {!subjectId && <p className="py-8 text-center text-muted-foreground">Select a subject to manage its chapters.</p>}
    {subjectId && (chaptersQ.isLoading || topicsQ.isLoading) && <p className="text-sm text-muted-foreground">Loading…</p>}

    {subjectId && !chaptersQ.isLoading && <div className="space-y-3" aria-label={`Chapters of ${subjectName ?? 'subject'}`}>
      {chapters.map((c, i) => {
        const key = String(c.id); const rows = topicsByChapter.get(c.id) ?? []; const isOpen = !!open[key];
        return <div key={c.id} className="rounded-xl border bg-card">
          <div className="flex items-center gap-3 p-4">
            <button type="button" onClick={() => toggle(key)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${c.name}`} className="text-muted-foreground"><ChevronRight size={18} className={isOpen ? 'rotate-90 transition-transform' : 'transition-transform'} /></button>
            <BookMarked size={20} className="text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.topicCount} topic{c.topicCount === 1 ? '' : 's'} · {c.questionCount} question{c.questionCount === 1 ? '' : 's'}</p>
            </div>
            <button disabled={busy || i === 0} aria-label={'Move up ' + c.name} onClick={() => void move(c, -1)}><ArrowUp size={16} /></button>
            <button disabled={busy || i === chapters.length - 1} aria-label={'Move down ' + c.name} onClick={() => void move(c, 1)}><ArrowDown size={16} /></button>
            <button aria-label={'Rename ' + c.name} onClick={() => { setEditing(c.id); setName(c.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={16} /></button>
            <button disabled={busy} aria-label={'Delete ' + c.name} onClick={() => remove(c)} className="text-destructive"><Trash2 size={16} /></button>
          </div>
          {isOpen && <ul className="space-y-1 border-t px-4 py-3 pl-14 text-sm">
            {rows.length ? rows.map((t) => <li key={t.id} className="flex justify-between gap-3"><span>{t.name}</span><span className="text-xs text-muted-foreground">{t.questionCount} questions</span></li>)
              : <li className="text-muted-foreground">No topics yet — <Link href="/admin/topics" className="text-primary underline">add topics</Link>.</li>}
          </ul>}
        </div>;
      })}
      {!chapters.length && <p className="py-6 text-center text-muted-foreground">No chapters yet. Add the first one above.</p>}

      {!!unfiled.length && <div className="rounded-xl border border-dashed bg-card">
        <button type="button" onClick={() => toggle('none')} aria-expanded={!!open.none} className="flex w-full items-center gap-3 p-4 text-left">
          <ChevronRight size={18} className={open.none ? 'rotate-90 text-muted-foreground transition-transform' : 'text-muted-foreground transition-transform'} />
          <FolderOpen size={20} className="text-muted-foreground" />
          <div className="flex-1"><p className="font-bold">No chapter</p><p className="text-xs text-muted-foreground">{unfiled.length} topic{unfiled.length === 1 ? '' : 's'} not filed under a chapter yet</p></div>
        </button>
        {open.none && <ul className="space-y-1 border-t px-4 py-3 pl-14 text-sm">{unfiled.map((t) => <li key={t.id} className="flex justify-between gap-3"><span>{t.name}</span><span className="text-xs text-muted-foreground">{t.questionCount} questions</span></li>)}
          <li className="pt-2"><Link href="/admin/topics" className="text-primary underline">Move them into chapters</Link></li></ul>}
      </div>}
    </div>}
  </div>;
}
