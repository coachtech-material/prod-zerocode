

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."dashboard_progress_counts"() RETURNS TABLE("total_sections" bigint, "completed_sections" bigint, "total_tests" bigint, "passed_tests" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid := auth.uid();
  has_test_results boolean := false;
  section_totals record;
  tests_total bigint := 0;
  tests_passed bigint := 0;
begin
  if uid is null then
    return query select 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  with visible_sections as (
    select l.id
    from public.lessons l
    join public.courses c on c.id = l.course_id
    left join public.chapters ch on ch.id = l.chapter_id
    where l.status = 'published'
      and l.deleted_at is null
      and c.status = 'published'
      and c.deleted_at is null
      and (
        ch.id is null
        or (ch.status = 'published' and ch.deleted_at is null)
      )
  )
  select
    coalesce(
      (select count(*)::bigint from visible_sections),
      0::bigint
    ) as total_sections,
    coalesce(
      (
        select count(*)::bigint
        from public.progress p
        join visible_sections vs on vs.id = p.lesson_id
        where p.user_id = uid
          and p.is_completed is true
      ),
      0::bigint
    ) as completed_sections
  into section_totals;

  select coalesce(count(*), 0)::bigint
  into tests_total
  from (
    select t.id
    from public.tests t
    left join public.courses c on c.id = t.course_id
    left join public.chapters ch on ch.id = t.chapter_id
    where t.status = 'published'
      and t.deleted_at is null
      and t.mode is not null
      and (
        t.course_id is null
        or (
          c.status = 'published'
          and c.deleted_at is null
        )
      )
      and (
        t.chapter_id is null
        or (
          ch.status = 'published'
          and ch.deleted_at is null
        )
      )
  ) as visible_tests;

  select to_regclass('public.test_results') is not null
  into has_test_results;

  if has_test_results then
    select coalesce(count(distinct tr.test_id), 0)::bigint
    into tests_passed
    from public.test_results tr
    join (
      select t.id
      from public.tests t
      left join public.courses c on c.id = t.course_id
      left join public.chapters ch on ch.id = t.chapter_id
      where t.status = 'published'
        and t.deleted_at is null
        and t.mode is not null
        and (
          t.course_id is null
          or (
            c.status = 'published'
            and c.deleted_at is null
          )
        )
        and (
          t.chapter_id is null
          or (
            ch.status = 'published'
            and ch.deleted_at is null
          )
        )
    ) vt on vt.id = tr.test_id
    where tr.user_id = uid
      and tr.is_passed is true
      ;
  else
    tests_passed := 0;
  end if;

  return query select
    coalesce(section_totals.total_sections, 0::bigint),
    coalesce(section_totals.completed_sections, 0::bigint),
    coalesce(tests_total, 0::bigint),
    coalesce(tests_passed, 0::bigint);
end;
$$;


ALTER FUNCTION "public"."dashboard_progress_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_timestamp_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_timestamp_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ops_delete_user"("target" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  is_admin boolean;
begin
  select exists(
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role = 'admin'
  ) into is_admin;

  if not is_admin then
    raise exception 'not authorized';
  end if;

  if target = auth.uid() then
    raise exception 'cannot delete self';
  end if;

  delete from auth.users where id = target;
end;
$$;


ALTER FUNCTION "public"."ops_delete_user"("target" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ops_list_staff_admin"() RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "role" "text", "issued_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select p.id,
         p.first_name,
         p.last_name,
         p.role,
         p.created_at as issued_at
  from public.profiles p
  where exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.role in ('staff','admin')
  )
  and p.role in ('staff','admin');
$$;


ALTER FUNCTION "public"."ops_list_staff_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ops_list_users"() RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "role" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select p.id, p.first_name, p.last_name, p.role
  from public.profiles p
  where exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.role in ('staff','admin')
  )
  and p.role = 'user';
$$;


ALTER FUNCTION "public"."ops_list_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ops_list_users_with_status"() RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "email" "text", "role" "text", "last_sign_in_at" timestamp with time zone, "inactive" boolean, "phone" "text", "issued_at" timestamp with time zone, "login_disabled" boolean, "ops_tagged" boolean, "interview_completed" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select p.id,
         p.first_name,
         p.last_name,
         u.email,
         p.role,
         coalesce(p.last_active_at, u.last_sign_in_at) as last_sign_in_at,
         coalesce(coalesce(p.last_active_at, u.last_sign_in_at) < (now() - interval '24 hours'), true) as inactive,
         coalesce(p.phone, u.phone) as phone,
         p.created_at as issued_at,
         coalesce(p.login_disabled, false) as login_disabled,
         coalesce(p.ops_tagged, false) as ops_tagged,
         coalesce(p.interview_completed, false) as interview_completed
  from public.profiles p
  left join auth.users u on u.id = p.id
  where exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.role in ('staff','admin')
  )
  and p.role = 'user';
