import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Search, Sun, Moon, Type, Menu } from 'lucide-react';
import DOMPurify from 'dompurify';
import { api } from '../medify/lib/client';
import { useAuth } from '../medify/context/AuthContext';
import { NoteBody } from '../medify/components/NoteBody';
import '../medify/notesReader.css';

type Note = {id:number;title:string;subject:string;updatedAt:string};
export default function Notes(){
 const [search,setSearch]=useState('');
 const notes=useQuery<Note[]>({queryKey:['mdcat-notes'],queryFn:()=>api('/notes')});
 return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
  <div className="rounded-2xl bg-primary p-7 text-primary-foreground"><p className="text-xs font-bold uppercase tracking-widest opacity-75">Your revision library</p><h1 className="mt-2 text-3xl font-bold">MDCAT Notes</h1><p className="mt-3 max-w-xl opacity-85">Read by subject, highlight what matters, and return to where you left off.</p></div>
  <label className="flex items-center gap-3 rounded-xl border bg-card p-3"><Search size={18}/><input className="w-full bg-transparent outline-none" aria-label="Search notes" placeholder="Find a subject or note…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  {notes.isLoading&&<p role="status">Loading your notes…</p>}
  {notes.error&&<p role="alert" className="rounded-xl border border-destructive p-4">{notes.error.message}</p>}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{notes.data?.filter(n=>(n.title+' '+n.subject).toLowerCase().includes(search.toLowerCase())).map(n=><Link key={n.id} href={`/notes/${n.id}`} className="card-lift rounded-2xl border bg-card p-6"><BookOpen className="mb-6 text-primary"/><p className="text-xs font-bold uppercase tracking-wide text-primary">{n.subject}</p><h2 className="mt-2 text-lg font-bold">{n.title}</h2><p className="mt-5 text-sm text-muted-foreground">Open notes →</p></Link>)}</div>
  {notes.data?.length===0&&<div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Your notes will appear here when your admin publishes them.</div>}
 </div>;
}
export function NotesReader(){
 const {id}=useParams();const {user}=useAuth();const [dark,setDark]=useState(false);const [size,setSize]=useState(18);const [tocOpen,setTocOpen]=useState(true);
 const note=useQuery<{id:number;title:string;html:string}>({queryKey:['mdcat-note',id],queryFn:()=>api(`/notes/${id}`)});
 const prepared=useMemo(()=>{
  const html=DOMPurify.sanitize(note.data?.html||'',{ADD_ATTR:['id','target'],FORBID_TAGS:['style','iframe','script','form','input'],FORBID_ATTR:['style']});
  const doc=new DOMParser().parseFromString(html,'text/html');
  const toc=Array.from(doc.querySelectorAll('h1,h2,h3,h4')).map((h,i)=>{h.id=`note-heading-${i}`;return{id:h.id,text:h.textContent||'',level:Number(h.tagName[1])};});
  return {html:doc.body.innerHTML,toc};
 },[note.data?.html]);
 if(note.isLoading)return <p className="p-8">Opening notes…</p>;
 if(note.error)return <div className="p-8"><Link href="/notes">← Notes</Link><p role="alert" className="mt-4">{note.error.message}</p></div>;
 return <div data-theme={dark?'dark':'light'} className={'mdcat-notes-reader '+(dark?'dark bg-slate-950 text-slate-100 min-h-screen':'bg-background min-h-screen')}>
  <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b bg-card p-4 text-foreground"><Link href="/notes" aria-label="Back to notes"><ArrowLeft size={20}/></Link><h1 className="min-w-0 flex-1 font-bold">{note.data?.title}</h1><button aria-label="Toggle contents" onClick={()=>setTocOpen(!tocOpen)} className="rounded-lg border p-2"><Menu size={18}/></button><button aria-label="Change text size" onClick={()=>setSize(s=>s>=24?16:s+2)} className="rounded-lg border p-2"><Type size={18}/></button><button aria-label="Toggle reading theme" onClick={()=>setDark(!dark)} className="rounded-lg border p-2">{dark?<Sun size={18}/>:<Moon size={18}/>}</button></header>
  <div className="mx-auto flex max-w-7xl flex-col gap-7 p-5 md:flex-row md:p-8">
   {tocOpen&&<aside className="shrink-0 md:sticky md:top-24 md:max-h-[75vh] md:w-60 overflow-auto"><h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">Contents</h2>{prepared.toc.map(h=><a className="block rounded-lg px-3 py-2 text-sm hover:bg-primary/10" style={{paddingLeft:Math.max(0,h.level-2)*12+12}} href={'#'+h.id} key={h.id}>{h.text}</a>)}</aside>}
   <main className="min-w-0 flex-1" style={{fontSize:size}}><NoteBody html={prepared.html} subjectId={String(id)} userId={user?.uid} watermarkText={user?.email||'MDCAT'} allLoaded={true} isDark={dark}/></main>
  </div>
 </div>;
}
