-- Privacy-conscious practical cohort analytics over the last 90 days.
-- The view runs as the caller, preserving RLS on notebook entries and review history.

create index if not exists lab_notebook_review_history_reviewed_at_idx
  on public.lab_notebook_review_history(reviewed_at desc, notebook_id);

create or replace view public.lab_practical_analytics
with (security_invoker = true)
as
select
  n.course_id,
  n.lab_id,
  date_trunc('month', h.reviewed_at at time zone 'Asia/Dhaka')::date as review_month,
  count(distinct h.student_id)::integer as learners_reviewed,
  count(*)::integer as review_rounds,
  count(*) filter (where h.decision = 'reviewed')::integer as graded_reviews,
  count(*) filter (where h.decision = 'returned')::integer as returned_reviews,
  round(
    100.0 * count(*) filter (where h.decision = 'returned') / nullif(count(*), 0),
    1
  ) as return_rate_percent,
  round(avg(h.score) filter (where h.decision = 'reviewed'), 1) as average_score,
  round((
    percentile_cont(0.5) within group (order by h.score)
      filter (where h.decision = 'reviewed')
  )::numeric, 1) as median_score,
  round(avg((h.rubric_scores ->> 'hypothesis')::numeric)
    filter (where h.decision = 'reviewed'), 1) as average_hypothesis,
  round(avg((h.rubric_scores ->> 'method')::numeric)
    filter (where h.decision = 'reviewed'), 1) as average_method,
  round(avg((h.rubric_scores ->> 'observations_measurements')::numeric)
    filter (where h.decision = 'reviewed'), 1) as average_observations_measurements,
  round(avg((h.rubric_scores ->> 'analysis_interpretation')::numeric)
    filter (where h.decision = 'reviewed'), 1) as average_analysis_interpretation,
  round(avg((h.rubric_scores ->> 'conclusion_reflection')::numeric)
    filter (where h.decision = 'reviewed'), 1) as average_conclusion_reflection,
  round(avg((h.rubric_scores ->> 'safety_integrity')::numeric)
    filter (where h.decision = 'reviewed'), 1) as average_safety_integrity
from public.lab_notebook_review_history h
join public.lab_notebook_entries n on n.id = h.notebook_id
where h.reviewed_at >= now() - interval '90 days'
  and h.decision in ('returned','reviewed')
  and (select public.current_role()) in (
    'admin'::public.app_role,
    'teacher'::public.app_role,
    'staff'::public.app_role
  )
group by
  n.course_id,
  n.lab_id,
  date_trunc('month', h.reviewed_at at time zone 'Asia/Dhaka')::date
having count(distinct h.student_id) >= 5;

revoke all on public.lab_practical_analytics from public, anon;
grant select on public.lab_practical_analytics to authenticated;
