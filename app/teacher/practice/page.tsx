import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createStudentPracticeQuestion } from '@/app/actions/student-practice-authoring';
import { createClient } from '@/lib/supabase/server';

type SearchParams = { created?: string; error?: string };

export default async function StaffPracticePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role;
  if (!['admin', 'teacher', 'staff'].includes(role ?? '')) redirect('/portal');

  let courseIds: string[] = [];
  if (role === 'admin') {
    const { data } = await db.from('courses').select('id').is('archived_at', null);
    courseIds = (data ?? []).map(course => course.id);
  } else {
    const { data } = await db.from('course_assignments').select('course_id').eq('teacher_id', user.id);
    courseIds = [...new Set((data ?? []).map(item => item.course_id))];
  }

  const { data: courses } = courseIds.length
    ? await db.from('courses').select('id,title').in('id', courseIds).is('archived_at', null).order('title')
    : { data: [] as { id: string; title: string }[] };
  const { data: mappings } = courseIds.length
    ? await db.from('course_subjects').select('course_id,subject_id').in('course_id', courseIds)
    : { data: [] as { course_id: string; subject_id: string }[] };
  const subjectIds = [...new Set((mappings ?? []).map(mapping => mapping.subject_id))];
  const { data: subjects } = subjectIds.length
    ? await db.from('academic_subjects').select('id,name').in('id', subjectIds).order('name')
    : { data: [] as { id: string; name: string }[] };

  const { data: concepts } = subjectIds.length
    ? await db.from('learning_concepts').select('id,title,subject_id')
      .in('subject_id', subjectIds).eq('is_published', true).order('title')
    : { data: [] as { id: string; title: string; subject_id: string }[] };

  const subjectNames = new Map((subjects ?? []).map(subject => [subject.id, subject.name]));
  const courseNames = new Map((courses ?? []).map(course => [course.id, course.title]));
  const choices = (mappings ?? []).flatMap(mapping => {
    const subjectName = subjectNames.get(mapping.subject_id);
    const courseName = courseNames.get(mapping.course_id);
    return subjectName && courseName
      ? [{ value: mapping.course_id + ':' + mapping.subject_id, label: courseName + ' · ' + subjectName }]
      : [];
  }).sort((a, b) => a.label.localeCompare(b.label));

  return <PortalLayout role={role as 'admin' | 'teacher' | 'staff'} active="practice-library" title="Practice library" returnTo="/teacher">
    <section className="portal-content staff-practice-page">
      <header className="practice-page-heading">
        <span className="auth-kicker">JMT ACADEMY · CONTENT AUTHORING</span>
        <h1>Practice question studio</h1>
        <p className="muted">Create subject-linked questions for enrolled students. Answer keys remain private and are revealed only after a student submits an answer.</p>
      </header>

      {params.created && <p className="form-success">Practice question created successfully.</p>}
      {params.error === 'invalid' && <p className="form-error">Check the question, 2–6 options, correct answer, marks and course mapping.</p>}
      {params.error === 'save' && <p className="form-error">The question could not be saved. Check your course assignment and subject mapping.</p>}

      {!choices.length ? <section className="portal-card practice-empty">
        <h2>No assigned subject mappings</h2>
        <p className="muted">Assign this teaching account to a course and map at least one academic subject before authoring practice questions.</p>
      </section> : <form action={createStudentPracticeQuestion} className="portal-card practice-authoring-form">
        <div className="practice-authoring-intro">
          <h2>New practice question</h2>
          <p className="muted">Questions start as drafts unless you explicitly publish them.</p>
        </div>
        <label>Course and subject
          <select name="course_subject" required defaultValue={choices[0].value}>
            {choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select>
        </label>
        <div className="practice-authoring-grid">
          <label>Chapter <input name="chapter_label" maxLength={160} placeholder="e.g. Current electricity"/></label>
          <label>Topic <input name="topic" maxLength={160} placeholder="e.g. Ohm’s law"/></label>
          <label>Difficulty
            <select name="difficulty" defaultValue="medium">
              <option value="easy">Foundation</option>
              <option value="medium">Standard</option>
              <option value="hard">Challenge</option>
            </select>
          </label>
          <label>Marks <input name="marks" type="number" min="0.01" max="100" step="0.25" defaultValue="1" required/></label>
        </div>
        <label>Question
          <textarea name="question_text" rows={4} maxLength={4000} required placeholder="Write a clear, self-contained question…"/>
        </label>
        <label>Answer options <span className="muted">One option per line; enter 2–6 options.</span>
          <textarea name="options" rows={5} maxLength={6000} required placeholder={'Option A\nOption B\nOption C\nOption D'}/>
        </label>
        <div className="practice-authoring-grid">
          <label>Correct option
            <select name="correct_option" defaultValue="0">
              <option value="0">A — first option</option>
              <option value="1">B — second option</option>
              <option value="2">C — third option</option>
              <option value="3">D — fourth option</option>
              <option value="4">E — fifth option</option>
              <option value="5">F — sixth option</option>
            </select>
          </label>
          <label>Learning concept <span className="muted">Optional; links performance to the adaptive learning map.</span>
            <select name="concept_id" defaultValue="">
              <option value="">No concept mapping</option>
              {(concepts ?? []).map(concept => <option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id) ?? 'Subject'} · {concept.title}</option>)}
            </select>
          </label>
        </div>
        <label>Explanation
          <textarea name="explanation" rows={3} maxLength={4000} placeholder="Explain why the correct option is right…"/>
        </label>
        <label className="practice-publish-toggle">
          <input type="checkbox" name="is_published"/>
          <span><b>Publish immediately</b><small>Students with active paid access can see this question as soon as it is saved.</small></span>
        </label>
        <button type="submit" className="practice-submit-button">Save practice question</button>
      </form>}
    </section>
  </PortalLayout>;
}