$$;


ALTER FUNCTION "public"."ops_list_users_with_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ops_set_user_disabled"("target" "uuid", "disabled" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  is_allowed boolean;
begin
  select exists(
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role in ('staff','admin')
  ) into is_allowed;

  if not is_allowed then
    raise exception 'not authorized';
  end if;

  if target = auth.uid() then
    raise exception 'cannot disable self';
  end if;

  update public.profiles
  set login_disabled = coalesce(disabled, true),
      updated_at = now()
  where id = target;
end;
$$;


ALTER FUNCTION "public"."ops_set_user_disabled"("target" "uuid", "disabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end; $$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_course_sort_key"("p_course" "uuid", "p_key" integer) RETURNS "void"
    LANGUAGE "sql"
    AS $$
with ordered as (
  select id,
         row_number() over (
           order by case when id = p_course then p_key else sort_key end, created_at
         ) as new_key
  from public.courses
  where deleted_at is null
)
update public.courses c
set sort_key = o.new_key,
    updated_at = now()
from ordered o
where c.id = o.id;
$$;


ALTER FUNCTION "public"."update_course_sort_key"("p_course" "uuid", "p_key" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chapters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "chapter_sort_key" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chapters_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."chapters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description_md" "text",
    "thumbnail_url" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "published_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "sort_key" integer DEFAULT 0 NOT NULL,
    "overview_video_url" "text",
    CONSTRAINT "courses_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_report_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "daily_report_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "category_name" "text" NOT NULL,
    "note" "text",
    "minutes" integer NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "daily_report_items_minutes_check" CHECK (("minutes" > 0))
);


ALTER TABLE "public"."daily_report_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "report_date" "date" NOT NULL,
    "reflection_text" "text",
    "total_minutes" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "daily_reports_total_minutes_check" CHECK (("total_minutes" >= 0))
);


ALTER TABLE "public"."daily_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "enrollments_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'dropped'::"text"])))
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content_md" "text",
    "video_url" "text",
    "pdf_url" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "duration_min" integer DEFAULT 0 NOT NULL,
    "chapter_id" "uuid",
    "section_sort_key" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "lessons_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "text" "text" NOT NULL,
    "target_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "monthly_goals_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."monthly_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text",
    "display_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "last_active_at" timestamp with time zone,
    "onboarding_step" integer DEFAULT 0 NOT NULL,
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    "login_disabled" boolean DEFAULT false NOT NULL,
    "ops_tagged" boolean DEFAULT false NOT NULL,
    "interview_completed" boolean DEFAULT false NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'staff'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."progress_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "chapter_id" "uuid" NOT NULL,
    "section_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."progress_limits" OWNER TO "postgres";

ALTER TABLE "public"."progress_limits" ENABLE ROW LEVEL SECURITY;


CREATE TABLE IF NOT EXISTS "public"."progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "is_unlocked" boolean DEFAULT false NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."test_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "course_id" "uuid",
    "type" "text" NOT NULL,
    "description_md" "text",
    "time_limit_sec" integer DEFAULT 60 NOT NULL,
    "pass_threshold" integer DEFAULT 80 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "spec_yaml" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "chapter_id" "uuid",
    "mode" "text",
    CONSTRAINT "tests_mode_check" CHECK (("mode" = ANY (ARRAY['fill_blank'::"text", 'semantic_fill'::"text", 'fix'::"text", 'reorder'::"text"]))),
    CONSTRAINT "tests_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"]))),
    CONSTRAINT "tests_type_check" CHECK (("type" = ANY (ARRAY['cli'::"text", 'git'::"text", 'db'::"text", 'docker'::"text", 'php'::"text", 'laravel'::"text"])))
);


ALTER TABLE "public"."tests" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_items"
    ADD CONSTRAINT "daily_report_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_reports"
    ADD CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_goals"
    ADD CONSTRAINT "monthly_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_goals"
    ADD CONSTRAINT "monthly_goals_user_id_year_month_key" UNIQUE ("user_id", "year", "month");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."progress_limits"
    ADD CONSTRAINT "progress_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."test_assets"
    ADD CONSTRAINT "test_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "categories_user_name_key" ON "public"."categories" USING "btree" ("user_id", "lower"("name"));



CREATE INDEX "daily_report_items_report_idx" ON "public"."daily_report_items" USING "btree" ("daily_report_id", "sort_order");



