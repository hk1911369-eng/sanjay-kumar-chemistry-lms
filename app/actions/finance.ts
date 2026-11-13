'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const types = ['cash_income', 'expense', 'refund'] as const;
const methods = ['cash', 'bank', 'bkash', 'nagad', 'rocket', 'other'] as const;

export async function saveFinanceEntry(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role,is_active').eq('id', user.id).single();
  if (profile?.is_active !== true || profile.role !== 'admin') redirect('/portal');

  const entryType = String(formData.get('entry_type') ?? '') as typeof types[number];
  const category = String(formData.get('category') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const amount = Number(String(formData.get('amount_bdt') ?? '').trim());
  const paymentMethod = String(formData.get('payment_method') ?? '') as typeof methods[number];
  const reference = String(formData.get('reference') ?? '').trim();
  const entryDate = String(formData.get('entry_date') ?? '').trim();
  const courseId = String(formData.get('course_id') ?? '').trim() || null;
  const studentId = String(formData.get('student_id') ?? '').trim() || null;
  const month = String(formData.get('month') ?? '').trim();
  const returnMonth = /^\d{4}-\d{2}$/.test(month) ? month : '';

  if (!types.includes(entryType) || !methods.includes(paymentMethod)
      || category.length < 2 || category.length > 80
      || description.length < 2 || description.length > 500
      || !Number.isSafeInteger(amount) || amount < 1 || amount > 100000000
      || reference.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)
      || (entryType === 'cash_income' && ['bkash','nagad','rocket'].includes(paymentMethod))) {
    redirect('/admin/finance?error=invalid' + (returnMonth ? '&month=' + returnMonth : ''));
  }

  const { error } = await db.from('finance_entries').insert({
    entry_type: entryType,
    category,
    description,
    amount_bdt: amount,
    payment_method: paymentMethod,
    reference: reference || null,
    entry_date: entryDate,
    course_id: courseId,
    student_id: studentId,
    recorded_by: user.id,
  });
  if (error) redirect('/admin/finance?error=save' + (returnMonth ? '&month=' + returnMonth : ''));

  revalidatePath('/admin/finance');
  redirect('/admin/finance?saved=1' + (returnMonth ? '&month=' + returnMonth : ''));
}
