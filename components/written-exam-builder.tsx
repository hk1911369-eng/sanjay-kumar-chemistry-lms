"use client";

import { useState } from 'react';
import { createWrittenExam } from '@/app/actions/academic';

type Question = { question_type:'mcq'|'short_answer'|'long_answer'; question_text:string; marks:number; options:string[]; correct_option:number; model_answer:string };
const fresh = ():Question => ({question_type:'mcq',question_text:'',marks:1,options:['','','',''],correct_option:0,model_answer:''});

export function WrittenExamBuilder({courses,canPublish=false}:{courses:{id:string;title:string}[];canPublish?:boolean}) {
 const [questions,setQuestions]=useState<Question[]>([fresh()]);
 const update=(index:number,patch:Partial<Question>)=>setQuestions(current=>current.map((q,i)=>i===index?{...q,...patch}:q));
 return <form action={createWrittenExam} className="auth-form portal-card">
  <h3>Create written exam</h3>
  <label>Course<select name="course_id" required>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
  <label>Exam title<input name="title" required maxLength={180}/></label>
  <label>Instructions<textarea name="instructions" rows={3} maxLength={10000}/></label>
  <div className="portal-grid"><label>Opens at (optional)<input name="starts_at" type="datetime-local"/></label><label>Closes at (optional)<input name="ends_at" type="datetime-local"/></label></div>
  <input type="hidden" name="questions_json" value={JSON.stringify(questions)}/>
  {questions.map((q,i)=><fieldset className="portal-card" key={i}>
   <legend>Question {i+1}</legend>
   <label>Question type<select value={q.question_type} onChange={e=>update(i,{question_type:e.target.value as Question['question_type'],options:e.target.value==='mcq'?['','','','']:[],correct_option:0})}><option value="mcq">MCQ</option><option value="short_answer">Short answer</option><option value="long_answer">Long / creative answer</option></select></label>
   <label>Question text<textarea value={q.question_text} onChange={e=>update(i,{question_text:e.target.value})} rows={3} maxLength={5000} required/></label>
   {q.question_type==='mcq'&&<div className="portal-grid">{q.options.map((o,j)=><label key={j}>Option {String.fromCharCode(65+j)}<input value={o} onChange={e=>update(i,{options:q.options.map((v,k)=>k===j?e.target.value:v)})} maxLength={500} required/></label>)}<label>Correct option<select value={q.correct_option} onChange={e=>update(i,{correct_option:Number(e.target.value)})}>{q.options.map((_,j)=><option key={j} value={j}>{String.fromCharCode(65+j)}</option>)}</select></label></div>}
   <label>Marks<input type="number" min="0.5" step="0.5" value={q.marks} onChange={e=>update(i,{marks:Number(e.target.value)})}/></label>
   {q.question_type!=='mcq'&&<label>Model answer / marking guide (staff only)<textarea value={q.model_answer} onChange={e=>update(i,{model_answer:e.target.value})} rows={3} maxLength={5000}/></label>}
   {questions.length>1&&<button type="button" className="quiet-button" onClick={()=>setQuestions(current=>current.filter((_,j)=>j!==i))}>Remove question</button>}
  </fieldset>)}
  {questions.length<30&&<button type="button" className="quiet-button" onClick={()=>setQuestions(current=>[...current,fresh()])}>+ Add another question</button>}
  {canPublish?<label className="toggle-label"><input type="checkbox" name="published"/> Publish exam immediately</label>:<p className="muted">Written exams are saved as drafts. An administrator must publish them.</p>}
  <button className="auth-submit">Save written exam</button>
 </form>;
}
