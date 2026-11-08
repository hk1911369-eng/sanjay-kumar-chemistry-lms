import { NextResponse } from 'next/server';
export async function GET(){return NextResponse.json({status:'ok',app:'jmt-academy',timestamp:new Date().toISOString(),supabaseConfigured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)});}
