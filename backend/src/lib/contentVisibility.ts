import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db, usersTable, programsTable, academicYearsTable, modulesTable, blocksTable, notificationsTable, courseYearsTable } from "@workspace/db";
import { resolveCourseYearAccess, resolveCourseYearAccessMap } from "./courseYearAccess";

export interface StudentTargeting {
  programKind: string | null;
  yearNumber: number | null;
  /** The student's FSc course year (med_course_years.id) picked at signup, if any. */
  courseYearId?: number | null;
  /** FSc years this student may study, derived from the plan(s) they bought
   * (see courseYearAccess.ts). null = every year; undefined = not resolved,
   * in which case the signup course year above is used. */
  courseYearIds?: number[] | null;
}

/** FSc course-year gate shared by every content type. An empty/missing list
 * means "every course year"; otherwise the student must be filed under one
 * of the listed course years (a combined FSc-I + FSc-II item lists both). */
export function courseYearAllows(courseYearIds: number[] | null | undefined, targeting: StudentTargeting): boolean {
  const ids = courseYearIds ?? [];
  if (!ids.length) return true;
  if (targeting.courseYearIds === null) return true;
  if (targeting.courseYearIds !== undefined) return ids.some((id) => targeting.courseYearIds!.includes(id));
  return targeting.courseYearId != null && ids.includes(targeting.courseYearId);
}

/** Looks up a student's normalized program kind (e.g. "MDCAT") and year
 * number (1-5) from their academic placement. Returns nulls if the student
 * hasn't been assigned a program/year yet — they'll only see globally
 * targeted content until an admin (or their own profile) sets these. */
export async function getStudentTargeting(userId: number): Promise<StudentTargeting> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return { programKind: null, yearNumber: null, courseYearId: null, courseYearIds: [] };

  const [program] = user.programId ? await db.select().from(programsTable).where(eq(programsTable.id, user.programId)) : [];
  const [academicYear] = user.academicYearId ? await db.select().from(academicYearsTable).where(eq(academicYearsTable.id, user.academicYearId)) : [];

  return {
    programKind: program?.kind ? program.kind.trim().toUpperCase() : null,
    yearNumber: academicYear?.yearNumber ?? null,
    courseYearId: user.courseYearId ?? null,
    courseYearIds: await resolveCourseYearAccess(userId),
  };
}

/** Returns the IDs of every active module visible to a student with this
 * targeting. A module with a null programTargetKind/yearTargetNumber is
 * visible to everyone on that axis; a module targeting a specific
 * kind/year is only visible to matching students. */
export async function getVisibleModuleIds(targeting: StudentTargeting): Promise<number[]> {
  const rows = await db
    .select({ id: modulesTable.id, blockId: modulesTable.blockId, courseYearIds: modulesTable.courseYearIds })
    .from(modulesTable)
    .where(and(
      eq(modulesTable.active, true),
      or(isNull(modulesTable.programTargetKind), targeting.programKind ? eq(modulesTable.programTargetKind, targeting.programKind) : isNull(modulesTable.programTargetKind)),
      or(isNull(modulesTable.yearTargetNumber), targeting.yearNumber !== null ? eq(modulesTable.yearTargetNumber, targeting.yearNumber) : isNull(modulesTable.yearTargetNumber)),
    ));
  // FSc course years: a module's own list wins; an empty list inherits its
  // block's, so tagging a Block FSc-I also hides the modules inside it.
  const blockRows = await db.select({ id: blocksTable.id, courseYearIds: blocksTable.courseYearIds }).from(blocksTable);
  const blockYears = new Map(blockRows.map((b) => [b.id, b.courseYearIds ?? []]));
  return rows
    .filter((r) => courseYearAllows((r.courseYearIds ?? []).length ? r.courseYearIds : (r.blockId != null ? blockYears.get(r.blockId) : []), targeting))
    .map((r) => r.id);
}

/** Generic version of the null-means-everyone matching logic GET /modules
 * already did inline above, factored out so every other content type with
 * the same programTargetKind/yearTargetNumber pair (Blocks, Past papers —
 * see their routes) can reuse the exact same rule instead of re-deriving a
 * subtly different one per route. Null on either axis always passes that
 * axis; a set value only passes for a student whose own targeting matches
 * it exactly. */
export function isTargetVisible(programTargetKind: string | null, yearTargetNumber: number | null, targeting: StudentTargeting, courseYearIds?: number[] | null): boolean {
  const programOk = !programTargetKind || (targeting.programKind !== null && targeting.programKind === programTargetKind);
  const yearOk = !yearTargetNumber || (targeting.yearNumber !== null && targeting.yearNumber === yearTargetNumber);
  return programOk && yearOk && courseYearAllows(courseYearIds, targeting);
}

