import { useMemo, useState } from 'react';
import { YearSubjectSelect } from '@/components/CurriculumPicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowDown, ArrowUp, FileText, Pencil, Trash2 } from 'lucide-react';
import { chapterAdminApi, subjectAdminApi, topicAdminApi, type AdminTopic } from '@/lib/api';

const field = 'w-full rounded-xl border border-border bg-background p-3 text-sm';
const NONE = 'none'; // filter value: topics not filed under any chapter

// Topics of one subject, grouped by chapter (Subject → Chapter → Topic).
export default function AdminTopics() {
  const qc = useQueryClient();
  const subjects = useQuery({ queryKey: ['admin-flat-subjects'], queryFn: () => subjectAdminApi.list() });
  const [subjectId, setSubjectId] = useState('');
  const chaptersQ = useQuery({ queryKey: ['admin-chapters', subjectId], queryFn: () => chapterAdminApi.list(Number(subjectId)), enabled: !!subjectId });
  const topicsQ = useQuery({ queryKey: ['admin-flat-topics', subjectId], queryFn: () => topicAdminApi.list(Number(subjectId)), enabled: !!subjectId });
  const [filter, setFilter] = useState(''); // '' = all, NONE = no chapter, else chapter id
  const [chapterId, setChapterId] = useState(''); // chapter for new topics
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [bulk, setBulk] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [moveTo, setMoveTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const chapters = useMemo(() => [...(chaptersQ.data ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id), [chaptersQ.data]);
  const chapterName = (id?: number | null) => chapters.find((c) => c.id === id)?.name;
  const all = topicsQ.data ?? [];
  const inFilter = (t: AdminTopic) => filter === '' || (filter === NONE ? t.chapterId == null : String(t.chapterId) === filter);
  const rows = all.filter((t) => inFilter(t) && t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);
  const countIn = (f: string) => all.filter((t) => (f === NONE ? t.chapterId == null : String(t.chapterId) === f)).length;
  const toId = (v: string) => (v && v !== NONE ? Number(v) : null);

  async function run(work: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await work(); } catch (e) { setMessage((e as Error).message); } finally { await qc.invalidateQueries(); setBusy(false); }
  }
  const reset = () => { setName(''); setEditing(null); };
  const pickSubject = (v: string) => { setSubjectId(v); setFilter(''); setChapterId(''); setPicked([]); reset(); setMessage(''); };
  const pickFilter = (v: string) => { setFilter(v); setPicked([]); if (v && v !== NONE) setChapterId(v); };

  const save = () => run(async () => {
    const value = name.trim(); if (!value || !subjectId) return;
    if (editing) await topicAdminApi.update(editing, { name: value });
    else await topicAdminApi.create({ subjectId: Number(subjectId), chapterId: toId(chapterId), name: value });
    reset(); setMessage('Saved.');
  });

  const addBulk = () => run(async () => {
    const seen = new Set(all.map((t) => t.name.toLowerCase()));
    const names = [...new Set(bulk.split('\n').map((n) => n.trim()).filter(Boolean))].filter((n) => !seen.has(n.toLowerCase()));
    let added = 0;
    try { for (const n of names) { await topicAdminApi.create({ subjectId: Number(subjectId), chapterId: toId(chapterId), name: n }); added++; } }
    catch (e) { setMessage(`${added} topics saved before an error: ${(e as Error).message}`); return; }
    setBulk(''); setMessage(`${added} topic${added === 1 ? '' : 's'} added${chapterName(toId(chapterId)) ? ` to ${chapterName(toId(chapterId))}` : ''}.`);
  });

  const remove = (t: AdminTopic) => { if (confirm(`Delete ${t.name}? Existing questions will need reassignment.`)) void run(async () => { await topicAdminApi.remove(t.id); }); };
  const moveOne = (t: AdminTopic, value: string) => run(async () => { await topicAdminApi.move([t.id], toId(value)); });
  const moveMany = () => run(async () => { const r = await topicAdminApi.move(picked, toId(moveTo)); setPicked([]); setMoveTo(''); setMessage(`${r.moved} topic${r.moved === 1 ? '' : 's'} moved.`); });

  const reorder = (t: AdminTopic, direction: number) => run(async () => {
    const from = rows.findIndex((r) => r.id === t.id); const to = from + direction;
    if (to < 0 || to >= rows.length) return;
    const sorted = [...rows]; [sorted[from], sorted[to]] = [sorted[to], sorted[from]];
    // Reuse the existing display-order slots so topics outside this filter keep their place.
    const slots = rows.map((r) => r.displayOrder ?? 0).sort((a, b) => a - b);
    const distinct = new Set(slots).size === slots.length ? slots : sorted.map((_, i) => i);
    for (const [i, item] of sorted.entries()) if (item.displayOrder !== distinct[i]) await topicAdminApi.update(item.id, { displayOrder: distinct[i] });
  });

  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground'}`;
  const allPicked = rows.length > 0 && rows.every((r) => picked.includes(r.id));

  return <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Curriculum</p>
      <h1 className="mt-2 text-3xl font-bold">Topics</h1>
      <p className="mt-2 text-muted-foreground">Choose a subject, pick a chapter, then add or move its topics.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <Link href="/admin/subjects" className="rounded-xl border px-4 py-2 text-sm">Subjects</Link>
      <Link href="/admin/chapters" className="rounded-xl border px-4 py-2 text-sm">Chapters</Link>
      <Link href="/admin/topics" className="rounded-xl border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">Topics</Link>
    </div>

    <YearSubjectSelect subjects={subjects.data ?? []} value={subjectId} onChange={pickSubject} testIdPrefix="topics" />

    {subjectId && <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by chapter">
        <button className={chip(filter === '')} onClick={() => pickFilter('')}>All ({all.length})</button>
        {chapters.map((c) => <button key={c.id} className={chip(filter === String(c.id))} onClick={() => pickFilter(String(c.id))}>{c.name} ({countIn(String(c.id))})</button>)}
        <button className={chip(filter === NONE)} onClick={() => pickFilter(NONE)}>No chapter ({countIn(NONE)})</button>
        {!chapters.length && !chaptersQ.isLoading && <Link href="/admin/chapters" className="px-2 py-1.5 text-xs text-primary underline">Create chapters first</Link>}
      </div>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-bold">{editing ? 'Rename' : 'Add'} topic</h2>
        <input aria-label="Topic name" className={field} placeholder="e.g. Cell membrane" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void save(); }} />
        {!editing && <label className="block text-sm font-semibold">Chapter
          <select aria-label="Chapter for new topics" className={field + ' mt-2'} value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
            <option value="">No chapter</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>}
        <div className="flex gap-2">
          <button disabled={busy || !name.trim()} onClick={() => void save()} className="rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
          {editing && <button onClick={reset} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button>}
        </div>
      </section>

      <details className="rounded-2xl border bg-card p-5">
        <summary className="cursor-pointer font-bold">Add multiple topics{chapterName(toId(chapterId)) ? ` to ${chapterName(toId(chapterId))}` : ''}</summary>
        <textarea aria-label="Topics, one per line" className={field + ' mt-4 h-32'} placeholder="One topic per line" value={bulk} onChange={(e) => setBulk(e.target.value)} />
        <p className="mt-2 text-xs text-muted-foreground">Topics are added to the chapter chosen in the form above.</p>
        <button disabled={busy || !bulk.trim()} onClick={() => void addBulk()} className="mt-3 rounded-xl bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">Add topics</button>
      </details>
    </>}

    <p role="status" className="text-sm">{message}</p>
    {(subjects.error || topicsQ.error || chaptersQ.error) && <p role="alert" className="text-sm text-destructive">{((subjects.error || topicsQ.error || chaptersQ.error) as Error).message}</p>}

    {subjectId && <>
      <input className={field} aria-label="Search topics" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {!!rows.length && <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? [] : rows.map((r) => r.id))} /> Select all shown</label>
        {!!picked.length && <>
          <span className="text-muted-foreground">{picked.length} selected</span>
          <select aria-label="Move selected to chapter" className="rounded-lg border bg-background p-2" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
            <option value="">Move to…</option><option value={NONE}>No chapter</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button disabled={busy || !moveTo} onClick={() => void moveMany()} className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50">Move</button>
        </>}
      </div>}
    </>}

    <div className="space-y-3">
      {rows.map((t, i) => <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <input type="checkbox" aria-label={'Select ' + t.name} checked={picked.includes(t.id)} onChange={() => setPicked((p) => p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id])} />
        <FileText size={20} className="text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.questionCount} questions · {chapterName(t.chapterId) ?? 'No chapter'}</p>
        </div>
        <select aria-label={'Chapter of ' + t.name} className="max-w-44 rounded-lg border bg-background p-2 text-xs" disabled={busy} value={t.chapterId ?? ''} onChange={(e) => void moveOne(t, e.target.value || NONE)}>
          <option value="">No chapter</option>
          {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button disabled={busy || !!search || i === 0} aria-label={'Move up ' + t.name} onClick={() => void reorder(t, -1)}><ArrowUp size={16} /></button>
        <button disabled={busy || !!search || i === rows.length - 1} aria-label={'Move down ' + t.name} onClick={() => void reorder(t, 1)}><ArrowDown size={16} /></button>
        <button aria-label={'Rename ' + t.name} onClick={() => { setEditing(t.id); setName(t.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={16} /></button>
        <button disabled={busy} aria-label={'Delete ' + t.name} onClick={() => remove(t)} className="text-destructive"><Trash2 size={16} /></button>
      </div>)}
      {!rows.length && <p className="py-8 text-center text-muted-foreground">{!subjectId ? 'Select a subject to see its topics.' : topicsQ.isLoading ? 'Loading…' : 'No topics here yet.'}</p>}
    </div>
  </div>;
}
