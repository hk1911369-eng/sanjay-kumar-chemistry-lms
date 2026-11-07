import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export default async function PortalRouter() {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect('/login');
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single();
 if(profile?.role==='admin') redirect('/admin');
 if(profile?.role==='teacher'||profile?.role==='staff') redirect('/teacher');
 redirect('/student');
}
