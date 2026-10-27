import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { pool, db, subjectsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin, requireMembershipFor, isAdminRole } from '../middlewares/auth';
import { resolveBookAccess } from '../lib/bookAccess';
import { loadBook, fileKeyOf, cachedBookPath } from '../lib/bookReader';
import { getStudentTargeting, getVisibleModuleIds } from '../lib/contentVisibility';
const router = Router();
const id = z.coerce.number().int().positive();
const q = async (text: string, args: unknown[] = []) => (await pool.query(text, args)).rows as any[];

async function bookAccess(req: Request, res: Response) {
 const parsed = id.safeParse(req.params.id);
 if (!parsed.success) { res.status(400).json({error:'Invalid book'}); return null; }
 const access = await resolveBookAccess(req.user!, parsed.data);
 if (!access.ok) {res.status(access.status).json({error:access.error});return null;}
 res.set('Cache-Control','private, no-store');
 return {...access.book, fileKey:fileKeyOf(access.book.storagePath)};
}
router.get('/books/:id', requireAuth, async (req,res) => {
 const b = await bookAccess(req,res); if (!b) return;
 const loaded = await loadBook(b.storagePath);
 res.json({id:String(b.id),title:b.title,author:b.author || '',description:'',yearId:'1',category:'MDCAT',published:b.active,isFree:b.isFree,pageCount:loaded.pageCount,canRead:true,updatedAt:b.updatedAt});
});
router.get('/books/:id/file',requireAuth,async(req,res)=>{
 const b=await bookAccess(req,res);if(!b)return;
 // sendFile provides byte ranges, using the same checked cPanel/Cloudinary cache.
 await loadBook(b.storagePath);
 res.set({'Content-Type':'application/pdf','Content-Disposition':'inline','X-Content-Type-Options':'nosniff'});
 res.sendFile(cachedBookPath(b.storagePath));
});
router.get('/books/:id/state',requireAuth,async(req,res)=>{
 const b=await bookAccess(req,res);if(!b)return;
 const marks=await q('SELECT id,page,kind,data FROM mdcat_book_marks WHERE user_id=$1 AND book_id=$2 AND file_key=$3 ORDER BY created_at',[req.user!.id,b.id,b.fileKey]);
 const [progress]=await q('SELECT page FROM mdcat_book_progress WHERE user_id=$1 AND book_id=$2 AND file_key=$3',[req.user!.id,b.id,b.fileKey]);
 res.json({page:progress?.page || 1,marks});
});
router.post('/books/:id/progress',requireAuth,async(req,res)=>{
 const b=await bookAccess(req,res);if(!b)return;
 const parsed=z.object({page:id}).safeParse(req.body);if(!parsed.success){res.status(400).json({error:'Invalid page'});return;}
 const loaded=await loadBook(b.storagePath);
 if(parsed.data.page>loaded.pageCount){res.status(400).json({error:'Page is outside this book'});return;}
 await q('INSERT INTO mdcat_book_progress(user_id,book_id,file_key,page) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,book_id,file_key) DO UPDATE SET page=EXCLUDED.page,updated_at=now()',[req.user!.id,b.id,b.fileKey,parsed.data.page]);
 res.json({ok:true});
});
const markSchema=z.object({id:z.string().uuid(),page:id,kind:z.enum(['bookmark','note','highlight','ink']),data:z.object({text:z.string().max(5000).optional(),color:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),x:z.number().min(0).max(1).optional(),y:z.number().min(0).max(1).optional(),w:z.number().min(0).max(1).optional(),h:z.number().min(0).max(1).optional(),points:z.array(z.array(z.number().min(0).max(1)).length(2)).max(10000).optional(),penWidth:z.number().min(0).max(30).optional()})});
router.post('/books/:id/marks',requireAuth,async(req,res)=>{
 const b=await bookAccess(req,res);if(!b)return;
 const p=markSchema.safeParse(req.body);if(!p.success){res.status(400).json({error:'Invalid annotation'});return;}
 const loaded=await loadBook(b.storagePath);if(p.data.page>loaded.pageCount){res.status(400).json({error:'Invalid page'});return;}
 const [count]=await q('SELECT count(*)::int AS n FROM mdcat_book_marks WHERE user_id=$1 AND book_id=$2',[req.user!.id,b.id]);
 if(count.n>=25000){res.status(400).json({error:'Annotation limit reached'});return;}
 const m=p.data;
 const rows=await q('INSERT INTO mdcat_book_marks(id,user_id,book_id,file_key,page,kind,data) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id,page,kind,data',[m.id,req.user!.id,b.id,b.fileKey,m.page,m.kind,JSON.stringify(m.data)]);
 if(!rows.length){res.status(409).json({error:'Annotation already exists. Reload the reader.'});return;}
 res.json(rows[0]);
});
router.post('/books/:id/marks/:markId/delete',requireAuth,async(req,res)=>{
 const b=await bookAccess(req,res);if(!b)return;
 if(!z.string().uuid().safeParse(req.params.markId).success){res.status(400).json({error:'Invalid annotation'});return;}
 await q('DELETE FROM mdcat_book_marks WHERE id=$1 AND user_id=$2 AND book_id=$3 AND file_key=$4',[req.params.markId,req.user!.id,b.id,b.fileKey]);res.json({ok:true});
});

