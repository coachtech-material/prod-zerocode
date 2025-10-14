"use server";

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function enrollInCourse(courseId: string) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase
    .from('enrollments')
    .upsert({ user_id: user.id, course_id: courseId, status: 'active' }, { onConflict: 'user_id,course_id' });
  if (error) redirect(`/courses/${courseId}?error=${encodeURIComponent(error.message)}`);
  redirect(`/courses/${courseId}?message=${encodeURIComponent('受講登録しました')}`);
}

