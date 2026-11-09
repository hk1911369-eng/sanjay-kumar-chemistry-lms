import { createClient } from '@/lib/supabase/server';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!uuid.test(id)) return new Response('Not found', { status: 404 });

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // RLS decides whether this student, assigned teacher or admin may open the evidence.
  const { data: evidence, error } = await db
    .from('lab_notebook_evidence')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle();

  if (error || !evidence) return new Response('Not found', { status: 404 });

  const { data: signed, error: signError } = await db.storage
    .from('lab-notebook-evidence')
    .createSignedUrl(evidence.storage_path, 60, { download: true });

  if (signError || !signed?.signedUrl) {
    return new Response('Evidence is temporarily unavailable', { status: 503 });
  }

  const response = Response.redirect(signed.signedUrl, 302);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