CREATE UNIQUE INDEX "daily_reports_user_date_key" ON "public"."daily_reports" USING "btree" ("user_id", "report_date");



CREATE UNIQUE INDEX "progress_limits_section_id_idx" ON "public"."progress_limits" USING "btree" ("section_id");



CREATE INDEX "idx_tests_course_chapter" ON "public"."tests" USING "btree" ("course_id", "chapter_id");



CREATE OR REPLACE TRIGGER "categories_set_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."handle_timestamp_update"();



CREATE OR REPLACE TRIGGER "daily_reports_set_updated_at" BEFORE UPDATE ON "public"."daily_reports" FOR EACH ROW EXECUTE FUNCTION "public"."handle_timestamp_update"();



CREATE OR REPLACE TRIGGER "monthly_goals_set_updated_at" BEFORE UPDATE ON "public"."monthly_goals" FOR EACH ROW EXECUTE FUNCTION "public"."handle_timestamp_update"();



CREATE OR REPLACE TRIGGER "trg_profiles_touch" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'progress_limits' AND policyname = 'progress_limits_delete_staff') THEN
    EXECUTE 'CREATE POLICY "progress_limits_delete_staff" ON "public"."progress_limits" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "me"
  WHERE (("me"."id" = "auth"."uid"()) AND (("me"."role")::"text" = ANY (ARRAY[(''staff''::character varying)::"text", (''admin''::character varying)::"text"])))))) )';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'progress_limits' AND policyname = 'progress_limits_insert_staff') THEN
    EXECUTE 'CREATE POLICY "progress_limits_insert_staff" ON "public"."progress_limits" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "me"
  WHERE (("public"."me"."id" = "auth"."uid"()) AND (("public"."me"."role")::"text" = ANY (ARRAY[(''staff''::character varying)::"text", (''admin''::character varying)::"text"])))))))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'progress_limits' AND policyname = 'progress_limits_select_any') THEN
    EXECUTE 'CREATE POLICY "progress_limits_select_any" ON "public"."progress_limits" FOR SELECT TO "authenticated" USING (true)';
  END IF;
END
$$;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."daily_report_items"
    ADD CONSTRAINT "daily_report_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."daily_report_items"
    ADD CONSTRAINT "daily_report_items_daily_report_id_fkey" FOREIGN KEY ("daily_report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_reports"
    ADD CONSTRAINT "daily_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."monthly_goals"
    ADD CONSTRAINT "monthly_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress_limits"
    ADD CONSTRAINT "progress_limits_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress_limits"
    ADD CONSTRAINT "progress_limits_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress_limits"
    ADD CONSTRAINT "progress_limits_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress_limits"
    ADD CONSTRAINT "progress_limits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."test_assets"
    ADD CONSTRAINT "test_assets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."test_assets"
    ADD CONSTRAINT "test_assets_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_modify_own" ON "public"."categories" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "categories_select_own" ON "public"."categories" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chapters_delete_admin" ON "public"."chapters" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "chapters_insert_staff_admin" ON "public"."chapters" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "chapters_select_staff_admin" ON "public"."chapters" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "chapters_select_user_published_all" ON "public"."chapters" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"text") AND ("deleted_at" IS NULL)));



CREATE POLICY "chapters_update_staff_admin" ON "public"."chapters" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courses_delete_admin" ON "public"."courses" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "courses_insert_staff_admin" ON "public"."courses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "courses_select_published_all" ON "public"."courses" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"text") AND ("deleted_at" IS NULL)));



CREATE POLICY "courses_select_staff_admin" ON "public"."courses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "courses_select_user" ON "public"."courses" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."enrollments" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."course_id" = "e"."id") AND ("e"."status" = 'active'::"text"))))));



CREATE POLICY "courses_update_staff_admin" ON "public"."courses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."daily_report_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_report_items_modify_own" ON "public"."daily_report_items" USING ((EXISTS ( SELECT 1
   FROM "public"."daily_reports" "dr"
  WHERE (("dr"."id" = "daily_report_items"."daily_report_id") AND ("dr"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."daily_reports" "dr"
  WHERE (("dr"."id" = "daily_report_items"."daily_report_id") AND ("dr"."user_id" = "auth"."uid"())))));



