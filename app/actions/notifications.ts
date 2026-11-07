'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function markNotificationRead(formData: FormData) {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) redirect('/login');
 const id = String(formData.get('notification_id') || '');
 if (!id) redirect('/academic');
 const { error } = await supabase.from('notifications')
  .update({ read_at: new Date().toISOString() })
  .eq('id', id).eq('recipient_id', user.id);
 redirect(error ? '/academic?error=notification' : '/academic#notifications');
}
