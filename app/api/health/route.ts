import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('courses').select('id').limit(1);

    if (error) {
      return NextResponse.json(
        { status: 'degraded', app: 'jmt-academy', database: 'unavailable', timestamp },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      { status: 'ok', app: 'jmt-academy', database: 'reachable', timestamp },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { status: 'degraded', app: 'jmt-academy', database: 'unavailable', timestamp },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
