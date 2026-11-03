// Subjects (module → subjects) and Topics (subject → topics).
// One route component, two views. v43: rebuilt on components/curriculum —
// tilting 3D subject cards, a hero stage with progress, a learning-path topic
// list, search/filter, and proper loading placeholders.
import { StudyNavigation } from '@/components/StudyNavigation';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, BookOpen, SearchX, Target } from 'lucide-react';
import {
  getListModulesQueryKey, getListSubjectsQueryKey, useListModules, useListSubjects, useListTopics,
} from '@/lib/api-client-react';
import { EmptyState, SectionHeader, usePageTitle } from '@/lib/shared';
import { groupByChapter, useChapters } from '@/lib/chapters';
import { inYear, useMyCourseYears, useSelectedYear } from '@/lib/courseYears';
import { LockedYear, YearTabs } from '@/components/curriculum/YearTabs';
import {
  CardsSkeleton, FilterBar, RowsSkeleton, SubjectCard, SubjectsHero, TopicRow, TopicSeg, TopicsHero,
  type SubjectRow, type TopicFilter, type TopicItem,
} from '@/components/curriculum/Curriculum';

const norm = (v: string) => v.trim().toLowerCase();
/** Filters only kick in when a list is long enough for them to be useful. */
const FILTER_MIN = 6;

