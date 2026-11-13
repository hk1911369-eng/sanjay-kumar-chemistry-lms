import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ evidenceId: string }> },
) {
  const { evidenceId } = await params;
  if (!uuid.test(evidenceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  // The evidence table's RLS is the authorization boundary: student owner,
  // assigned teacher/staff, or admin. Do not accept a storage path from the client.
  const { data: evidence, error } = await db
    .from('lab_notebook_evidence')
    .select('storage_path,original_filename,content_type')
    .eq('id', evidenceId)
    .maybeSingle();

  if (error || !evidence) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const { data: signed, error: signingError } = await db.storage
    .from('lab-notebook-evidence')
    .createSignedUrl(evidence.storage_path, 60, {
      download: evidence.original_filename,
    });

  if (signingError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Evidence temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
