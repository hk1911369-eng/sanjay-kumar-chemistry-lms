import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';
import { mapLessonToConcept, saveAcademicSubject, saveConceptPrerequisite, saveLearningConcept } from '@/app/actions/learning-os';

type SearchParams = Promise<{
  error?: string; subject_saved?: string; concept_saved?: string;
  prerequisite_saved?: string; lesson_mapped?: string;
}>;

export default async function LearningGraphAdmin({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');

  const [subjectsResult, conceptsResult, prerequisitesResult, coursesResult, lessonsResult, linksResult] = await Promise.all([
    db.from('academic_subjects').select('id,name,slug').order('name'),
    db.from('learning_concepts').select('id,subject_id,parent_id,title,slug,grade_band,exam_tracks,estimated_minutes,is_published').order('subject_id').order('sort_order').order('title'),
    db.from('concept_prerequisites').select('concept_id,prerequisite_concept_id'),
    db.from('courses').select('id,title').is('archived_at', null).order('title'),
    db.from('lessons').select('id,title,course_id').order('title').limit(500),
    db.from('lesson_concepts').select('lesson_id,concept_id'),
  ]);
  const subjects = subjectsResult.data ?? [];
  const concepts = conceptsResult.data ?? [];
  const prerequisites = prerequisitesResult.data ?? [];
  const courses = coursesResult.data ?? [];
  const lessons = lessonsResult.data ?? [];
  const links = linksResult.data ?? [];
  const subjectNames = new Map(subjects.map(subject => [subject.id, subject.name]));
  const courseNames = new Map(courses.map(course => [course.id, course.title]));
  const prerequisiteCounts = new Map<string, number>();
  for (const edge of prerequisites) prerequisiteCounts.set(edge.concept_id, (prerequisiteCounts.get(edge.concept_id) ?? 0) + 1);

  const errorMessages: Record<string, string> = {
    subject: 'The subject could not be saved. Check the name and make sure it is not already in the catalogue.',
    concept: 'The concept could not be saved. Check the subject, title and fields.',
    parent: 'A parent concept must belong to the same subject.',
    prerequisite: 'The prerequisite could not be saved. Check both concepts.',
    cycle: 'That prerequisite would create a circular dependency. The graph was not changed.',
    lesson_map: 'The lesson-to-concept mapping could not be saved.',
    subject_mismatch: 'This lesson belongs to a course that does not include the concept subject.',
  };

  return <PortalLayout role="admin" active="learning-graph" title="Subject and concept graph" returnTo="/admin">
    <section className="portal-content">
      <div className="studio-heading">
        <div><span className="auth-kicker">LEARNING OS · KNOWLEDGE GRAPH</span><h1>Subjects & concept graph</h1>
          <p className="muted">Build a reusable knowledge map across every subject. Concepts can be linked to lessons, ordered by prerequisites and reused across courses.</p>
        </div>
        <Link className="quiet-button" href="/admin">Back to admin</Link>
      </div>
      {params.error && <p className="form-error">{errorMessages[params.error] ?? 'The requested change could not be saved.'}</p>}
      {(params.subject_saved || params.concept_saved || params.prerequisite_saved || params.lesson_mapped) && <p className="form-success">Learning catalogue updated successfully.</p>}

      <div className="portal-stats">
        <article><b>{subjects.length}</b><span>Subjects</span></article>
        <article><b>{concepts.length}</b><span>Concepts</span></article>
        <article><b>{prerequisites.length}</b><span>Prerequisite links</span></article>
        <article><b>{links.length}</b><span>Lesson mappings</span></article>
      </div>

      <div className="portal-grid">
        <article className="portal-card">
          <h2>Add a subject</h2>
          <form action={saveAcademicSubject} className="auth-form">
            <label>Subject name<input name="name" required maxLength={100} placeholder="e.g. Mathematics / বাংলা"/></label>
            <label>Description<textarea name="description" rows={2} maxLength={2000}/></label>
            <button className="auth-submit">Add subject</button>
          </form>
        </article>
        <article className="portal-card">
          <h2>Add a concept</h2>
          <form action={saveLearningConcept} className="auth-form">
            <label>Subject<select name="subject_id" required defaultValue=""><option value="" disabled>Select subject</option>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
            <label>Concept title<input name="title" required maxLength={180} placeholder="e.g. Linear equations"/></label>
            <label>Parent concept (optional)<select name="parent_id" defaultValue=""><option value="">No parent</option>{concepts.map(concept=><option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id)} · {concept.title}</option>)}</select></label>
            <label>Grade band<select name="grade_band" defaultValue="higher_secondary"><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="higher_secondary">Higher secondary</option><option value="university">University</option><option value="general">General</option></select></label>
            <label>Exam tracks (comma separated)<input name="exam_tracks" placeholder="HSC, Medical, Engineering, Olympiad"/></label>
            <div className="studio-two"><label>Estimated minutes<input name="estimated_minutes" type="number" min="1" max="1440" defaultValue="20"/></label><label>Sort order<input name="sort_order" type="number" min="0" defaultValue="0"/></label></div>
            <label>Description<textarea name="description" rows={3} maxLength={10000}/></label>
            <label className="toggle-label"><input type="checkbox" name="is_published"/> Publish concept for learners</label>
            <button className="auth-submit" disabled={!subjects.length}>Add concept</button>
          </form>
        </article>
      </div>

      <div className="portal-grid">
        <article className="portal-card">
          <h2>Connect prerequisites</h2>
          <p className="muted">“Concept A requires Concept B.” Circular prerequisite chains are rejected.</p>
          <form action={saveConceptPrerequisite} className="auth-form">
            <label>Learning concept<select name="concept_id" required defaultValue=""><option value="" disabled>Select concept</option>{concepts.map(concept=><option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id)} · {concept.title}</option>)}</select></label>
            <label>Prerequisite concept<select name="prerequisite_concept_id" required defaultValue=""><option value="" disabled>Select prerequisite</option>{concepts.map(concept=><option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id)} · {concept.title}</option>)}</select></label>
            <button className="auth-submit" disabled={concepts.length<2}>Add prerequisite link</button>
          </form>
        </article>
        <article className="portal-card">
          <h2>Map a lesson to a concept</h2>
          <p className="muted">Only concepts from subjects assigned to the lesson’s course can be linked.</p>
          <form action={mapLessonToConcept} className="auth-form">
            <label>Lesson<select name="lesson_id" required defaultValue=""><option value="" disabled>Select lesson</option>{lessons.map(lesson=><option key={lesson.id} value={lesson.id}>{courseNames.get(lesson.course_id) ?? 'Course'} · {lesson.title}</option>)}</select></label>
            <label>Concept<select name="concept_id" required defaultValue=""><option value="" disabled>Select concept</option>{concepts.map(concept=><option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id)} · {concept.title}</option>)}</select></label>
            <label>Relevance weight<input name="relevance_weight" type="number" min="0.01" max="1" step="0.01" defaultValue="1"/></label>
            <button className="auth-submit" disabled={!lessons.length || !concepts.length}>Save lesson mapping</button>
          </form>
        </article>
      </div>

      <h2>Knowledge graph catalogue</h2>
      {concepts.length === 0 ? <p className="muted">No concepts yet. Add subjects, then create concepts and connect their prerequisites.</p> :
        <div className="table-scroll"><table><thead><tr><th>Subject</th><th>Concept</th><th>Parent</th><th>Prerequisites</th><th>Grade band</th><th>Exam tracks</th><th>State</th></tr></thead>
          <tbody>{concepts.map(concept=><tr key={concept.id}><td>{subjectNames.get(concept.subject_id) ?? 'Subject'}</td><td><b>{concept.title}</b><br/><small>{concept.slug}</small></td><td>{concepts.find(item=>item.id===concept.parent_id)?.title ?? '—'}</td><td>{prerequisiteCounts.get(concept.id) ?? 0}</td><td>{concept.grade_band.replaceAll('_',' ')}</td><td>{(concept.exam_tracks ?? []).join(', ') || '—'}</td><td>{concept.is_published?'Published':'Draft'}</td></tr>)}</tbody>
        </table></div>}
    </section>
  </PortalLayout>;
}
