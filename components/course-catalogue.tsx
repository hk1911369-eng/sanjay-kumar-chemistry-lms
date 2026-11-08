'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Course={
 id:string;title:string;slug:string;description:string|null;programme_group:string|null;
 subjects:string[]|null;cover_image_url:string|null;delivery_modes:string[]|null;
 live_price_bdt:number|null;recorded_price_bdt:number|null;offline_price_bdt:number|null;
 admission_fee_bdt:number|null;teaching_method:string|null;schedule_text:string|null;enrollment_open:boolean|null;
};
const labels:Record<string,string>={live_recorded:'Live + recorded',recorded_only:'Recorded-only',offline:'Offline academy'};
function price(value:number|null){return value===null?'Contact us':'৳'+Number(value).toLocaleString('en-BD');}
export function CourseCatalogue({courses}:{courses:Course[]}){
 const [search,setSearch]=useState('');const [group,setGroup]=useState('all');const [mode,setMode]=useState('all');
 const groups=useMemo(()=>[...new Set(courses.map(c=>c.programme_group).filter((value):value is string=>Boolean(value)))].sort((a,b)=>a.localeCompare(b)),[courses]);
 const filtered=useMemo(()=>courses.filter(c=>{
  const q=search.trim().toLowerCase();const hay=[c.title,c.description,c.programme_group,...(c.subjects??[])].filter(Boolean).join(' ').toLowerCase();
  return (!q||hay.includes(q))&&(group==='all'||c.programme_group===group)&&(mode==='all'||(c.delivery_modes??[]).includes(mode));
 }),[courses,search,group,mode]);
 return <div className="course-discovery">
  <div className="course-filter-panel">
   <label>Search courses, subjects or topics<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="e.g. Physics, HSC 2027, Biology"/></label>
   <label>Programme<select value={group} onChange={e=>setGroup(e.target.value)}><option value="all">All programmes</option>{groups.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
   <label>Learning format<select value={mode} onChange={e=>setMode(e.target.value)}><option value="all">All formats</option><option value="live_recorded">Live + recorded</option><option value="recorded_only">Recorded-only</option><option value="offline">Offline academy</option></select></label>
   <button type="button" className="quiet-button" onClick={()=>{setSearch('');setGroup('all');setMode('all');}}>Clear filters</button>
  </div>
  <p className="muted course-result-count">Showing {filtered.length} of {courses.length} available course{courses.length===1?'':'s'}</p>
  {filtered.length===0?<div className="portal-card"><h2>No matching courses</h2><p className="muted">Try another subject, programme or learning format, or clear the filters.</p><button type="button" className="quiet-button" onClick={()=>{setSearch('');setGroup('all');setMode('all');}}>Show all courses</button></div>:groups.filter(g=>group==='all'||group===g).map(g=>{
   const rows=filtered.filter(c=>c.programme_group===g);if(!rows.length)return null;
   return <section className="catalogue-group" key={g}><h2>{g}</h2><div className="catalogue-grid">{rows.map(c=><article className="catalogue-card" key={c.id}>{c.cover_image_url?<Image src={c.cover_image_url} alt={c.title} width={960} height={540} sizes="(max-width: 768px) 100vw, 33vw" loading="lazy" unoptimized className="catalogue-cover"/>:<div className="catalogue-placeholder"><span>JMT</span><b>{g}</b></div>}<div className="catalogue-card-body"><span className="catalogue-kicker">{g}</span><h3>{c.title}</h3><p>{c.description}</p><p className="catalogue-subjects">{(c.subjects??[]).join(' · ')}</p><div className="catalogue-modes">{(c.delivery_modes??[]).map(m=><span key={m}>{labels[m]??m}</span>)}</div><div className="catalogue-prices">{c.delivery_modes?.includes('live_recorded')&&<span>Live / month <b>{price(c.live_price_bdt)}</b></span>}{c.delivery_modes?.includes('recorded_only')&&<span>Recorded / month <b>{price(c.recorded_price_bdt)}</b></span>}{c.delivery_modes?.includes('offline')&&<span>Offline / month <b>{price(c.offline_price_bdt)}</b></span>}</div><p className="muted">One-time admission: {price(c.admission_fee_bdt)}</p><p className="muted">{c.teaching_method} {c.schedule_text&&' · '+c.schedule_text}</p>{c.enrollment_open?<Link className="btn" href={'/courses/'+c.slug}>View course & enrol →</Link>:<span className="status-pending">Enrolment opening soon</span>}</div></article>)}</div></section>;
  })}
 </div>;
}
