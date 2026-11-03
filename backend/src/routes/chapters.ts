import { Router, type IRouter } from "express";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, chaptersTable, topicsTable, subjectsTable, mcqsTable, auditLogsTable } from "@workspace/db";
import { requireAuth, requireAdmin, isAdminRole } from "../middlewares/auth";
import { getStudentTargeting, getVisibleModuleIds } from "../lib/contentVisibility";

// Chapters: Subject → Chapter → Topic. A chapter only groups topics; MCQs,
// flashcards and lectures stay on their topic and inherit the chapter from it (a lecture may also be filed directly under a chapter).
const router: IRouter = Router();

type ChapterRow = typeof chaptersTable.$inferSelect;
async function shape(rows: ChapterRow[], published: boolean) {
  const topicCount = new Map<number, number>();
  const questionCount = new Map<number, number>();
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    const topics = await db.select({ id: topicsTable.id, chapterId: topicsTable.chapterId }).from(topicsTable)
      .where(and(inArray(topicsTable.chapterId, ids), eq(topicsTable.archived, false)));
    const chapterOf = new Map<number, number>();
    for (const t of topics) { if (t.chapterId == null) continue; chapterOf.set(t.id, t.chapterId); topicCount.set(t.chapterId, (topicCount.get(t.chapterId) ?? 0) + 1); }
    if (topics.length) {
      const counts = await db.select({ topicId: mcqsTable.topicId, count: sql<number>`count(*)` }).from(mcqsTable)
        .where(and(inArray(mcqsTable.topicId, topics.map((t) => t.id)), published ? eq(mcqsTable.status, "published") : undefined))
        .groupBy(mcqsTable.topicId);
      for (const c of counts) { const ch = c.topicId == null ? undefined : chapterOf.get(c.topicId); if (ch != null) questionCount.set(ch, (questionCount.get(ch) ?? 0) + Number(c.count)); }
    }
  }
  return rows.map((r) => ({
    id: r.id, subjectId: r.subjectId, name: r.name, active: r.active, displayOrder: r.displayOrder,
    topicCount: topicCount.get(r.id) ?? 0, questionCount: questionCount.get(r.id) ?? 0,
  }));
}

router.get("/chapters", requireAuth, async (req, res): Promise<void> => {
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
  if (subjectId !== undefined && !Number.isInteger(subjectId)) { res.status(400).json({ error: "Invalid subjectId" }); return; }
  const admin = isAdminRole(req.user!.role);
  let subjectFilter: number[] | null = null;
  if (!admin) {
    const visibleModules = await getVisibleModuleIds(await getStudentTargeting(req.user!.id));
    const visible = visibleModules.length
      ? await db.select({ id: subjectsTable.id }).from(subjectsTable).where(and(inArray(subjectsTable.moduleId, visibleModules), eq(subjectsTable.archived, false)))
      : [];
    subjectFilter = visible.map((s) => s.id);
    if (subjectId !== undefined && !subjectFilter.includes(subjectId)) { res.json([]); return; }
    if (!subjectFilter.length) { res.json([]); return; }
  }
  const rows = await db.select().from(chaptersTable).where(and(
    eq(chaptersTable.archived, false),
    admin ? undefined : eq(chaptersTable.active, true),
    subjectId !== undefined ? eq(chaptersTable.subjectId, subjectId) : undefined,
    subjectFilter ? inArray(chaptersTable.subjectId, subjectFilter) : undefined,
  )).orderBy(asc(chaptersTable.displayOrder), asc(chaptersTable.id));
  res.json(await shape(rows, !admin));
});

router.post("/chapters", requireAdmin, async (req, res): Promise<void> => {
  const parsed = z.object({ subjectId: z.number().int().positive(), name: z.string().trim().min(1), displayOrder: z.number().int().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "subjectId and chapter name are required" }); return; }
  const [subject] = await db.select().from(subjectsTable).where(and(eq(subjectsTable.id, parsed.data.subjectId), eq(subjectsTable.archived, false)));
  if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }
  const [dupe] = await db.select({ id: chaptersTable.id }).from(chaptersTable)
    .where(and(eq(chaptersTable.subjectId, subject.id), eq(chaptersTable.archived, false), sql`lower(${chaptersTable.name}) = lower(${parsed.data.name})`));
  if (dupe) { res.status(409).json({ error: `"${parsed.data.name}" already exists in ${subject.name}` }); return; }
  let displayOrder = parsed.data.displayOrder;
  if (displayOrder === undefined) {
    const [{ maxOrder } = { maxOrder: null }] = await db.select({ maxOrder: sql<number | null>`max(${chaptersTable.displayOrder})` }).from(chaptersTable).where(eq(chaptersTable.subjectId, subject.id));
    displayOrder = (maxOrder ?? -1) + 1;
  }
  const [row] = await db.insert(chaptersTable).values({ subjectId: subject.id, name: parsed.data.name, displayOrder }).returning();
  await db.insert(auditLogsTable).values({ actorId: req.user!.id, action: "CHAPTER_CREATED", entity: "chapter", entityId: row.id });
  res.status(201).json((await shape([row], false))[0]);
});

router.patch("/chapters/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = z.object({ name: z.string().trim().min(1).optional(), active: z.boolean().optional(), displayOrder: z.number().int().optional() }).safeParse(req.body);
  if (!parsed.success || !Number.isInteger(id)) { res.status(400).json({ error: "Invalid chapter" }); return; }
  const [row] = await db.update(chaptersTable).set(parsed.data).where(and(eq(chaptersTable.id, id), eq(chaptersTable.archived, false))).returning();
  if (!row) { res.status(404).json({ error: "Chapter not found" }); return; }
  res.json((await shape([row], false))[0]);
});

// Deleting a chapter never deletes content: its topics (and their MCQs,
// flashcards and lectures) simply become "No chapter" within the same subject.
router.delete("/chapters/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid chapter" }); return; }
  const [row] = await db.update(chaptersTable).set({ active: false, archived: true }).where(eq(chaptersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Chapter not found" }); return; }
  await db.update(topicsTable).set({ chapterId: null }).where(eq(topicsTable.chapterId, id));
  await db.insert(auditLogsTable).values({ actorId: req.user!.id, action: "CHAPTER_DELETED", entity: "chapter", entityId: id });
  res.json({ ok: true });
});

// Move several topics into a chapter (or out of one, chapterId = null) at once.
router.post("/topics/move", requireAdmin, async (req, res): Promise<void> => {
  const parsed = z.object({ topicIds: z.array(z.number().int().positive()).min(1).max(500), chapterId: z.number().int().positive().nullable() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "topicIds and chapterId are required" }); return; }
  const topics = await db.select().from(topicsTable).where(inArray(topicsTable.id, parsed.data.topicIds));
  if (parsed.data.chapterId !== null) {
    const [chapter] = await db.select().from(chaptersTable).where(and(eq(chaptersTable.id, parsed.data.chapterId), eq(chaptersTable.archived, false)));
    if (!chapter) { res.status(404).json({ error: "Chapter not found" }); return; }
    if (topics.some((t) => t.subjectId !== chapter.subjectId)) { res.status(400).json({ error: "Topics can only move to a chapter of their own subject" }); return; }
  }
  if (topics.length) await db.update(topicsTable).set({ chapterId: parsed.data.chapterId }).where(inArray(topicsTable.id, topics.map((t) => t.id)));
  res.json({ ok: true, moved: topics.length });
});

export default router;
