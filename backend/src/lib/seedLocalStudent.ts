import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { hashPassword } from './auth';

/** Explicit development-only account; never disables verification on public signup. */
export async function seedLocalStudent() {
  if (process.env.NODE_ENV !== 'development' || process.env.LOCAL_DEMO_ACCOUNT !== '1') return;
  const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return;
  const email = process.env.LOCAL_STUDENT_EMAIL?.trim().toLowerCase();
  const password = process.env.LOCAL_STUDENT_PASSWORD;
  if (!email || !password) return;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) return;
  await db.insert(usersTable).values({ name: 'Local Student', email, passwordHash: await hashPassword(password), role: 'student', status: 'VERIFIED', emailVerified: true });
}
