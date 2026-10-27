import { pool, db, institutionsTable, programsTable, academicYearsTable, blocksTable, modulesTable, subjectsTable, platformSettingsTable } from '@workspace/db';
import { eq, sql } from 'drizzle-orm';

export async function ensureMdcatSchema() {
 const statements = [
 `CREATE TABLE IF NOT EXISTS mdcat_flashcard_state(user_id integer NOT NULL REFERENCES med_users(id) ON DELETE CASCADE,flashcard_id integer NOT NULL REFERENCES med_flashcards(id) ON DELETE CASCADE,learned boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,flashcard_id))`,
 `CREATE TABLE IF NOT EXISTS mdcat_lectures (id serial PRIMARY KEY,title text NOT NULL,description text NOT NULL DEFAULT '',instructor text NOT NULL DEFAULT '',subject_id integer NOT NULL REFERENCES med_subjects(id),topic_id integer REFERENCES med_topics(id),kind text NOT NULL CHECK(kind IN ('recorded','live')),url text NOT NULL,thumbnail_url text NOT NULL DEFAULT '',starts_at timestamptz,ends_at timestamptz,duration_minutes integer NOT NULL DEFAULT 0,published boolean NOT NULL DEFAULT false,is_free boolean NOT NULL DEFAULT false,state text NOT NULL DEFAULT 'scheduled',display_order integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
 `CREATE TABLE IF NOT EXISTS mdcat_lecture_progress (user_id integer NOT NULL REFERENCES med_users(id) ON DELETE CASCADE,lecture_id integer NOT NULL REFERENCES mdcat_lectures(id) ON DELETE CASCADE,seconds double precision NOT NULL DEFAULT 0,completed boolean NOT NULL DEFAULT false,joined_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,lecture_id))`,

 `CREATE TABLE IF NOT EXISTS mdcat_notes (id serial PRIMARY KEY, subject_id integer NOT NULL UNIQUE REFERENCES med_subjects(id), title text NOT NULL, html text NOT NULL, published boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now())`,
 `CREATE TABLE IF NOT EXISTS mdcat_note_state (user_id integer NOT NULL REFERENCES med_users(id) ON DELETE CASCADE, note_id integer NOT NULL REFERENCES mdcat_notes(id) ON DELETE CASCADE, state jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,note_id))`,
 `CREATE TABLE IF NOT EXISTS mdcat_book_marks (id uuid PRIMARY KEY, user_id integer NOT NULL REFERENCES med_users(id) ON DELETE CASCADE, book_id integer NOT NULL REFERENCES med_books(id) ON DELETE CASCADE, file_key text NOT NULL, page integer NOT NULL CHECK(page>0), kind text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
 `CREATE INDEX IF NOT EXISTS mdcat_book_marks_owner ON mdcat_book_marks(user_id,book_id,file_key)`,
 `CREATE TABLE IF NOT EXISTS mdcat_book_progress (user_id integer NOT NULL REFERENCES med_users(id) ON DELETE CASCADE, book_id integer NOT NULL REFERENCES med_books(id) ON DELETE CASCADE, file_key text NOT NULL, page integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,book_id,file_key))`
 ];
 for (const statement of statements) await pool.query(statement);
}

// Opt-in bootstrap for a NEW database; never overwrite an existing curriculum.
export async function seedMdcat() {
 if (process.env.MDCAT_BOOTSTRAP !== '1') return;
 await db.transaction(async (tx) => {
 await tx.execute(sql`SELECT pg_advisory_xact_lock(72833104)`);
 const [done] = await tx.select().from(platformSettingsTable).where(eq(platformSettingsTable.key,'MDCAT_BOOTSTRAPPED'));
 if (done) return;
 const [existing] = await tx.select().from(modulesTable).limit(1);
 if (existing) throw new Error('MDCAT bootstrap requires an empty curriculum. Use a separate database.');
 const [institution] = await tx.insert(institutionsTable).values({name:'Independent MDCAT preparation',kind:'MDCAT',city:'Pakistan'}).returning();
 const [program] = await tx.insert(programsTable).values({institutionId:institution.id,name:'MDCAT',kind:'MDCAT'}).returning();
 await tx.insert(academicYearsTable).values({programId:program.id,label:'MDCAT Preparation',yearNumber:1});
 const [storage] = await tx.insert(modulesTable).values({name:'__mdcat_curriculum__',subtitle:'Internal curriculum storage'}).returning();
 for (const [index,name] of ['Biology','Chemistry','Physics','English','Logical Reasoning'].entries()) {
  await tx.insert(subjectsTable).values({moduleId:storage.id,name,displayOrder:index});
 }
 for (const [key,value] of Object.entries({PLATFORM_TAGLINE:'Your path to medical college starts here.',THEME_PRIMARY:'#087F78',THEME_SECONDARY:'#DCEEE5',THEME_ACCENT:'#F2A084',MDCAT_BOOTSTRAPPED:'1'})) {
  await tx.insert(platformSettingsTable).values({key,value}).onConflictDoNothing();
 }
 });
}
