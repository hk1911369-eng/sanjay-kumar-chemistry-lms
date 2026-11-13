import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PortalRouter() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .maybeSingle();

  // Never send an account with a missing profile/role to /student:
  // the student dashboard correctly rejects non-student accounts, which
  // previously sent the browser straight back here and caused a redirect loop.
  if (error || !profile?.role) redirect('/account-pending');
  if (profile.is_active !== true) redirect('/account-disabled');

  switch (profile.role) {
    case 'admin':
      redirect('/admin');
    case 'teacher':
    case 'staff':
      redirect('/teacher');
    case 'student':
      redirect('/student');
    default:
      redirect('/account-pending');
  }
}
