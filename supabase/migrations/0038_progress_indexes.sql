-- Add supporting indexes for learner progress lookups
create index if not exists progress_user_course_idx
  on public.progress (user_id, course_id);

create index if not exists progress_course_user_idx
  on public.progress (course_id, user_id);

create index if not exists progress_course_lesson_idx
  on public.progress (course_id, lesson_id);
