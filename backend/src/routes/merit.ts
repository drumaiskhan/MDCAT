import { Router, type IRouter } from "express";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, usersTable, auditLogsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { getSetting, setSetting } from "../lib/settings";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Merit-list data.
//
// Matric and FSc marks are collected at registration. MDCAT marks are entered
// by the student later, once they have passed. The admin "Merit data" page
// reads everything back out, one row per student, and computes the merit
// score from the three percentages using admin-configurable weights.
// ---------------------------------------------------------------------------

const DEFAULT_WEIGHTS = { matric: 10, fsc: 40, mdcat: 50 };
const DEFAULT_MDCAT_TOTAL = 200;

async function getWeights() {
  const read = async (key: string, fallback: number) => {
    const raw = await getSetting(key, String(fallback));
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    matric: await read("MERIT_WEIGHT_MATRIC", DEFAULT_WEIGHTS.matric),
    fsc: await read("MERIT_WEIGHT_FSC", DEFAULT_WEIGHTS.fsc),
    mdcat: await read("MERIT_WEIGHT_MDCAT", DEFAULT_WEIGHTS.mdcat),
  };
}

const pct = (marks: number | null, total: number | null): number | null =>
  marks != null && total != null && total > 0 ? (marks / total) * 100 : null;
const round2 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);

type Weights = ReturnType<typeof getWeights> extends Promise<infer W> ? W : never;

export function computeMerit(
  u: { matricMarks: number | null; matricTotal: number | null; fscMarks: number | null; fscTotal: number | null; mdcatMarks: number | null; mdcatTotal: number | null },
  w: Weights,
) {
  const matricPct = pct(u.matricMarks, u.matricTotal);
  const fscPct = pct(u.fscMarks, u.fscTotal);
  const mdcatPct = pct(u.mdcatMarks, u.mdcatTotal);
  const weightSum = w.matric + w.fsc + w.mdcat;
  // Final merit needs all three components. Until the student enters their
  // MDCAT result we still show a provisional score from matric + FSc, with
  // those two weights rescaled to 100 so it is comparable across students.
  let merit: number | null = null;
  if (matricPct != null && fscPct != null && mdcatPct != null && weightSum > 0) {
    merit = (matricPct * w.matric + fscPct * w.fsc + mdcatPct * w.mdcat) / weightSum;
  }
  let provisional: number | null = null;
  const partial = w.matric + w.fsc;
  if (matricPct != null && fscPct != null && partial > 0) {
    provisional = (matricPct * w.matric + fscPct * w.fsc) / partial;
  }
  return { matricPct: round2(matricPct), fscPct: round2(fscPct), mdcatPct: round2(mdcatPct), merit: round2(merit), provisional: round2(provisional) };
}

const markField = z.coerce.number().positive().max(100000);

// ---- Student: read / update own marks -------------------------------------

router.get("/student/marks", requireAuth, async (req, res): Promise<void> => {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!u) { res.status(404).json({ error: "Account not found" }); return; }
  const weights = await getWeights();
  res.json({
    matricMarks: u.matricMarks, matricTotal: u.matricTotal,
    fscMarks: u.fscMarks, fscTotal: u.fscTotal,
    mdcatMarks: u.mdcatMarks, mdcatTotal: u.mdcatTotal ?? DEFAULT_MDCAT_TOTAL,
    mdcatUpdatedAt: u.mdcatUpdatedAt,
    ...computeMerit(u, weights),
  });
});

// Students can only add / update their MDCAT result. Matric and FSc are
// locked after registration so the merit list can't be altered by the student;
// an admin can correct them from the Merit data page.
const StudentMdcatSchema = z.object({
  mdcatMarks: markField,
  mdcatTotal: markField.default(DEFAULT_MDCAT_TOTAL),
}).refine((v) => v.mdcatMarks <= v.mdcatTotal, { message: "MDCAT marks can't be higher than the total", path: ["mdcatMarks"] });

