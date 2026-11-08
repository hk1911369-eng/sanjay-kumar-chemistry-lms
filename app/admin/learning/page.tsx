import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';
import {
  createAcademicSubject, createLearningConcept, addConceptPrerequisite, mapLessonToConcept,
} from '@/app/actions/learning-graph';

type SearchParams = Promise<{ saved?: string; error?: string }>;

const messages: Record<string,string> = {
  subject: 'Could not save that subject. Check the name and try again.',
  concept: 'Could not save the concept. Check its fields and subject.',
  parent: 'A parent concept must belong to the same subject.',
  prerequisite: 'Could not add that prerequisite. It may already exist or create a cycle.',
  prerequisite_subject: 'A prerequisite must be from the same subject.',
  lesson_map: 'Could not connect the lesson and concept.',
  lesson_subject: 'That lesson belongs to a different subject.',
};
const savedMessages: Record<string,string> = {
  subject: 'Subject saved.', concept: 'Concept added to the knowledge graph.',
  prerequisite: 'Prerequisite relationship saved.', lesson_map: 'Lesson connected to the concept.',
};

export default async function LearningGraphPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');

  const [subjectResult, conceptResult, prerequisiteResult, courseResult] = await Promise.all([
    db.from('academic_subjects').select('id,name,slug,description').order('name'),
    db.from('learning_concepts').select('id,subject_id,parent_id,title,slug,description,grade_band,exam_tracks,estimated_minutes,is_published').order('title'),
    db.from('concept_prerequisites').select('concept_id,prerequisite_concept_id'),
    db.from('courses').select('id,title').is('archived_at', null).order('title'),
  ]);
  const subjects = subjectResult.data ?? [];
  const concepts = conceptResult.data ?? [];
  const prerequisites = prerequisiteResult.data ?? [];
  const courses = courseResult.data ?? [];
  const subjectNames = new Map(subjects.map(subject => [subject.id, subject.name]));
  const conceptNames = new Map(concepts.map(concept => [concept.id, concept.title]));
  const courseNames = new Map(courses.map(course => [course.id, course.title]));
  const courseIds = courses.map(course => course.id);
  const lessonResult = courseIds.length
    ? await db.from('lessons').select('id,title,course_id').in('course_id', courseIds).order('title').limit(500)
    : { data: [] as {id:string;title:string;course_id:string}[] };
  const lessons = lessonResult.data ?? [];
  const lessonConceptResult = lessons.length
    ? await db.from('lesson_concepts').select('lesson_id,concept_id').in('lesson_id', lessons.map(lesson => lesson.id))
    : { data: [] as {lesson_id:string;concept_id:string}[] };
  const mappedPairs = new Set((lessonConceptResult.data ?? []).map(link => link.lesson_id + ':' + link.concept_id));
  const conceptCountBySubject = new Map<string,number>();
  for (const concept of concepts) conceptCountBySubject.set(concept.subject_id, (conceptCountBySubject.get(concept.subject_id) ?? 0) + 1);

  return <PortalLayout role="admin" active="learning-graph" title="Subjects & concept graph" returnTo="/admin/learning">
    <section className="portal-content learning-graph-page">
      <div className="studio-heading">
        <div><span className="auth-kicker">UNIVERSAL CURRICULUM</span><h1>Subjects & concept graph</h1>
          <p className="muted">Build one connected curriculum for every subject. Concepts can be reused across courses without creating subject-specific code.</p></div>
        <Link className="quiet-button" href="/admin/courses">Course studio</Link>
      </div>
      {params.error && <p className="form-error">{messages[params.error] ?? 'The request could not be completed.'}</p>}
      {params.saved && <p className="form-success">{savedMessages[params.saved] ?? 'Saved.'}</p>}

      <div className="learning-graph-stats">
        <article className="portal-card"><strong>{subjects.length}</strong><span>Subjects</span></article>
        <article className="portal-card"><strong>{concepts.length}</strong><span>Concepts</span></article>
        <article className="portal-card"><strong>{prerequisites.length}</strong><span>Prerequisite links</span></article>
        <article className="portal-card"><strong>{mappedPairs.size}</strong><span>Lesson connections</span></article>
      </div>

      <div className="learning-graph-columns">
        <article className="portal-card">
          <h2>Add a subject</h2>
          <p className="muted">Examples: Physics, Biology, Mathematics, English, ICT or any future subject.</p>
          <form action={createAcademicSubject} className="auth-form">
            <label>Subject name<input name="name" required minLength={2} maxLength={100} placeholder="e.g. Mathematics"/></label>
            <label>Description<textarea name="description" maxLength={1000} rows={2}/></label>
            <button className="auth-submit">Save subject</button>
          </form>
        </article>

        <article className="portal-card">
          <h2>Add a concept</h2>
          <p className="muted">Concepts form the building blocks used by lessons, assessments and adaptive revision.</p>
          {subjects.length === 0 ? <p className="muted">Add a subject first.</p> :
            <form action={createLearningConcept} className="auth-form">
              <label>Subject<select name="subject_id" required>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
              <label>Concept title<input name="title" required minLength={2} maxLength={180} placeholder="e.g. Linear equations"/></label>
              <label>Parent concept (optional)<select name="parent_id" defaultValue=""><option value="">Top-level concept</option>{concepts.map(concept => <option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id)} · {concept.title}</option>)}</select></label>
              <label>Curriculum level<select name="grade_band" defaultValue="general"><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="higher_secondary">Higher secondary</option><option value="university">University</option><option value="general">General</option></select></label>
              <label>Exam tracks (comma separated)<input name="exam_tracks" placeholder="HSC, Medical, Engineering, Olympiad"/></label>
              <label>Estimated study time (minutes)<input name="estimated_minutes" type="number" min="1" max="1440" defaultValue="20"/></label>
              <label>Description<textarea name="description" maxLength={4000} rows={3}/></label>
              <label className="toggle-label"><input type="checkbox" name="is_published"/> Publish concept to learners</label>
              <button className="auth-submit">Create concept</button>
            </form>}
        </article>
      </div>

      <article className="portal-card">
        <h2>Connect prerequisite concepts</h2>
        <p className="muted">Choose the concept students want to learn, then choose what they should understand first. The database rejects cross-subject links and circular dependencies.</p>
        {concepts.length < 2 ? <p className="muted">Create at least two concepts first.</p> :
          <form action={addConceptPrerequisite} className="learning-graph-form">
            <label>Concept to learn<select name="concept_id" required>{concepts.map(concept => <option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id)} · {concept.title}</option>)}</select></label>
            <label>Prerequisite<select name="prerequisite_concept_id" required>{concepts.map(concept => <option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id)} · {concept.title}</option>)}</select></label>
            <button className="auth-submit">Add prerequisite</button>
          </form>}
        <ul className="learning-graph-edge-list">{prerequisites.map((edge,i)=><li key={edge.concept_id+edge.prerequisite_concept_id}>
          <span>{conceptNames.get(edge.prerequisite_concept_id) ?? 'Concept'}</span><span className="learning-graph-arrow">→</span><b>{conceptNames.get(edge.concept_id) ?? 'Concept'}</b>
        </li>)}</ul>
      </article>

      <article className="portal-card">
        <h2>Map lessons to concepts</h2>
        <p className="muted">This connection lets the Learning OS understand which concepts each lesson teaches. Only same-subject course mappings are accepted.</p>
        {!lessons.length || !concepts.length ? <p className="muted">Create a course, add its subject, create concepts and add lessons to enable mapping.</p> :
          <form action={mapLessonToConcept} className="learning-graph-form">
            <label>Lesson<select name="lesson_id" required>{lessons.map(lesson=><option key={lesson.id} value={lesson.id}>{courseNames.get(lesson.course_id)} · {lesson.title}</option>)}</select></label>
            <label>Concept<select name="concept_id" required>{concepts.map(concept=><option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id)} · {concept.title}</option>)}</select></label>
            <label>Relevance weight<input name="relevance_weight" type="number" min="0.01" max="1" step="0.01" defaultValue="1"/></label>
            <button className="auth-submit">Connect lesson</button>
          </form>}
        <p className="muted small-note">{lessons.length} lessons available across {courses.length} active courses. {mappedPairs.size} connections currently saved.</p>
      </article>

      <article className="portal-card">
        <h2>Subject catalogue</h2>
        {subjects.length === 0 ? <p className="muted">No subjects yet. Add the first subject above or create a course in Course studio.</p> :
          <div className="learning-graph-subjects">{subjects.map(subject=><section key={subject.id}>
            <div><b>{subject.name}</b><small>{subject.slug} · {conceptCountBySubject.get(subject.id) ?? 0} concepts</small></div>
            <ul>{concepts.filter(concept=>concept.subject_id===subject.id).map(concept=><li key={concept.id}>
              <span>{concept.title}</span><small>{concept.grade_band.replace('_',' ')} · {concept.exam_tracks.join(', ') || 'General'} · {concept.estimated_minutes} min · {concept.is_published?'Published':'Draft'}</small>
            </li>)}</ul>
          </section>)}</div>}
      </article>
    </section>
  </PortalLayout>;
}
