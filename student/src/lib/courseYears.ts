import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { learningApi } from '@/lib/mdcat-api';

/**
 * FSc years (FSc-I, FSc-II) a student can study, decided by the plan(s) they bought:
 * an FSc-I plan unlocks FSc-I, an FSc-II plan FSc-II, and the Full Course both.
 * The API already hides content of locked years; this hook only drives the
 * year switcher so the student can also see which year their plan doesn't cover.
 */
export interface MyCourseYear { id: number; name: string; unlocked: boolean }
export interface MyCourseYears { allAccess: boolean; years: MyCourseYear[] }

export function useMyCourseYears() {
  return useQuery({
    queryKey: ['my-course-years'],
    queryFn: () => learningApi<MyCourseYears>('/course-years/mine'),
    staleTime: 60_000,
  });
}

// The chosen year is shared by every page (Subjects, Flashcards, Lectures, Notes)
// and remembered between visits. Storage can be unavailable (private mode), so
// every access is wrapped and the value also lives in memory.
const STORAGE_KEY = 'mdcat:selected-course-year';
let selected: number | null = (() => {
  try { const v = Number(window.localStorage.getItem(STORAGE_KEY)); return Number.isInteger(v) && v > 0 ? v : null; } catch { return null; }
})();
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

function setSelected(id: number | null) {
  selected = id;
  try { if (id == null) window.localStorage.removeItem(STORAGE_KEY); else window.localStorage.setItem(STORAGE_KEY, String(id)); } catch { /* storage unavailable */ }
  listeners.forEach((fn) => fn());
}

/**
 * The year the student is currently viewing. Falls back to their first unlocked
 * year (or the first year) when nothing valid is remembered. `years` is empty
 * until loaded, and `showSwitcher` is false when there is only one study year.
 */
export function useSelectedYear() {
  const q = useMyCourseYears();
  const raw = useSyncExternalStore(subscribe, () => selected, () => null);
  const years = useMemo(() => q.data?.years ?? [], [q.data]);
  const current = useMemo(() => {
    const remembered = years.find((y) => y.id === raw);
    return remembered ?? years.find((y) => y.unlocked) ?? years[0] ?? null;
  }, [years, raw]);
  const select = useCallback((id: number) => setSelected(id), []);
  return { years, current, select, isLoading: q.isLoading, showSwitcher: years.length > 1 };
}

/** Subjects/lectures/notes without a year belong to every year. */
export const inYear = (courseYearId: number | null | undefined, year: { id: number; unlocked: boolean } | null) =>
  !year || courseYearId == null || courseYearId === year.id;