/** Blocks equivalent of getVisibleModuleIds — was previously missing
 * entirely, which is why GET /blocks (medschool.ts) used to show every
 * block to every student regardless of its own programTargetKind/
 * yearTargetNumber (a block's targeting only ever affected the admin
 * badge, never actual visibility). */
export async function getVisibleBlockIds(targeting: StudentTargeting): Promise<number[]> {
  const rows = await db
    .select({ id: blocksTable.id, programTargetKind: blocksTable.programTargetKind, yearTargetNumber: blocksTable.yearTargetNumber, courseYearIds: blocksTable.courseYearIds })
    .from(blocksTable)
    .where(eq(blocksTable.active, true));
  return rows.filter((r) => isTargetVisible(r.programTargetKind, r.yearTargetNumber, targeting, r.courseYearIds)).map((r) => r.id);
}

/** Human-readable summary of a module's targeting, for admin UI badges. */
export function describeModuleTargeting(programTargetKind: string | null, yearTargetNumber: number | null): string {
  const programLabel = programTargetKind || "All Programs";
  const yearLabel = yearTargetNumber ? `${yearTargetNumber}${["th", "st", "nd", "rd"][yearTargetNumber % 10 > 3 || Math.floor(yearTargetNumber % 100 / 10) === 1 ? 0 : yearTargetNumber % 10]} Year` : "All Years";
  return `${programLabel} + ${yearLabel}`;
}

/** Looks up course-year names (e.g. "FSc-I") for admin badges. */
export async function courseYearNames(ids: number[] | null | undefined): Promise<string[]> {
  const list = ids ?? [];
  if (!list.length) return [];
  const rows = await db.select({ id: courseYearsTable.id, name: courseYearsTable.name }).from(courseYearsTable).where(inArray(courseYearsTable.id, list));
  const byId = new Map(rows.map((r) => [r.id, r.name]));
  return list.map((id) => byId.get(id)).filter((n): n is string => !!n);
}

/** Notifies every student whose own program/year matches the given
 * targeting (same null-means-everyone rule as isTargetVisible above) —
 * used to auto-notify the same audience a piece of content (a past paper,
 * a published exam) is actually visible to, so "who gets notified" can
 * never drift out of sync with "who can see it". Mirrors the resolution
 * logic in POST /admin/notifications/broadcast (medschool.ts) but as a
 * shared helper so other routes can fire the same kind of targeted
 * notification without duplicating the student/program/year lookup.
 * Returns the number of students notified (0 if nobody currently matches
 * that program/year — not an error, just nobody to reach yet). */
export async function notifyTargetedStudents(
  programTargetKind: string | null,
  yearTargetNumber: number | null,
  title: string,
  body: string,
  type: "info" | "success" | "warning" = "info",
  courseYearIds: number[] = [],
): Promise<number> {
  const normalizedKind = programTargetKind ? programTargetKind.trim().toUpperCase() : null;

  // Untargeted content (visible to every program/year) reaches everyone —
  // use the same userId=NULL "visible to everyone" convention the manual
  // broadcast uses, instead of inserting one row per student.
  if (!normalizedKind && !yearTargetNumber && !courseYearIds.length) {
    await db.insert(notificationsTable).values({ userId: null, title, body, type });
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "student"));
    return Number(count ?? 0);
  }

  const students = await db.select({ id: usersTable.id, programId: usersTable.programId, academicYearId: usersTable.academicYearId, courseYearId: usersTable.courseYearId }).from(usersTable).where(eq(usersTable.role, "student"));
  const programs = await db.select().from(programsTable);
  const academicYears = await db.select().from(academicYearsTable);
  const programKindById = new Map(programs.map((p) => [p.id, p.kind ? p.kind.trim().toUpperCase() : null]));
  const yearNumberById = new Map(academicYears.map((y) => [y.id, y.yearNumber]));

  const accessByUser = courseYearIds.length ? await resolveCourseYearAccessMap(students.map((s) => s.id)) : new Map<number, number[] | null>();
  const targetIds = students
    .filter((s) => {
      const kind = s.programId ? programKindById.get(s.programId) ?? null : null;
      const year = s.academicYearId ? yearNumberById.get(s.academicYearId) ?? null : null;
      const access = accessByUser.get(s.id) ?? null;
      const courseOk = !courseYearIds.length || access === null || courseYearIds.some((id) => access.includes(id));
      return (!normalizedKind || kind === normalizedKind) && (!yearTargetNumber || year === yearTargetNumber) && courseOk;
    })
    .map((s) => s.id);

  if (!targetIds.length) return 0;
  await db.insert(notificationsTable).values(targetIds.map((userId) => ({ userId, title, body, type })));
  return targetIds.length;
}
