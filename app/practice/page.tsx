import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PortalLayout } from '@/components/portal-layout';
import { StudentPracticeWorkspace, type StudentPracticeQuestion } from '@/components/student-practice-workspace';
import { createClient } from '@/lib/supabase/server';
import { billingMonthEnd, currentBangladeshBillingPeriod } from '@/lib/pricing';

type SearchParams = { course?: string; subject?: string; difficulty?: string; concept?: string };
type PracticeQuestionRow = {
  question_id: string;
  concept_id: string | null;
  chapter_label: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  options: unknown;
  marks: number;
  attempt_count: number;
  last_attempt_at: string | null;
  selection_reason: string;
};

export default async function StudentPracticePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db.from('profiles').select('role,is_active').eq('id', user.id).single();
  if (profile?.is_active !== true || profile.role !== 'student') redirect('/portal');

  const periodEnd = billingMonthEnd(currentBangladeshBillingPeriod());
  const { data: enrollments } = await db.from('enrollments').select('course_id')
    .eq('student_id', user.id).eq('status', 'active')
    .eq('admission_fee_paid', true).gte('paid_through', periodEnd);
  const courseIds = [...new Set((enrollments ?? []).map(item => item.course_id))];

  const { data: courses } = courseIds.length
    ? await db.from('courses').select('id,title').in('id', courseIds).is('archived_at', null).order('title')
    : { data: [] as { id: string; title: string }[] };
  const availableCourses = courses ?? [];
  const courseId = availableCourses.some(course => course.id === params.course)
    ? params.course!
    : (availableCourses[0]?.id ?? '');

  const { data: courseSubjects } = courseId
    ? await db.from('course_subjects').select('subject_id').eq('course_id', courseId)
    : { data: [] as { subject_id: string }[] };
  const subjectIds = [...new Set((courseSubjects ?? []).map(item => item.subject_id))];
  const { data: requestedConcept } = params.concept
    ? await db.from('learning_concepts').select('id,subject_id,title').eq('id', params.concept).maybeSingle()
    : { data: null };
  const concept = requestedConcept && subjectIds.includes(requestedConcept.subject_id) ? requestedConcept : null;
  const { data: subjects } = subjectIds.length
    ? await db.from('academic_subjects').select('id,name').in('id', subjectIds).order('name')
    : { data: [] as { id: string; name: string }[] };
  const availableSubjects = subjects ?? [];
  const subjectId = concept && availableSubjects.some(subject => subject.id === concept.subject_id)
    ? concept.subject_id
    : availableSubjects.some(subject => subject.id === params.subject)
      ? params.subject!
      : (availableSubjects[0]?.id ?? '');

  const difficulty = ['easy', 'medium', 'hard'].includes(params.difficulty ?? '')
    ? params.difficulty!
    : '';
  let questions: StudentPracticeQuestion[] = [];
  let loadError = false;

  if (courseId && subjectId) {
    const { data, error } = await db.rpc('get_student_practice_questions', {
      p_course_id: courseId,
      p_subject_id: subjectId,
      p_difficulty: difficulty || null,
      p_limit: 20,\n      p_concept_id: concept?.id ?? null,
    });
    loadError = Boolean(error);
    questions = ((data ?? []) as PracticeQuestionRow[]).flatMap(row => {
      if (!Array.isArray(row.options) || row.options.length < 2 || row.options.length > 6) return [];
      const options = row.options.filter((option): option is string => typeof option === 'string');
      if (options.length !== row.options.length) return [];
      return [{
        question_id: row.question_id,
        concept_id: row.concept_id,
        chapter_label: row.chapter_label,
        topic: row.topic,
        difficulty: row.difficulty,
        question_text: row.question_text,
        options,
        marks: Number(row.marks),
        attempt_count: Number(row.attempt_count ?? 0),
        last_attempt_at: row.last_attempt_at ?? null,
        selection_reason: row.selection_reason,
      }];
    });
  }

  const selectedCourse = availableCourses.find(course => course.id === courseId);
  const selectedSubject = availableSubjects.find(subject => subject.id === subjectId);

  return <PortalLayout role="student" active="practice" title="Practice studio" returnTo="/student">
    <section className="portal-content student-practice-page">
      <header className="practice-page-heading">
        <span className="auth-kicker">JMT ACADEMY · ADAPTIVE PRACTICE</span>
        <h1>Practice studio</h1>
        <p className="muted">Work through subject-linked questions, get immediate explanations and strengthen your personal learning map with every answer.</p>
      </header>

      <form method="get" className="practice-filter-form portal-card">
        <label>Course
          <select name="course" defaultValue={courseId} required>
            {availableCourses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label>Subject
          <select name="subject" defaultValue={subjectId} required>
            {availableSubjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label>Difficulty
          <select name="difficulty" defaultValue={difficulty}>
            <option value="">All levels</option>
            <option value="easy">Foundation</option>
            <option value="medium">Standard</option>
            <option value="hard">Challenge</option>
          </select>
        </label>
        <button type="submit" disabled={!courseId || !subjectId}>Load practice</button>
      </form>

      {!availableCourses.length ? <section className="portal-card practice-empty">
        <h2>Active course access required</h2>
        <p className="muted">Practice questions are available to students with an active, paid course for the current Bangladesh billing period.</p>
        <Link href="/student#courses">View my courses</Link>
      </section> : !availableSubjects.length ? <section className="portal-card practice-empty">
        <h2>No subject mapping found</h2>
        <p className="muted">This course needs subject mappings before subject-specific practice can be published.</p>
      </section> : loadError ? <section className="portal-card practice-empty">
        <h2>Practice could not be loaded</h2>
        <p className="muted">Your access or the practice service could not be verified. Please refresh or contact your teacher.</p>
      </section> : <>
        <div className="practice-context-line">
          <strong>{selectedCourse?.title}</strong><span>{selectedSubject?.name}</span>
          {concept && <span>Review focus: {concept.title}</span>}
        </div>
        <StudentPracticeWorkspace questions={questions}/>
      </>}
    </section>
  </PortalLayout>;
}
