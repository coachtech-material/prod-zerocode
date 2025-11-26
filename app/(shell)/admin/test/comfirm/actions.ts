"use server";

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type TestReorderNode = {
  chapterId: string;
  chapterOrder: number;
  tests: Array<{ id: string; order: number }>;
};

export async function reorderTestsStructure(courseId: string, nodes: TestReorderNode[]) {
  await requireRole(['staff', 'admin']);
  const supabase = createServerSupabaseClient();

  for (const node of nodes) {
    await supabase
      .from('chapters')
      .update({
        chapter_sort_key: node.chapterOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', node.chapterId)
      .eq('course_id', courseId);

    for (const test of node.tests) {
      await supabase
        .from('tests')
        .update({
          chapter_id: node.chapterId,
          test_sort_key: test.order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', test.id)
        .eq('course_id', courseId);
    }
  }

  revalidatePath('/admin/test/comfirm');
}
