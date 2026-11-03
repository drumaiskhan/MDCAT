import { useQuery } from '@tanstack/react-query';
import { chapterAdminApi } from '@/lib/api';

interface TopicLike { id: number; name: string; chapterId?: number | null }

/**
 * <option>s for a topic <select>, grouped by chapter (Subject → Chapter → Topic).
 * Topics without a chapter are listed first; a subject with no chapters renders
 * a plain flat list exactly as before.
 */
export function TopicOptions({ subjectId, topics }: { subjectId: string | number | null | undefined; topics: TopicLike[] }) {
  const sid = subjectId ? Number(subjectId) : 0;
  const { data: chapters } = useQuery({ queryKey: ['admin-chapters', String(sid)], queryFn: () => chapterAdminApi.list(sid), enabled: sid > 0 });
  const opt = (t: TopicLike) => <option key={t.id} value={t.id}>{t.name}</option>;
  const ordered = [...(chapters ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);
  const known = new Set(ordered.map((c) => c.id));
  const loose = topics.filter((t) => t.chapterId == null || !known.has(t.chapterId));
  return <>
    {loose.map(opt)}
    {ordered.map((c) => {
      const inside = topics.filter((t) => t.chapterId === c.id);
      return inside.length ? <optgroup key={c.id} label={c.name}>{inside.map(opt)}</optgroup> : null;
    })}
  </>;
}
