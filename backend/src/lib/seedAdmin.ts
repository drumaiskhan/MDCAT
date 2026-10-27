import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { hashPassword } from "./auth";
import { logger } from "./logger";
import { REDACTED_SECRET_PLACEHOLDER } from "./fullBackup";

const DEFAULT_ADMIN_EMAIL = "";
const DEFAULT_ADMIN_PASSWORD = "";

/** Creates the first admin only when both explicit bootstrap credentials are supplied. */
export async function seedDefaultAdmin(): Promise<void> {
  const email = (process.env.DEFAULT_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase().trim();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) return;

  const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.role, "admin"));
  if (existingAdmin) {
    if (existingAdmin.passwordHash === REDACTED_SECRET_PLACEHOLDER) {
      const passwordHash = await hashPassword(password);
      await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, existingAdmin.id));
      logger.info(
        { email: existingAdmin.email },
        "[seed] Restored admin had a redacted password hash — reset it to DEFAULT_ADMIN_EMAIL/DEFAULT_ADMIN_PASSWORD so login works again. Change it from Admin -> Platform settings -> Your account.",
      );
    }
    return;
  }

  const [emailTaken] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (emailTaken) {
    logger.warn({ email }, "[seed] Default admin email is already taken by a non-admin account — skipping admin seed. Create an admin manually via /admin-signup/1.");
    return;
  }

  const passwordHash = await hashPassword(password);
  await db.insert(usersTable).values({
    name: "Admin",
    email,
    passwordHash,
    role: "admin",
    status: "ACTIVE",
    emailVerified: true,
  });

  logger.info({ email }, "[seed] Created default admin account — change its email/password from Admin -> Platform settings -> Your account as soon as you log in.");
}
