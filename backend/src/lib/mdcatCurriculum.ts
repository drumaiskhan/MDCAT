import { db, modulesTable, subjectsTable, topicsTable } from '@workspace/db';
import { and, eq, sql } from 'drizzle-orm';
import type {Request,Response,NextFunction} from 'express';
// The inherited import/storage format still has moduleId. It is resolved here,
// never selected by an admin or student. No blocks are created for this product.
export async function curriculumStorageId(){
 return db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(72833105)`);
  const [row]=await tx.select().from(modulesTable).where(eq(modulesTable.name,'__mdcat_curriculum__'));
  if(row)return row.id;
  const [created]=await tx.insert(modulesTable).values({name:'__mdcat_curriculum__',subtitle:'Internal curriculum storage',programTargetKind:null,yearTargetNumber:null}).returning();return created.id;
 });
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