function TopicsView({ subjectId }: { subjectId?: number }) {
  const topicQ = useListTopics(subjectId ? { subjectId } : undefined);
  const topicsList: TopicItem[] = topicQ.data ?? [];
  // The subject's name/icon isn't in the topics response — fetch the list
  // (shares its cache with other pages) and look it up by id.
  const allSubjectsQ = useListSubjects(undefined, { query: { enabled: subjectId != null, queryKey: getListSubjectsQueryKey() } });
  const subjectRow = allSubjectsQ.data?.find((s) => s.id === subjectId) as SubjectRow | undefined;
  const subjectName = subjectRow?.name;
  usePageTitle(subjectId != null ? `Subjects / ${subjectName ?? '…'}` : undefined);
  const myYearsQ = useMyCourseYears();
  const yearName = myYearsQ.data?.years.find((y) => y.id === subjectRow?.courseYearId)?.name;

  const chaptersQ = useChapters(subjectId);
  const [query, setQuery] = useState('');
  const [seg, setSeg] = useState<TopicFilter>('all');
  const deferredQuery = useDeferredValue(query);

  const done = useMemo(() => topicsList.filter((t) => t.completed).length, [topicsList]);
  const questions = useMemo(() => topicsList.reduce((sum, t) => sum + (t.questionCount || 0), 0), [topicsList]);
  const next = useMemo(() => topicsList.find((t) => !t.completed) ?? null, [topicsList]);
  const visible = useMemo(() => {
    const q = norm(deferredQuery);
    return topicsList.filter((t) => (seg === 'all' || (seg === 'done') === t.completed) && (!q || t.name.toLowerCase().includes(q)));
  }, [topicsList, deferredQuery, seg]);
  const chapterSections = useMemo(() => groupByChapter(visible, chaptersQ.data), [visible, chaptersQ.data]);
  const loading = topicQ.isLoading;

  return <div className="cu-page"><StudyNavigation/>
    <SectionHeader eyebrow="Choose a topic" title="Topics" action={<Link href="/mcqs" className="text-xs font-bold text-primary" data-testid="link-back-modules"><ArrowLeft size={13} className="mr-1 inline" /> MCQs Practice</Link>} />
    {subjectName && <nav aria-label="Where you are" className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted-foreground" data-testid="breadcrumb-curriculum">{yearName && <><span>{yearName}</span><span aria-hidden="true">›</span></>}<Link href="/subjects" className="hover:text-primary">Subjects</Link><span aria-hidden="true">›</span><span className="text-foreground">{subjectName}</span></nav>}
    {subjectName
      ? <TopicsHero name={subjectName} iconUrl={subjectRow?.iconUrl} total={topicsList.length} done={done} questions={questions} next={next} />
      : subjectId != null && <div className="skeleton cu-skel-hero" aria-hidden="true" />}
    {loading ? <RowsSkeleton /> : <>
      {topicsList.length >= FILTER_MIN && <FilterBar query={query} onQuery={setQuery} placeholder="Search topics">
        <TopicSeg value={seg} onChange={setSeg} counts={{ all: topicsList.length, todo: topicsList.length - done, done }} />
      </FilterBar>}
      {topicsList.length > 0 && visible.length > 0 && (chapterSections.length === 1 && !chapterSections[0].chapter
        ? <ul className="cu-path" data-testid="list-topics">
          {visible.map((t, i) => <TopicRow key={t.id} topic={t} index={i} isNext={t.id === next?.id} />)}
        </ul>
        : <div className="space-y-6" data-testid="list-chapters">
          {chapterSections.map((sec) => {
            const sectionDone = sec.topics.filter((t) => t.completed).length;
            const sectionQuestions = sec.topics.reduce((n, t) => n + (t.questionCount || 0), 0);
            return <section key={sec.chapter?.id ?? 'none'} aria-label={sec.chapter?.name ?? 'Other topics'}>
              <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-1">
                <h3 className="text-sm font-bold" data-testid={`heading-chapter-${sec.chapter?.id ?? 'none'}`}>{sec.chapter?.name ?? 'Other topics'}</h3>
                <span className="text-[11px] font-semibold text-muted-foreground">{sectionDone}/{sec.topics.length} topics done · {sectionQuestions} question{sectionQuestions === 1 ? '' : 's'}</span>
              </header>
              <ul className="cu-path">
                {sec.topics.map((t) => <TopicRow key={t.id} topic={t} index={visible.indexOf(t)} isNext={t.id === next?.id} />)}
              </ul>
            </section>;
          })}
        </div>)}
      {topicsList.length > 0 && visible.length === 0 && <EmptyState icon={SearchX} title="No matching topics" body="Try a different word, or switch back to All." />}
      {!topicsList.length && <EmptyState icon={Target} title="No topics yet" body="Your academic team hasn't published topics for this subject yet." />}
    </>}
  </div>;
}

function SubjectsView({ moduleId }: { moduleId?: number }) {
  const subjectQ = useListSubjects();
  // Year > Subject: the API already returns only the years the student's plan covers;
  // the tabs pick which of them to browse (FSc-I and FSc-II stay separate).
  const { current: year, showSwitcher } = useSelectedYear();
  const allSubjects: SubjectRow[] = (subjectQ.data as SubjectRow[] | undefined) ?? [];
  const subjects = useMemo(() => allSubjects.filter((s) => inYear(s.courseYearId, year)), [allSubjects, year]);
  const modulesQ = useListModules(undefined, { query: { enabled: moduleId != null, queryKey: getListModulesQueryKey() } });
  const moduleName = modulesQ.data?.find((m) => m.id === moduleId)?.name;
  usePageTitle(moduleId != null ? `Modules / ${moduleName ?? '…'}` : undefined);

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const totalTopics = useMemo(() => subjects.reduce((sum, s) => sum + (s.topicCount || 0), 0), [subjects]);
  const visible = useMemo(() => {
    const q = norm(deferredQuery);
    return q ? subjects.filter((s) => s.name.toLowerCase().includes(q)) : subjects;
  }, [subjects, deferredQuery]);
  const loading = subjectQ.isLoading;

  return <div className="cu-page"><StudyNavigation/>
    <SectionHeader eyebrow="Curriculum map" title="Subjects" action={<Link href="/mcqs" className="text-xs font-bold text-primary" data-testid="link-subjects-back"><ArrowLeft size={13} className="mr-1 inline" /> MCQs Practice</Link>} />
    <YearTabs className="mb-4" />
    {showSwitcher && year && !year.unlocked ? <LockedYear name={year.name} /> : <>
    {!loading && subjects.length > 0 && <SubjectsHero title="Choose a subject" subjects={subjects} totalTopics={totalTopics} />}
    {loading ? <CardsSkeleton /> : <>
      {subjects.length >= FILTER_MIN && <FilterBar query={query} onQuery={setQuery} placeholder="Search subjects" />}
      {visible.length > 0 && <div className="cu-grid-cards" data-testid="grid-subjects">
        {visible.map((s, i) => <SubjectCard key={s.id} subject={s} index={i} />)}
      </div>}
      {subjects.length > 0 && visible.length === 0 && <EmptyState icon={SearchX} title="No matching subjects" body="Try a different word." />}
      {!subjects.length && <EmptyState icon={BookOpen} title="No subjects yet" body="Your academic team hasn't published subjects yet." />}
    </>}
    </>}
  </div>;
}

function Subjects({ topics = false }: { topics?: boolean }) {
  const params = useParams<{ id?: string }>();
  // On /subjects/:id the :id is a subject id (topics view); on /modules/:id
  // it's a module id (subjects view). The same route element is reused by the
  // router, so each view is keyed — its filter/search state must not leak from
  // one subject (or from Subjects into Topics) into the next.
  const routeId = Number(params.id) || undefined;
  return topics
    ? <TopicsView key={`topics-${routeId ?? 'all'}`} subjectId={routeId} />
    : <SubjectsView key={`subjects-${routeId ?? 'all'}`} moduleId={undefined} />;
}

export default Subjects;
