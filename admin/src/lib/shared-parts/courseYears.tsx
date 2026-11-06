import { useQuery } from '@tanstack/react-query';
import { courseYearsApi, type CourseYear } from '@/lib/api';
import { cn } from './ui';

// FSc course years (FSc-I, FSc-II ...) are created on the Membership plans
// page. Any piece of learning content can be limited to one or more of them
// with this picker; leaving every box unticked means "every course year".
// Shares its query key with that page so both stay in sync.
export const COURSE_YEARS_QUERY_KEY = ['course-years', 'admin'] as const;

/** "Full Course" / "Both years" style entries bundle the real years; they are plan
 * options, never a place to file content. Mirrors the API's isBundleCourseYearName. */
export const isBundleYearName = (name: string) => /\b(full|both|combined|complete|whole)\b/i.test(name);

export function useCourseYears() {
  const q = useQuery({ queryKey: COURSE_YEARS_QUERY_KEY, queryFn: courseYearsApi.list });
  const years: CourseYear[] = q.data ?? [];
  const nameOf = (id: number) => years.find((c) => c.id === id)?.name ?? `#${id}`;
  return { years, nameOf, isLoading: q.isLoading };
}

/** The real study years (FSc-I, FSc-II ...) that content can be filed under. */
export function useStudyYears() {
  const { years, ...rest } = useCourseYears();
  return { years: years.filter((y) => !isBundleYearName(y.name)), ...rest };
}

export function CourseYearPicker({ value, onChange, testIdPrefix = 'course-year', className, label = 'FSc year', requiredHint = false }: { value: number[]; onChange: (ids: number[]) => void; testIdPrefix?: string; className?: string; label?: string; requiredHint?: boolean }) {
  const { years, isLoading } = useCourseYears();
  const shown = years.filter((c) => c.active || value.includes(c.id));
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return <div className={cn('text-xs', className)} data-testid={`field-${testIdPrefix}`}>
    <div className="mb-1.5 block text-[11px] font-bold text-muted-foreground">{label}</div>
    <div className="flex flex-wrap gap-2">
      {shown.map((c) => <label key={c.id} className={cn('inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold', value.includes(c.id) ? 'border-primary bg-primary/15' : 'border-border bg-card')}>
        <input type="checkbox" checked={value.includes(c.id)} onChange={() => toggle(c.id)} data-testid={`checkbox-${testIdPrefix}-${c.id}`} />{c.name}
      </label>)}
      {!isLoading && !shown.length && <span className="text-[11px] text-muted-foreground">No FSc years yet — add them on the Membership plans page.</span>}
    </div>
    <p className="mt-1 text-[10px] text-muted-foreground">{value.length ? 'Only students registered under the ticked FSc year(s) will see this.' : requiredHint ? 'Tick at least one year.' : 'Nothing ticked = shown to every FSc year.'}</p>
  </div>;
}

export function CourseYearBadges({ ids, className }: { ids?: number[] | null; className?: string }) {
  const { nameOf } = useCourseYears();
  if (!ids?.length) return null;
  return <>{ids.map((id) => <span key={id} className={cn('rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold text-primary', className)} data-testid={`badge-course-year-${id}`}>{nameOf(id)}</span>)}</>;
}
