import { Link } from 'wouter';
import { Lock } from 'lucide-react';
import { useSelectedYear } from '@/lib/courseYears';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/**
 * FSc-I / FSc-II switcher: the first level of Year > Subject > Chapter > Topic.
 * Years the student's plan doesn't cover stay visible with a lock, so it is
 * clear why their content is missing and how to get it.
 */
export function YearTabs({ className }: { className?: string }) {
  const { years, current, select, showSwitcher } = useSelectedYear();
  if (!showSwitcher) return null;
  return <div className={cx('flex flex-wrap items-center gap-2', className)} role="tablist" aria-label="FSc year" data-testid="tabs-course-year">
    {years.map((y) => <button key={y.id} type="button" role="tab" aria-selected={current?.id === y.id} onClick={() => select(y.id)}
      className={cx('inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-colors', current?.id === y.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted')}
      data-testid={`tab-course-year-${y.id}`}>
      {!y.unlocked && <Lock size={12} aria-hidden="true" />}{y.name}
    </button>)}
  </div>;
}

/** Shown in place of a year's content when the student's plan doesn't include that year. */
export function LockedYear({ name }: { name: string }) {
  return <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center" data-testid="panel-locked-year">
    <Lock size={22} className="mx-auto text-muted-foreground" aria-hidden="true" />
    <h3 className="mt-3 text-base font-extrabold">{name} isn't part of your plan</h3>
    <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">Your current plan doesn't include {name}. Choose a plan that covers it (or the Full Course) to unlock its subjects, chapters and topics.</p>
    <Link href="/payments" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground" data-testid="link-view-plans">View plans</Link>
  </div>;
}
