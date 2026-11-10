import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';
import {
  saveAcademicSubject, saveLearningConcept, saveConceptPrerequisite, mapLessonToConcept,
  createCourseChapter, createCourseLesson, updateDraftCourseLesson, publishCourseChapter, publishCourseLesson,
} from '@/app/actions/learning-os';

type SearchParams = Promise<{
  saved?: string; error?: string; subject_saved?: string; concept_saved?: string;
  prerequisite_saved?: string; lesson_mapped?: string; chapter_saved?: string; lesson_saved?: string; chapter_published?: string; lesson_published?: string; lesson_updated?: string;
}>;

const messages: Record<string,string> = {
  subject: 'Could not save that subject. Check the name and try again.',
  concept: 'Could not save the concept. Check its fields and subject.',
  parent: 'A parent concept must belong to the same subject.',
  prerequisite: 'Could not add that prerequisite. It may already exist or create a cycle.',
  prerequisite_subject: 'A prerequisite must be from the same subject.',
  lesson_map: 'Could not connect the lesson and concept.',
  lesson_subject: 'That lesson belongs to a different subject.',
  subject_mismatch: 'That lesson belongs to a different subject.',
  cycle: 'That prerequisite would create a circular learning path.',
  chapter: 'Could not create that chapter. Check its course and fields.',
  lesson: 'Could not create that lesson. Check its course and fields.',
  lesson_chapter: 'The selected chapter does not belong to that course.',
  chapter_publish: 'Could not publish this chapter.', chapter_content: 'Every chapter lesson needs at least 100 characters of teaching content.',
  chapter_mapping: 'Every chapter lesson must be mapped to a published concept in this course before publishing.',
  lesson_edit: 'Could not save the draft lesson. Check its fields and try again.', lesson_locked: 'Published lessons are locked. Create a reviewed revision rather than editing learner-visible content.',\n  lesson_publish: 'Could not publish this lesson.', lesson_content: 'Add substantive teaching content (at least 100 characters) before publishing.',
  chapter_unpublished: 'Publish the assigned chapter before publishing its lesson.', lesson_mapping: 'Connect this lesson to a published concept in this course before publishing.',
};
const savedMessages: Record<string,string> = {
  subject: 'Subject saved.', concept: 'Concept added to the knowledge graph.',
  prerequisite: 'Prerequisite relationship saved.', lesson_map: 'Lesson connected to the concept.',
  chapter: 'Draft chapter created.', lesson: 'Draft lesson created. Connect it to reviewed concepts before publishing.',
  chapter_published: 'Chapter published after its content and concept mappings passed review checks.',
  lesson_published: 'Lesson published after its content and curriculum mapping passed review checks.',\n  lesson_updated: 'Draft lesson updated. Review its concept mappings again before publication.',
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
    db.from('courses').select('id,title,is_published,programme_group').is('archived_at', null).order('title'),
  ]);
  const subjects = subjectResult.data ?? [];
  const concepts = conceptResult.data ?? [];
  const prerequisites = prerequisiteResult.data ?? [];
  const courses = courseResult.data ?? [];
  const subjectNames = new Map(subjects.map(subject => [subject.id, subject.name]));
  const conceptNames = new Map(concepts.map(concept => [concept.id, concept.title]));
  const courseNames = new Map(courses.map(course => [course.id, course.title]));
  const courseIds = courses.map(course => course.id);
  const [lessonResult, courseSubjectResult, chapterResult] = await Promise.all([
    courseIds.length
      ? db.from('lessons').select('id,title,description,content,video_url,position,course_id,chapter_id,is_published').in('course_id', courseIds).order('title').limit(1000)
      : Promise.resolve({ data: [] as {id:string;title:string;description:string|null;content:string|null;video_url:string|null;position:number;course_id:string;chapter_id:string|null;is_published:boolean}[] }),
    courseIds.length
      ? db.from('course_subjects').select('course_id,subject_id').in('course_id', courseIds)
      : Promise.resolve({ data: [] as {course_id:string;subject_id:string}[] }),
    courseIds.length
      ? db.from('chapters').select('id,title,course_id,sort_order,published').in('course_id', courseIds).order('sort_order')
      : Promise.resolve({ data: [] as {id:string;title:string;course_id:string;sort_order:number;published:boolean}[] }),
  ]);
  const lessons = lessonResult.data ?? [];
  const courseSubjects = courseSubjectResult.data ?? [];
  const chapters = chapterResult.data ?? [];
  const lessonConceptResult = lessons.length
    ? await db.from('lesson_concepts').select('lesson_id,concept_id').in('lesson_id', lessons.map(lesson => lesson.id))
    : { data: [] as {lesson_id:string;concept_id:string}[] };
  const mappedPairs = new Set((lessonConceptResult.data ?? []).map(link => link.lesson_id + ':' + link.concept_id));
  const conceptCountBySubject = new Map<string,number>();
  const publishedCountBySubject = new Map<string,number>();
  const mappedConceptIds = new Set((lessonConceptResult.data ?? []).map(link => link.concept_id));
  const mappedLessonIds = new Set((lessonConceptResult.data ?? []).map(link => link.lesson_id));
  for (const concept of concepts) {
    conceptCountBySubject.set(concept.subject_id, (conceptCountBySubject.get(concept.subject_id) ?? 0) + 1);
    if (concept.is_published) publishedCountBySubject.set(concept.subject_id, (publishedCountBySubject.get(concept.subject_id) ?? 0) + 1);
  }
  const publishedConceptCount = concepts.filter(concept => concept.is_published).length;
  const unmappedPublishedConceptCount = concepts.filter(concept => concept.is_published && !mappedConceptIds.has(concept.id)).length;
  const publishedLessonCount = lessons.filter(lesson => lesson.is_published).length;
  const unmappedPublishedLessonCount = lessons.filter(lesson => lesson.is_published && !mappedLessonIds.has(lesson.id)).length;
  const readinessBlockers = [
    ...(publishedLessonCount === 0 ? ['Add and publish reviewed lessons before enabling learner-facing curriculum recommendations.'] : []),
    ...(publishedConceptCount === 0 ? ['Publish reviewed concepts so learner-facing features have trusted curriculum nodes.'] : []),
    ...(publishedLessonCount > 0 && unmappedPublishedLessonCount > 0 ? [`${unmappedPublishedLessonCount} published lesson(s) still need concept mapping.`] : []),
    ...(publishedConceptCount > 0 && unmappedPublishedConceptCount > 0 ? [`${unmappedPublishedConceptCount} published concept(s) are not connected to any lesson.`] : []),
  ];
  const courseCoverage = courses.map(course => {
    const subjectIds = new Set(courseSubjects.filter(link => link.course_id === course.id).map(link => link.subject_id));
    const courseTrack = (course.programme_group ?? '').toLowerCase();
    const courseConcepts = concepts.filter(concept => subjectIds.has(concept.subject_id)
      && (concept.exam_tracks.length === 0
        || concept.exam_tracks.some((track: string) => courseTrack.includes(track.toLowerCase()))));
    const coursePublishedConcepts = courseConcepts.filter(concept => concept.is_published);
    const courseLessons = lessons.filter(lesson => lesson.course_id === course.id);
    const courseLessonIds = new Set(courseLessons.map(lesson => lesson.id));
    const courseLinks = (lessonConceptResult.data ?? []).filter(link => courseLessonIds.has(link.lesson_id));
    const mappedCourseConceptIds = new Set(courseLinks.map(link => link.concept_id));
    const mappedCourseLessonIds = new Set(courseLinks.map(link => link.lesson_id));
    const mappedPublishedConcepts = coursePublishedConcepts.filter(concept => mappedCourseConceptIds.has(concept.id)).length;
    const publishedLessons = courseLessons.filter(lesson => lesson.is_published);
    const unmappedPublishedLessons = publishedLessons.filter(lesson => !mappedCourseLessonIds.has(lesson.id)).length;
    const ready = publishedLessons.length > 0 && coursePublishedConcepts.length > 0
      && mappedPublishedConcepts === coursePublishedConcepts.length && unmappedPublishedLessons === 0;
    return {
      id: course.id, title: course.title, programmeGroup: course.programme_group,
      isPublished: course.is_published, lessonCount: courseLessons.length,
      publishedLessonCount: publishedLessons.length, mappedLessonCount: publishedLessons.length - unmappedPublishedLessons,
      publishedConceptCount: coursePublishedConcepts.length, mappedPublishedConceptCount: mappedPublishedConcepts, ready,
    };
  });
  const courseCoverageBlockers = courseCoverage.filter(course => !course.ready)
    .map(course => `${course.title}: publish lessons and concepts, then connect every published lesson and concept within this course.`);
  const allReadinessBlockers = [...readinessBlockers, ...courseCoverageBlockers];

  return <PortalLayout role="admin" active="learning-graph" title="Subjects & concept graph" returnTo="/admin/learning">
    <section className="portal-content learning-graph-page">
      <div className="studio-heading">
        <div><span className="auth-kicker">UNIVERSAL CURRICULUM</span><h1>Subjects & concept graph</h1>
          <p className="muted">Build one connected curriculum for every subject. Concepts can be reused across courses without creating subject-specific code.</p></div>
        <Link className="quiet-button" href="/admin/courses">Course studio</Link>
      </div>
      {params.error && <p className="form-error">{messages[params.error] ?? 'The request could not be completed.'}</p>}
      {(params.saved || params.subject_saved || params.concept_saved || params.prerequisite_saved || params.lesson_mapped || params.chapter_saved || params.lesson_saved || params.chapter_published || params.lesson_published || params.lesson_updated) &&
        <p className="form-success">{savedMessages[params.saved || (params.subject_saved ? 'subject' : params.concept_saved ? 'concept' : params.prerequisite_saved ? 'prerequisite' : params.lesson_mapped ? 'lesson_map' : params.chapter_saved ? 'chapter' : params.lesson_saved ? 'lesson' : params.chapter_published ? 'chapter_published' : params.lesson_published ? 'lesson_published' : 'lesson_updated')] ?? 'Saved.'}</p>}

      <div className="learning-graph-stats">
        <article className="portal-card"><strong>{subjects.length}</strong><span>Subjects</span></article>
        <article className="portal-card"><strong>{concepts.length}</strong><span>Concepts</span></article>
        <article className="portal-card"><strong>{publishedConceptCount}</strong><span>Published concepts</span></article>
        <article className="portal-card"><strong>{mappedPairs.size}</strong><span>Lesson connections</span></article>
      </div>

      <article className="portal-card learning-graph-readiness" aria-labelledby="learning-graph-readiness-title">
        <h2 id="learning-graph-readiness-title">Learning graph readiness</h2>
        <p className="muted">This is a curriculum-coverage check, not a student-performance score. Adaptive recommendations should only rely on reviewed, published concepts connected to real lessons.</p>
        <div className="learning-graph-readiness-metrics">
          <span><b>{publishedLessonCount}/{lessons.length}</b> published lessons</span>
          <span><b>{publishedConceptCount}/{concepts.length}</b> concepts published</span>
          <span><b>{mappedPairs.size}</b> lesson–concept links</span>
          <span><b>{unmappedPublishedLessonCount}</b> published lessons without a concept link</span>
        </div>
        {allReadinessBlockers.length > 0 ? <div className="learning-graph-readiness-blockers">
          <b>Work remaining before curriculum-driven adaptation</b>
          <ul>{allReadinessBlockers.map(item => <li key={item}>{item}</li>)}</ul>
        </div> : <p className="form-success">Every course-scoped published lesson and applicable published concept has a curriculum connection. Continue reviewing prerequisite quality before enabling predictive features.</p>}
        <div className="learning-graph-readiness-subjects">
          {subjects.map(subject => {
            const subjectConcepts = conceptCountBySubject.get(subject.id) ?? 0;
            const subjectPublished = publishedCountBySubject.get(subject.id) ?? 0;
            const subjectMapped = concepts.filter(concept => concept.subject_id === subject.id && mappedConceptIds.has(concept.id)).length;
            return <div key={subject.id}>
              <b>{subject.name}</b>
              <span>{subjectPublished}/{subjectConcepts} published · {subjectMapped} concepts connected to lessons</span>
            </div>;
          })}
        </div>
        <h3>Course-by-course curriculum coverage</h3>
        <p className="muted">A concept mapped in one course does not count as covered in another. Each course is checked against its own subject links and lesson connections.</p>
        <div className="learning-graph-readiness-subjects">
          {courseCoverage.map(course => <div key={course.id}>
            <b>{course.title}</b>
            <span>{course.programmeGroup || 'Programme not set'} · {course.isPublished ? 'Published course' : 'Draft course'} · {course.publishedLessonCount}/{course.lessonCount} lessons published · {course.mappedLessonCount} published lessons mapped · {course.mappedPublishedConceptCount}/{course.publishedConceptCount} published concepts connected</span>
            <span>{course.ready ? 'Curriculum coverage complete' : 'Curriculum coverage incomplete'}</span>
          </div>)}
        </div>
      </article>

      <div className="learning-graph-columns">
        <article className="portal-card">
          <h2>Add a subject</h2>
          <p className="muted">Examples: Physics, Biology, Mathematics, English, ICT or any future subject.</p>
          <form action={saveAcademicSubject} className="auth-form">
            <label>Subject name<input name="name" required minLength={2} maxLength={100} placeholder="e.g. Mathematics"/></label>
            <label>Description<textarea name="description" maxLength={1000} rows={2}/></label>
            <button className="auth-submit">Save subject</button>
          </form>
        </article>

        <article className="portal-card">
          <h2>Add a concept</h2>
          <p className="muted">Concepts form the building blocks used by lessons, assessments and adaptive revision.</p>
          {subjects.length === 0 ? <p className="muted">Add a subject first.</p> :
            <form action={saveLearningConcept} className="auth-form">
              <label>Subject<select name="subject_id" required>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
              <label>Concept title<input name="title" required minLength={2} maxLength={180} placeholder="e.g. Linear equations"/></label>
              <label>Parent concept (optional)<select name="parent_id" defaultValue=""><option value="">Top-level concept</option>{concepts.map(concept => <option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id)} · {concept.title}</option>)}</select></label>
              <label>Curriculum level<select name="grade_band" defaultValue="general"><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="higher_secondary">Higher secondary</option><option value="university">University</option><option value="general">General</option></select></label>
              <label>Exam tracks (comma separated)<input name="exam_tracks" placeholder="HSC, Medical, Engineering, Olympiad"/></label>
              <label>Estimated study time (minutes)<input name="estimated_minutes" type="number" min="1" max="1440" defaultValue="20"/></label>
              <label>Sort order<input name="sort_order" type="number" min="0" max="100000" defaultValue="0"/></label>
              <label>Description<textarea name="description" maxLength={4000} rows={3}/></label>
              <label className="toggle-label"><input type="checkbox" name="is_published"/> Publish concept to learners</label>
              <button className="auth-submit">Create concept</button>
            </form>}
        </article>
      </div>


      <div className="learning-graph-columns">
        <article className="portal-card">
          <h2>Create a chapter</h2>
          <p className="muted">Chapters organise a course into teachable units. New chapters stay private drafts until reviewed.</p>
          {!courses.length ? <p className="muted">Create a course first.</p> : <form action={createCourseChapter} className="auth-form">
            <label>Course<select name="course_id" required>{courses.map(course=><option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            <label>Chapter title<input name="title" required minLength={1} maxLength={180}/></label>
            <label>Description<textarea name="description" maxLength={4000} rows={2}/></label>
            <label>Order<input name="sort_order" type="number" min="0" max="100000" defaultValue="0"/></label>
            <button className="auth-submit">Create draft chapter</button>
          </form>}
        </article>
        <article className="portal-card">
          <h2>Create a lesson</h2>
          <p className="muted">Add the actual teaching material here. Lessons are always created unpublished; review and connect them to the correct subject concepts before publication.</p>
          {!courses.length ? <p className="muted">Create a course first.</p> : <form action={createCourseLesson} className="auth-form">
            <label>Course<select name="course_id" required>{courses.map(course=><option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            <label>Chapter (optional)<select name="chapter_id" defaultValue=""><option value="">No chapter</option>{chapters.map(chapter=><option key={chapter.id} value={chapter.id}>{courseNames.get(chapter.course_id)} · {chapter.title}</option>)}</select></label>
            <label>Lesson title<input name="title" required minLength={2} maxLength={180}/></label>
            <label>Short description<textarea name="description" maxLength={4000} rows={2}/></label>
            <label>Lesson content<textarea name="content" maxLength={30000} rows={8} placeholder="Write the lesson notes, explanations, worked examples and learning objectives."/></label>
            <label>Video URL (HTTPS only)<input name="video_url" type="url" placeholder="https://…"/></label>
            <label>Lesson order<input name="position" type="number" min="0" max="100000" defaultValue="0"/></label>
            <button className="auth-submit">Create draft lesson</button>
          </form>}
        </article>
      </div>
      <article className="portal-card">
        <h2>Review and publish curriculum</h2>
        <p className="muted">Publication is gated: chapters require substantive content and every lesson mapped to a published concept from the course&apos;s subjects. Lessons require substantive content, a published chapter when assigned, and a valid published concept mapping.</p>
        <div className="learning-graph-subjects">
          {chapters.map(chapter => <section key={chapter.id}>
            <div><b>{courseNames.get(chapter.course_id)} · {chapter.title}</b><small>{chapter.published ? 'Published chapter' : 'Draft chapter'}</small></div>
            {!chapter.published && <form action={publishCourseChapter}><input type="hidden" name="chapter_id" value={chapter.id}/><button className="auth-submit">Validate and publish chapter</button></form>}
            <ul>{lessons.filter(lesson => lesson.chapter_id === chapter.id).map(lesson => <li key={lesson.id}>
              <span>{lesson.title}</span><small>{lesson.is_published ? 'Published lesson' : 'Draft lesson'}</small>
              {!lesson.is_published && <>
                <details><summary>Edit draft lesson</summary><form action={updateDraftCourseLesson} className="auth-form">
                  <input type="hidden" name="lesson_id" value={lesson.id}/>
                  <label>Lesson title<input name="title" required minLength={2} maxLength={180} defaultValue={lesson.title}/></label>
                  <label>Short description<textarea name="description" maxLength={4000} rows={2} defaultValue={lesson.description ?? ''}/></label>
                  <label>Teaching content<textarea name="content" maxLength={30000} rows={8} defaultValue={lesson.content ?? ''}/></label>
                  <label>Video URL (HTTPS only)<input name="video_url" type="url" defaultValue={lesson.video_url ?? ''}/></label>
                  <label>Chapter<select name="chapter_id" defaultValue={lesson.chapter_id ?? ''}><option value="">No chapter</option>{chapters.filter(item => item.course_id === lesson.course_id).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                  <label>Lesson order<input name="position" type="number" min="0" max="100000" defaultValue={lesson.position}/></label>
                  <button className="quiet-button">Save draft changes</button>
                </form></details>
                <form action={publishCourseLesson}><input type="hidden" name="lesson_id" value={lesson.id}/><button className="quiet-button">Validate and publish lesson</button></form>
              </>}
            </li>)}</ul>
          </section>)}
          {lessons.filter(lesson => !lesson.chapter_id).map(lesson => <section key={lesson.id}>
            <div><b>{courseNames.get(lesson.course_id)} · {lesson.title}</b><small>{lesson.is_published ? 'Published lesson · no chapter' : 'Draft lesson · no chapter'}</small></div>
            {!lesson.is_published && <>
              <details><summary>Edit draft lesson</summary><form action={updateDraftCourseLesson} className="auth-form">
                <input type="hidden" name="lesson_id" value={lesson.id}/>
                <label>Lesson title<input name="title" required minLength={2} maxLength={180} defaultValue={lesson.title}/></label>
                <label>Short description<textarea name="description" maxLength={4000} rows={2} defaultValue={lesson.description ?? ''}/></label>
                <label>Teaching content<textarea name="content" maxLength={30000} rows={8} defaultValue={lesson.content ?? ''}/></label>
                <label>Video URL (HTTPS only)<input name="video_url" type="url" defaultValue={lesson.video_url ?? ''}/></label>
                <label>Chapter<select name="chapter_id" defaultValue=""><option value="">No chapter</option>{chapters.filter(item => item.course_id === lesson.course_id).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                <label>Lesson order<input name="position" type="number" min="0" max="100000" defaultValue={lesson.position}/></label>
                <button className="quiet-button">Save draft changes</button>
              </form></details>
              <form action={publishCourseLesson}><input type="hidden" name="lesson_id" value={lesson.id}/><button className="quiet-button">Validate and publish lesson</button></form>
            </>}
          </section>)}
          {chapters.length === 0 && lessons.length === 0 && <p className="muted">Create a chapter or lesson to begin the review workflow.</p>}
        </div>
      </article>

      <article className="portal-card">
        <h2>Connect prerequisite concepts</h2>
        <p className="muted">Choose the concept students want to learn, then choose what they should understand first. The database rejects cross-subject links and circular dependencies.</p>
        {concepts.length < 2 ? <p className="muted">Create at least two concepts first.</p> :
          <form action={saveConceptPrerequisite} className="learning-graph-form">
            <label>Concept to learn<select name="concept_id" required>{concepts.map(concept => <option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id)} · {concept.title}</option>)}</select></label>
            <label>Prerequisite<select name="prerequisite_concept_id" required>{concepts.map(concept => <option key={concept.id} value={concept.id}>{subjectNames.get(concept.subject_id)} · {concept.title}</option>)}</select></label>
            <button className="auth-submit">Add prerequisite</button>
          </form>}
        <ul className="learning-graph-edge-list">{prerequisites.map((edge,i)=><li key={edge.concept_id+edge.prerequisite_concept_id}>
          <span>{conceptNames.get(edge.prerequisite_concept_id) ?? 'Concept'}</span><span className="learning-graph-arrow">→</span><b>{conceptNames.get(edge.concept_id) ?? 'Concept'}</b>
        </li>)}</ul>
      </article>

      <article className="portal-card">
        <h2>Map a lesson to a concept</h2>
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
