import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chapterAdminApi, subjectAdminApi, topicAdminApi } from '@/lib/api';
import { useStudyYears } from '@/lib/shared-parts/courseYears';

/**
 * Where a question (or any piece of study content) lives:
 *   FSc Year  >  Subject  >  Chapter  >  Topic
 * Year and Chapter narrow the lists below them; the topic is the final home.
 * Subjects with no FSc year are listed under every year, and a subject with no
 * chapters simply lists all of its topics.
 */
export function useCurriculumPicker() {
  const [yearId, setYearId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  const { years } = useStudyYears();
  const subjectsQ = useQuery({ queryKey: ['admin-flat-subjects'], queryFn: () => subjectAdminApi.list() });
  const chaptersQ = useQuery({ queryKey: ['admin-chapters', subjectId], queryFn: () => chapterAdminApi.list(Number(subjectId)), enabled: !!subjectId });
  const topicsQ = useQuery({ queryKey: ['admin-topics', Number(subjectId)], queryFn: () => topicAdminApi.list(Number(subjectId)), enabled: !!subjectId });

  const allSubjects = subjectsQ.data ?? [];
  const subjects = yearId ? allSubjects.filter((s) => s.courseYearId == null || String(s.courseYearId) === yearId) : allSubjects;
  const chapters = [...(chaptersQ.data ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);
  const allTopics = topicsQ.data ?? [];
  const topics = chapters.length && chapterId ? allTopics.filter((t) => String(t.chapterId ?? '') === chapterId) : allTopics;

  // Picking a subject also fixes the FSc year when the subject belongs to one.
  useEffect(() => {
    const s = allSubjects.find((x) => String(x.id) === subjectId);
    if (s?.courseYearId != null && String(s.courseYearId) !== yearId) setYearId(String(s.courseYearId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, subjectsQ.data]);

  const moduleId = String(allSubjects.find((s) => String(s.id) === subjectId)?.moduleId ?? '');
  const ready = !!subjectId && !!topicId;
  return {
    yearId, subjectId, chapterId, topicId, moduleId, ready, years, subjects, chapters, topics,
    setYearId: (v: string) => { setYearId(v); setSubjectId(''); setChapterId(''); setTopicId(''); },
    setSubjectId: (v: string) => { setSubjectId(v); setChapterId(''); setTopicId(''); },
    setChapterId: (v: string) => { setChapterId(v); setTopicId(''); },
    setTopicId,
  };
}

export type CurriculumPickerState = ReturnType<typeof useCurriculumPicker>;

const selectCls = 'h-10 rounded-xl border border-border bg-card px-3 text-xs disabled:opacity-50';

/** `upTo` stops the cascade early for forms that only need a year and subject (e.g. notes). */
export function CurriculumSelects({ picker, testIdPrefix = 'curriculum', upTo = 'topic' }: { picker: CurriculumPickerState; testIdPrefix?: string; upTo?: 'subject' | 'topic' }) {
  const p = picker;
  const noChapters = !!p.subjectId && p.chapters.length === 0;
  return <div className={upTo === 'subject' ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
    <select value={p.yearId} onChange={(e) => p.setYearId(e.target.value)} className={selectCls} data-testid={`select-${testIdPrefix}-year`}>
      <option value="">All FSc years</option>
      {p.years.filter((y) => y.active || String(y.id) === p.yearId).map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
    </select>
    <select value={p.subjectId} onChange={(e) => p.setSubjectId(e.target.value)} className={selectCls} data-testid={`select-${testIdPrefix}-subject`}>
      <option value="">Select subject</option>
      {p.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
    {upTo === 'topic' && <>
    <select value={p.chapterId} onChange={(e) => p.setChapterId(e.target.value)} disabled={!p.subjectId || noChapters} className={selectCls} data-testid={`select-${testIdPrefix}-chapter`}>
      <option value="">{noChapters ? 'No chapters in this subject' : 'All chapters'}</option>
      {p.chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
    <select value={p.topicId} onChange={(e) => p.setTopicId(e.target.value)} disabled={!p.subjectId} className={selectCls} data-testid={`select-${testIdPrefix}-topic`}>
      <option value="">Select topic</option>
      {p.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
    </>}
  </div>;
}

interface SubjectLike { id: number; name: string; courseYearId?: number | null }

/**
 * FSc year + subject pair for pages that only need a subject (Chapters, Topics ...):
 * the year narrows the subject list, and picking a subject shows its year.
 */
export function YearSubjectSelect({ subjects, value, onChange, className = '', testIdPrefix = 'subject-picker' }: { subjects: SubjectLike[]; value: string; onChange: (subjectId: string) => void; className?: string; testIdPrefix?: string }) {
  const { years } = useStudyYears();
  const [yearSel, setYearSel] = useState('');
  const subjectYear = String(subjects.find((s) => String(s.id) === value)?.courseYearId ?? '');
  const year = yearSel || subjectYear;
  const shown = year ? subjects.filter((s) => s.courseYearId == null || String(s.courseYearId) === year) : subjects;
  const cls = `h-10 w-full rounded-xl border border-border bg-card px-3 text-sm ${className}`;
  return <div className="grid gap-3 sm:grid-cols-2">
    <label className="block text-sm font-semibold">FSc year
      <select aria-label="FSc year" className={`${cls} mt-2`} value={year} onChange={(e) => { setYearSel(e.target.value); onChange(''); }} data-testid={`select-${testIdPrefix}-year`}>
        <option value="">All FSc years</option>
        {years.filter((y) => y.active || String(y.id) === year).map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
      </select>
    </label>
    <label className="block text-sm font-semibold">Subject
      <select aria-label="Subject" className={`${cls} mt-2`} value={value} onChange={(e) => { const s = subjects.find((x) => String(x.id) === e.target.value); if (s?.courseYearId != null) setYearSel(String(s.courseYearId)); onChange(e.target.value); }} data-testid={`select-${testIdPrefix}-subject`}>
        <option value="">Choose subject</option>
        {shown.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
  </div>;
}
