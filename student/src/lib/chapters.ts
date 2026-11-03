import { useQuery } from '@tanstack/react-query';
import { learningApi } from '@/lib/mdcat-api';

export interface Chapter { id: number; subjectId: number; name: string; topicCount: number; questionCount: number; displayOrder?: number }
export interface ChapterTopic { id: number; chapterId?: number | null }

/** Chapters of a subject (Subject → Chapter → Topic). Empty when the subject has none. */
export function useChapters(subjectId?: number | null) {
  return useQuery({
    queryKey: ['chapters', subjectId ?? null],
    queryFn: () => learningApi<Chapter[]>(`/chapters?subjectId=${subjectId}`),
    enabled: !!subjectId,
    staleTime: 60_000,
  });
}

export interface ChapterSection<T> { chapter: Chapter | null; topics: T[] }

/**
 * Splits topics into chapter sections in chapter order. Topics without a chapter
 * (or whose chapter is hidden) land in a trailing `chapter: null` section.
 * Returns a single null-chapter section when the subject has no chapters, so
 * callers can render the old flat list unchanged.
 */
export function groupByChapter<T extends ChapterTopic>(topics: T[], chapters: Chapter[] | undefined): ChapterSection<T>[] {
  const ordered = [...(chapters ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);
  if (!ordered.length) return [{ chapter: null, topics }];
  const known = new Set(ordered.map((c) => c.id));
  const sections: ChapterSection<T>[] = ordered
    .map((chapter) => ({ chapter, topics: topics.filter((t) => t.chapterId === chapter.id) }))
    .filter((s) => s.topics.length);
  const loose = topics.filter((t) => t.chapterId == null || !known.has(t.chapterId));
  if (loose.length) sections.push({ chapter: null, topics: loose });
  return sections;
}