router.patch("/student/marks", requireAuth, async (req, res): Promise<void> => {
  const parsed = StudentMdcatSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid marks" }); return; }
  await db.update(usersTable).set({ mdcatMarks: parsed.data.mdcatMarks, mdcatTotal: parsed.data.mdcatTotal, mdcatUpdatedAt: new Date() }).where(eq(usersTable.id, req.user!.id));
  await db.insert(auditLogsTable).values({ actorId: req.user!.id, action: "MDCAT_MARKS_UPDATED", entity: "user", entityId: req.user!.id });
  res.json({ ok: true });
});

// ---- Admin: everyone's data, collected separately -------------------------

router.get("/admin/merit", requireAdmin, async (_req, res): Promise<void> => {
  const [weights, rows] = await Promise.all([
    getWeights(),
    db.select().from(usersTable).where(and(eq(usersTable.role, "student"), ne(usersTable.status, "DELETED"))),
  ]);
  const students = rows.map((u) => ({
    id: u.id, name: u.name, email: u.email, phone: u.phone, status: u.status,
    matricMarks: u.matricMarks, matricTotal: u.matricTotal,
    fscMarks: u.fscMarks, fscTotal: u.fscTotal,
    mdcatMarks: u.mdcatMarks, mdcatTotal: u.mdcatTotal,
    mdcatUpdatedAt: u.mdcatUpdatedAt, createdAt: u.createdAt,
    ...computeMerit(u, weights),
  }));
  res.json({ weights, students });
});

const WeightsSchema = z.object({
  matric: z.coerce.number().min(0).max(100),
  fsc: z.coerce.number().min(0).max(100),
  mdcat: z.coerce.number().min(0).max(100),
}).refine((w) => Math.abs(w.matric + w.fsc + w.mdcat - 100) < 0.001, { message: "Weights must add up to 100" });

router.put("/admin/merit/weights", requireAdmin, async (req, res): Promise<void> => {
  const parsed = WeightsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid weights" }); return; }
  await setSetting("MERIT_WEIGHT_MATRIC", String(parsed.data.matric));
  await setSetting("MERIT_WEIGHT_FSC", String(parsed.data.fsc));
  await setSetting("MERIT_WEIGHT_MDCAT", String(parsed.data.mdcat));
  res.json({ ok: true, weights: parsed.data });
});

const optionalMark = z.union([z.literal(null), markField]).optional();
const AdminMarksSchema = z.object({
  matricMarks: optionalMark, matricTotal: optionalMark,
  fscMarks: optionalMark, fscTotal: optionalMark,
  mdcatMarks: optionalMark, mdcatTotal: optionalMark,
});

router.patch("/admin/merit/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid student id" }); return; }
  const parsed = AdminMarksSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid marks" }); return; }
  const [u] = await db.select().from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.role, "student")));
  if (!u) { res.status(404).json({ error: "Student not found" }); return; }
  const next = { ...u, ...Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined)) } as typeof u;
  const bad = (m: number | null, t: number | null) => m != null && t != null && m > t;
  if (bad(next.matricMarks, next.matricTotal)) { res.status(400).json({ error: "Matric marks can't be higher than the total" }); return; }
  if (bad(next.fscMarks, next.fscTotal)) { res.status(400).json({ error: "FSc marks can't be higher than the total" }); return; }
  if (bad(next.mdcatMarks, next.mdcatTotal)) { res.status(400).json({ error: "MDCAT marks can't be higher than the total" }); return; }
  await db.update(usersTable).set({
    matricMarks: next.matricMarks, matricTotal: next.matricTotal,
    fscMarks: next.fscMarks, fscTotal: next.fscTotal,
    mdcatMarks: next.mdcatMarks, mdcatTotal: next.mdcatTotal,
    ...(parsed.data.mdcatMarks !== undefined || parsed.data.mdcatTotal !== undefined ? { mdcatUpdatedAt: new Date() } : {}),
  }).where(eq(usersTable.id, id));
  await db.insert(auditLogsTable).values({ actorId: req.user!.id, action: "MERIT_MARKS_EDITED", entity: "user", entityId: id });
  res.json({ ok: true });
});

export default router;