async function noteAccess(req:Request,res:Response){
 const parsed=id.safeParse(req.params.id);if(!parsed.success){res.status(400).json({error:'Invalid note'});return null;}
 const [note]=await q('SELECT n.*,s.module_id,s.active,s.archived FROM mdcat_notes n JOIN med_subjects s ON s.id=n.subject_id WHERE n.id=$1',[parsed.data]);
 if(!note){res.status(404).json({error:'Notes not found'});return null;}
 if(!isAdminRole(req.user!.role)){
  const modules=await getVisibleModuleIds(await getStudentTargeting(req.user!.id));
  if(!note.published||!note.active||note.archived||!modules.includes(note.module_id)){res.status(404).json({error:'Notes not found'});return null;}
 }
 res.set('Cache-Control','private, no-store');return note;
}
const membership=requireMembershipFor('resources');
router.get('/notes',requireAuth,membership,async(req,res)=>{
 const rows=await q('SELECT n.id,n.title,n.subject_id AS "subjectId",n.updated_at AS "updatedAt",s.name AS subject,s.module_id AS "moduleId" FROM mdcat_notes n JOIN med_subjects s ON s.id=n.subject_id WHERE n.published=true AND s.active=true AND s.archived=false ORDER BY s.display_order,n.title');
 const modules=await getVisibleModuleIds(await getStudentTargeting(req.user!.id));
 res.json(isAdminRole(req.user!.role)?rows:rows.filter(n=>modules.includes(n.moduleId)));
});
router.get('/notes/:id',requireAuth,membership,async(req,res)=>{const n=await noteAccess(req,res);if(n)res.json(n);});
router.get('/notes/:id/state',requireAuth,membership,async(req,res)=>{
 const n=await noteAccess(req,res);if(!n)return;
 const [row]=await q('SELECT state,updated_at FROM mdcat_note_state WHERE user_id=$1 AND note_id=$2',[req.user!.id,n.id]);
 res.json(row?{...row.state,updatedAt:new Date(row.updated_at).getTime()}:{highlights:[],position:null,updatedAt:0});
});
const stateSchema=z.object({highlights:z.array(z.object({id:z.string().max(100),start:z.number().int().min(0),end:z.number().int().min(0),color:z.enum(['yellow','green','pink','blue']),text:z.string().max(10000),at:z.number()})).max(5000),position:z.object({headingId:z.string().max(300),scroll:z.number().min(0)}).nullable()});
router.post('/notes/:id/state',requireAuth,membership,async(req,res)=>{
 const n=await noteAccess(req,res);if(!n)return;
 const p=stateSchema.safeParse(req.body);if(!p.success){res.status(400).json({error:'Invalid note state'});return;}
 const [row]=await q('INSERT INTO mdcat_note_state(user_id,note_id,state) VALUES($1,$2,$3::jsonb) ON CONFLICT(user_id,note_id) DO UPDATE SET state=EXCLUDED.state,updated_at=now() RETURNING updated_at',[req.user!.id,n.id,JSON.stringify(p.data)]);
 res.json({updatedAt:new Date(row.updated_at).getTime()});
});
router.get('/admin/notes',requireAdmin,async(_req,res)=>res.json(await q('SELECT n.id,n.title,n.subject_id AS "subjectId",n.published,n.updated_at AS "updatedAt",s.name AS subject FROM mdcat_notes n JOIN med_subjects s ON s.id=n.subject_id ORDER BY n.updated_at DESC')));
router.get('/admin/notes/:id',requireAdmin,async(req,res)=>{const n=await noteAccess(req,res);if(n)res.json(n);});
router.post('/admin/notes',requireAdmin,async(req,res)=>{
 const p=z.object({subjectId:id,title:z.string().trim().min(1).max(200),html:z.string().min(1).max(18000000),published:z.boolean()}).safeParse(req.body);
 if(!p.success){res.status(400).json({error:'Provide a subject, title and notes (maximum 18 MB).'});return;}
 const n=p.data;const [subject]=await db.select().from(subjectsTable).where(eq(subjectsTable.id,n.subjectId));
 if(!subject){res.status(400).json({error:'Subject not found'});return;}
 const [row]=await q('INSERT INTO mdcat_notes(subject_id,title,html,published) VALUES($1,$2,$3,$4) ON CONFLICT(subject_id) DO UPDATE SET title=EXCLUDED.title,html=EXCLUDED.html,published=EXCLUDED.published,updated_at=now() RETURNING id',[n.subjectId,n.title,n.html,n.published]);
 res.json(row);
});
router.post('/admin/notes/:id/delete',requireAdmin,async(req,res)=>{
 const p=id.safeParse(req.params.id);if(!p.success){res.status(400).json({error:'Invalid note'});return;}
 await q('DELETE FROM mdcat_notes WHERE id=$1',[p.data]);res.json({ok:true});
});
export default router;
