import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function csvCell(value: unknown) {
  const raw = value == null ? '' : String(value);
  const safe = /^[=+@\-\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export async function GET(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: actor } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const requestedMonth = url.searchParams.get('month') ?? '';
  const month = /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit'}).format(new Date());
  const [year,monthNumber]=month.split('-').map(Number);
  if(monthNumber<1||monthNumber>12) return NextResponse.json({error:'Invalid month'},{status:400});
  const start = new Date(Date.UTC(year,monthNumber-1,1)-6*60*60*1000).toISOString();
  const end = new Date(Date.UTC(year,monthNumber,1)-6*60*60*1000).toISOString();
  const startDate = `${month}-01`;
  const nextMonth = new Date(Date.UTC(year,monthNumber,1)).toISOString().slice(0,10);

  const [{ data: payments, error: paymentError }, { data: entries, error: entryError }] = await Promise.all([
    db.from('manual_payment_submissions').select('id,student_id,course_id,provider,payment_kind,delivery_mode,amount_bdt,transaction_id,reviewed_at').eq('status','approved').gte('reviewed_at',start).lt('reviewed_at',end).order('reviewed_at'),
    db.from('finance_entries').select('id,entry_type,category,description,amount_bdt,payment_method,reference,entry_date,course_id,student_id').gte('entry_date',startDate).lt('entry_date',nextMonth).order('entry_date'),
  ]);
  if(paymentError||entryError) return NextResponse.json({error:'Finance ledger is not ready. Confirm the finance database migration has been applied.'},{status:503});

  const studentIds=[...new Set([...(payments??[]).map(x=>x.student_id),...(entries??[]).map(x=>x.student_id).filter((x):x is string=>Boolean(x))])];
  const courseIds=[...new Set([...(payments??[]).map(x=>x.course_id),...(entries??[]).map(x=>x.course_id).filter((x):x is string=>Boolean(x))])];
  const [{data:students},{data:courses}]=await Promise.all([
    studentIds.length?db.from('profiles').select('id,full_name,student_code').in('id',studentIds):Promise.resolve({data:[] as {id:string;full_name:string|null;student_code:string|null}[]}),
    courseIds.length?db.from('courses').select('id,title').in('id',courseIds):Promise.resolve({data:[] as {id:string;title:string}[]}),
  ]);
  const studentMap=new Map((students??[]).map(x=>[x.id,x]));
  const courseMap=new Map((courses??[]).map(x=>[x.id,x.title]));
  const headers=['Date','Record type','Category / payment type','Description','Student','Student ID','Course','Payment method','Amount BDT','Reference'];
  const rows:any[][]=[headers];
  for(const row of payments??[]){
    const student=studentMap.get(row.student_id);
    rows.push([row.reviewed_at?new Date(row.reviewed_at).toISOString():'','verified_wallet_income',row.payment_kind,row.delivery_mode??'Legacy payment',student?.full_name,student?.student_code,courseMap.get(row.course_id),row.provider,Number(row.amount_bdt),row.transaction_id]);
  }
  for(const row of entries??[]){
    const student=row.student_id?studentMap.get(row.student_id):null;
    const signedAmount=row.entry_type==='expense'||row.entry_type==='refund'?-Number(row.amount_bdt):Number(row.amount_bdt);
    rows.push([row.entry_date,row.entry_type,row.category,row.description,student?.full_name,student?.student_code,row.course_id?courseMap.get(row.course_id):'',row.payment_method,signedAmount,row.reference]);
  }
  const body='\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
  return new NextResponse(body,{headers:{
    'Content-Type':'text/csv; charset=utf-8',
    'Content-Disposition':`attachment; filename="jmt-academy-finance-${month}.csv"`,
    'Cache-Control':'private, no-store',
  }});
}