CREATE POLICY "daily_report_items_select_own" ON "public"."daily_report_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."daily_reports" "dr"
  WHERE (("dr"."id" = "daily_report_items"."daily_report_id") AND ("dr"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."daily_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_reports_modify_own" ON "public"."daily_reports" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "daily_reports_select_own" ON "public"."daily_reports" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."enrollments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enrollments_insert_self" ON "public"."enrollments" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "enrollments_insert_staff_admin" ON "public"."enrollments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "enrollments_select_self" ON "public"."enrollments" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "enrollments_select_staff_admin" ON "public"."enrollments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "enrollments_update_self" ON "public"."enrollments" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "enrollments_update_staff_admin" ON "public"."enrollments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lessons_delete_admin" ON "public"."lessons" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "lessons_insert_staff_admin" ON "public"."lessons" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "lessons_select_staff_admin" ON "public"."lessons" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "lessons_select_user" ON "public"."lessons" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."enrollments" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."course_id" = "lessons"."course_id") AND ("e"."status" = 'active'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."progress" "pr"
  WHERE (("pr"."user_id" = "auth"."uid"()) AND ("pr"."lesson_id" = "lessons"."id") AND ("pr"."is_unlocked" IS TRUE))))));



CREATE POLICY "lessons_select_user_published_all" ON "public"."lessons" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"text") AND ("deleted_at" IS NULL)));



CREATE POLICY "lessons_update_staff_admin" ON "public"."lessons" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."monthly_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "monthly_goals_modify_own" ON "public"."monthly_goals" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "monthly_goals_select_own" ON "public"."monthly_goals" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_self_insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_self_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_staff_admin_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "me"
  WHERE (("me"."id" = "auth"."uid"()) AND (("me"."role")::"text" = ANY (ARRAY[('staff'::character varying)::"text", ('admin'::character varying)::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "me"
  WHERE (("me"."id" = "auth"."uid"()) AND (("me"."role")::"text" = ANY (ARRAY[('staff'::character varying)::"text", ('admin'::character varying)::"text"]))))));



ALTER TABLE "public"."progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "progress_insert_self" ON "public"."progress" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "progress_insert_staff_admin" ON "public"."progress" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "progress_select_self" ON "public"."progress" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "progress_select_staff_admin" ON "public"."progress" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "progress_update_self" ON "public"."progress" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "progress_update_staff_admin" ON "public"."progress" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."test_assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "test_assets_delete_admin" ON "public"."test_assets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "test_assets_insert_staff_admin" ON "public"."test_assets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "test_assets_select_staff_admin" ON "public"."test_assets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "test_assets_update_staff_admin" ON "public"."test_assets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."tests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tests_delete_admin" ON "public"."tests" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "tests_insert_staff_admin" ON "public"."tests" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "tests_select_published_user" ON "public"."tests" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"text") AND ("deleted_at" IS NULL)));



CREATE POLICY "tests_select_staff_admin" ON "public"."tests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));



CREATE POLICY "tests_update_staff_admin" ON "public"."tests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'admin'::"text"]))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."dashboard_progress_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."dashboard_progress_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_progress_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_timestamp_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_timestamp_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_timestamp_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ops_delete_user"("target" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ops_delete_user"("target" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ops_delete_user"("target" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ops_list_staff_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."ops_list_staff_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ops_list_staff_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ops_list_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."ops_list_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ops_list_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ops_list_users_with_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."ops_list_users_with_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ops_list_users_with_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ops_set_user_disabled"("target" "uuid", "disabled" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."ops_set_user_disabled"("target" "uuid", "disabled" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ops_set_user_disabled"("target" "uuid", "disabled" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_course_sort_key"("p_course" "uuid", "p_key" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_course_sort_key"("p_course" "uuid", "p_key" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_course_sort_key"("p_course" "uuid", "p_key" integer) TO "service_role";


















GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."chapters" TO "anon";
GRANT ALL ON TABLE "public"."chapters" TO "authenticated";
GRANT ALL ON TABLE "public"."chapters" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_items" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_items" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_items" TO "service_role";



GRANT ALL ON TABLE "public"."daily_reports" TO "anon";
GRANT ALL ON TABLE "public"."daily_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_reports" TO "service_role";



GRANT ALL ON TABLE "public"."enrollments" TO "anon";
GRANT ALL ON TABLE "public"."enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_goals" TO "anon";
GRANT ALL ON TABLE "public"."monthly_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_goals" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."progress" TO "anon";
GRANT ALL ON TABLE "public"."progress" TO "authenticated";
GRANT ALL ON TABLE "public"."progress" TO "service_role";



GRANT ALL ON TABLE "public"."test_assets" TO "anon";
GRANT ALL ON TABLE "public"."test_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."test_assets" TO "service_role";



GRANT ALL ON TABLE "public"."tests" TO "anon";
GRANT ALL ON TABLE "public"."tests" TO "authenticated";
GRANT ALL ON TABLE "public"."tests" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
