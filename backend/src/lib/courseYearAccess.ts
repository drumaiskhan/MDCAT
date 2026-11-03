import { and, eq, gt, inArray, isNotNull, or } from "drizzle-orm";
import { db, usersTable, membershipsTable, membershipPlansTable, courseYearsTable } from "@workspace/db";

/**
 * Plan-based FSc year access.
 *
 * Course years are created by an admin on the Membership plans page
 * (FSc-I, FSc-II, Full Course ...). A plan lists the course year(s) it is
 * sold for, and a student may study a year's content only while a purchased,
 * unexpired plan covers it:
 *   - an FSc-I plan unlocks FSc-I only, an FSc-II plan FSc-II only;
 *   - a "Full Course" plan (or any plan that ticks both years) unlocks both;
 *   - a plan with no course years is open to every year.
 *
 * `null` means "no restriction" (every year); an array is the exact set of
 * allowed course-year ids (it may be empty).
 */
export type CourseYearAccess = number[] | null;

/** A course year that stands for "all the real years" (e.g. "Full Course"). */
export function isBundleCourseYearName(name: string): boolean {
  return /\b(full|both|combined|complete|whole)\b/i.test(name);
}

interface YearInfo { contentIds: number[]; bundleIds: Set<number> }

async function loadYearInfo(): Promise<YearInfo> {
  const rows = await db.select({ id: courseYearsTable.id, name: courseYearsTable.name, active: courseYearsTable.active }).from(courseYearsTable);
  const bundleIds = new Set(rows.filter((r) => isBundleCourseYearName(r.name)).map((r) => r.id));
  return { contentIds: rows.filter((r) => !bundleIds.has(r.id) && r.active).map((r) => r.id), bundleIds };
}

/** Expands "Full Course"-style bundle years into the real years they cover. */
function expand(ids: number[], info: YearInfo, into: Set<number>) {
  for (const id of ids) {
    into.add(id);
    if (info.bundleIds.has(id)) info.contentIds.forEach((c) => into.add(c));
  }
  // Holding every real year also satisfies content tagged with the bundle itself.
  if (info.contentIds.length && info.contentIds.every((c) => into.has(c))) info.bundleIds.forEach((b) => into.add(b));
}

/** Batch resolver: three queries however many students are asked about. */
export async function resolveCourseYearAccessMap(userIds: number[]): Promise<Map<number, CourseYearAccess>> {
  const result = new Map<number, CourseYearAccess>();
  if (!userIds.length) return result;
  const now = new Date();
  const [info, users, memberships] = await Promise.all([
    loadYearInfo(),
    db.select({ id: usersTable.id, courseYearId: usersTable.courseYearId }).from(usersTable).where(inArray(usersTable.id, userIds)),
    // Purchased, unexpired plans. A newer purchase marks the older ACTIVE row
    // SUPERSEDED, so superseded rows that came from a payment still count
    // (FSc-I now, FSc-II later = both). Admin-assigned changes carry no
    // payment and replace the old plan outright.
    db.select({ userId: membershipsTable.userId, status: membershipsTable.status, paymentId: membershipsTable.paymentId, planId: membershipsTable.planId, courseYearIds: membershipPlansTable.courseYearIds })
      .from(membershipsTable)
      .leftJoin(membershipPlansTable, eq(membershipPlansTable.id, membershipsTable.planId))
      .where(and(
        inArray(membershipsTable.userId, userIds),
        gt(membershipsTable.expiresAt, now),
        isNotNull(membershipsTable.planId),
        or(eq(membershipsTable.status, "ACTIVE"), and(eq(membershipsTable.status, "SUPERSEDED"), isNotNull(membershipsTable.paymentId))),
      )),
  ]);

  const byUser = new Map<number, typeof memberships>();
  // A membership whose plan row no longer exists grants nothing (course_year_ids is NOT NULL, so null = missing plan).
  for (const m of memberships) if (m.courseYearIds !== null) byUser.set(m.userId, [...(byUser.get(m.userId) ?? []), m]);

  for (const user of users) {
    const plans = byUser.get(user.id) ?? [];
    if (plans.length) {
      // A plan with no course years is open to every year.
      if (plans.some((p) => !(p.courseYearIds ?? []).length)) { result.set(user.id, null); continue; }
      const set = new Set<number>();
      for (const p of plans) expand(p.courseYearIds ?? [], info, set);
      result.set(user.id, [...set]);
      continue;
    }
    // No purchased plan (trial, expired, not yet approved): fall back to the
    // year picked at signup. Students with none on file predate course years
    // and stay unrestricted, same as before.
    if (user.courseYearId != null) {
      const set = new Set<number>();
      expand([user.courseYearId], info, set);
      result.set(user.id, [...set]);
    } else {
      result.set(user.id, null);
    }
  }
  return result;
}

export async function resolveCourseYearAccess(userId: number): Promise<CourseYearAccess> {
  const map = await resolveCourseYearAccessMap([userId]);
  return map.has(userId) ? map.get(userId)! : null;
}

/** Real (non-bundle) course years, for pickers and the student year switcher. */
export async function contentCourseYears() {
  const rows = await db.select().from(courseYearsTable).orderBy(courseYearsTable.displayOrder, courseYearsTable.id);
  return rows.filter((r) => !isBundleCourseYearName(r.name)).map((r) => ({ id: r.id, name: r.name, active: r.active, displayOrder: r.displayOrder }));
}
