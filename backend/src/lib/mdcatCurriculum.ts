import { db, modulesTable, subjectsTable, topicsTable, courseYearsTable, mcqsTable, flashcardsTable } from '@workspace/db';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import type {Request,Response,NextFunction} from 'express';
// The inherited import/storage format still has moduleId. It is resolved here,
// never selected by an admin or student. No blocks are created for this product.
//
// Storage is split per FSc year: every course year gets its own internal module
// (tagged with that year), and a subject filed under the year lives in it, so
// the existing module-visibility rules hide FSc-II content from a student who
// only bought FSc-I (and vice versa). Subjects without a year share the legacy
// untagged module, which every student can see.
const SHARED_STORAGE_NAME='__mdcat_curriculum__';
const yearStorageName=(courseYearId:number)=>`${SHARED_STORAGE_NAME}:year-${courseYearId}`;
export async function curriculumStorageId(courseYearId?:number|null){
 return db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(72833105)`);
  if(courseYearId==null){
   const [row]=await tx.select().from(modulesTable).where(eq(modulesTable.name,SHARED_STORAGE_NAME));
   if(row)return row.id;
   const [created]=await tx.insert(modulesTable).values({name:SHARED_STORAGE_NAME,subtitle:'Internal curriculum storage',programTargetKind:null,yearTargetNumber:null}).returning();return created.id;
  }
  const [year]=await tx.select().from(courseYearsTable).where(eq(courseYearsTable.id,courseYearId));
  if(!year)throw new Error('Unknown FSc year.');
  const name=yearStorageName(courseYearId);
  const [row]=await tx.select().from(modulesTable).where(eq(modulesTable.name,name));
  if(row){
   if(!(row.courseYearIds??[]).includes(courseYearId))await tx.update(modulesTable).set({courseYearIds:[courseYearId]}).where(eq(modulesTable.id,row.id));
   return row.id;
  }
  const [created]=await tx.insert(modulesTable).values({name,subtitle:`Internal storage: ${year.name}`,programTargetKind:null,yearTargetNumber:null,courseYearIds:[courseYearId]}).returning();return created.id;
 });
}
/** Files a subject (and the MCQs / flashcards already under it) into the storage
 * module of its FSc year. Safe to repeat; also used by the startup backfill. */
export async function moveSubjectToYearStorage(subjectId:number,courseYearId:number|null){
 const moduleId=await curriculumStorageId(courseYearId);
 await db.transaction(async tx=>{
  await tx.update(subjectsTable).set({moduleId}).where(eq(subjectsTable.id,subjectId));
  await tx.update(mcqsTable).set({moduleId}).where(eq(mcqsTable.subjectId,subjectId));
  await tx.update(flashcardsTable).set({moduleId}).where(eq(flashcardsTable.subjectId,subjectId));
 });
 return moduleId;
}
/** Startup backfill: subjects that already carry an FSc year but still sit in the
 * shared module are moved into their year's module. Idempotent. */
export async function syncSubjectYearStorage(){
 const rows=await db.select({id:subjectsTable.id,moduleId:subjectsTable.moduleId,courseYearId:subjectsTable.courseYearId}).from(subjectsTable).where(isNotNull(subjectsTable.courseYearId));
 let moved=0;
 for(const row of rows){
  const target=await curriculumStorageId(row.courseYearId);
  if(row.moduleId!==target){await moveSubjectToYearStorage(row.id,row.courseYearId);moved++;}
 }
 return moved;
}
export async function resolveSubjectTopic(subjectId:unknown,topicId:unknown){
 const sid=Number(subjectId),tid=Number(topicId);
 if(!Number.isInteger(sid)||sid<1||!Number.isInteger(tid)||tid<1)throw new Error('Select a subject and topic.');
 const [subject]=await db.select().from(subjectsTable).where(and(eq(subjectsTable.id,sid),eq(subjectsTable.archived,false),eq(subjectsTable.active,true)));
 const [topic]=await db.select().from(topicsTable).where(and(eq(topicsTable.id,tid),eq(topicsTable.subjectId,sid),eq(topicsTable.archived,false),eq(topicsTable.active,true)));
 if(!subject||!topic)throw new Error('The topic must belong to the selected subject.');
 return {moduleId:subject.moduleId,subjectId:sid,topicId:tid,module:subject.name,subject:subject.name,topic:topic.name};
}
export async function subjectTopicBody(req:Request,res:Response,next:NextFunction){
 try{
  // Exam-only imports remain supported by the inherited paper importer.
  if((req.body?.examId||req.body?.pastPaperId)&&!req.body?.subjectId&&!req.body?.topicId){next();return;}
  req.body={...req.body,...await resolveSubjectTopic(req.body?.subjectId,req.body?.topicId)};
  next();
 }catch(error){res.status(400).json({error:error instanceof Error?error.message:'Invalid subject/topic'});}
}
