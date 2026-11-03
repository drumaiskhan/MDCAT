import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookMarked, ChevronRight } from 'lucide-react';
import { chapterAdminApi } from '@/lib/api';

interface TopicLike { id: number; chapterId?: number | null }

function Group({ label, meta, children, muted }: { label: string; meta: string; children: ReactNode; muted?: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className={`rounded-lg border ${muted ? 'border-dashed' : ''} border-border bg-card`}>
    <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold">
      <ChevronRight size={13} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      <BookMarked size={13} className="text-primary" />
      <span className="flex-1">{label}</span>
      <span className="text-[10px] font-normal text-muted-foreground">{meta}</span>
    </button>
    {open && <div className="space-y-2 border-t border-border p-3">{children}</div>}
  </div>;
}

/**
 * Renders a subject's topics grouped under their chapters
 * (Subject → Chapter → Topic). With no chapters it renders the topics flat,
 * exactly like before chapters existed.
 */
export function ChapterGroups<T extends TopicLike>({ subjectId, topics, itemCount, renderTopic }: {
  subjectId: number; topics: T[]; itemCount: (topicId: number) => number; renderTopic: (topic: T) => ReactNode;
}) {
  const { data } = useQuery({ queryKey: ['admin-chapters', String(subjectId)], queryFn: () => chapterAdminApi.list(subjectId) });
  const chapters = [...(data ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);
  if (!chapters.length) return <>{topics.map(renderTopic)}</>;
  const known = new Set(chapters.map((c) => c.id));
  const loose = topics.filter((t) => t.chapterId == null || !known.has(t.chapterId));
  const total = (list: T[]) => list.reduce((n, t) => n + itemCount(t.id), 0);
  const meta = (list: T[]) => `${list.length} topic${list.length === 1 ? '' : 's'} · ${total(list)} item${total(list) === 1 ? '' : 's'}`;
  return <>
    {chapters.map((c) => {
      const inside = topics.filter((t) => t.chapterId === c.id);
      return <Group key={c.id} label={c.name} meta={meta(inside)}>
        {inside.length ? inside.map(renderTopic) : <p className="text-[11px] text-muted-foreground">No topics in this chapter yet.</p>}
      </Group>;
    })}
    {!!loose.length && <Group label="No chapter" meta={meta(loose)} muted>{loose.map(renderTopic)}</Group>}
  </>;
}
