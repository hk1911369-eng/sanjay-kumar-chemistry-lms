export type LearningActionKind = 'revision' | 'mistake' | 'lesson' | 'exam' | 'assignment';

export type LearningAction = {
  id: string;
  kind: LearningActionKind;
  title: string;
  detail: string;
  courseId: string | null;
  sourceId: string;
  score: number;
  dueAt: string | null;
};

type RevisionInput = { id: string; title: string; scheduled_for: string; priority: number; course_id: string };
type MistakeInput = { id: string; course_id: string; mistake_type: string; occurrence_count: number; last_seen_at: string };
type LessonInput = { lessonId: string; lessonTitle: string; courseId: string; conceptTitle: string; masteryScore: number | null; rootCauseFor: string | null };
type ExamInput = { id: string; title: string; course_id: string; starts_at: string; kind: string };
type AssignmentInput = { id: string; title: string; course_id: string; due_at: string };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function daysUntil(value: string, now: number): number {
  return (new Date(value).getTime() - now) / 86_400_000;
}

/**
 * Ranks concrete study actions from verified platform records. This is a
 * deterministic prioritizer, not an AI prediction or an exam-readiness score.
 */
export function rankLearningActions(input: {
  revisionTasks: RevisionInput[];
  mistakes: MistakeInput[];
  recommendations: LessonInput[];
  upcomingExams: ExamInput[];
  upcomingAssignments: AssignmentInput[];
  now?: Date;
  limit?: number;
}): LearningAction[] {
  const now = (input.now ?? new Date()).getTime();
  const actions: LearningAction[] = [];

  for (const task of input.revisionTasks) {
    const overdueDays = Math.max(0, -daysUntil(task.scheduled_for, now));
    actions.push({
      id: 'revision:' + task.id,
      kind: 'revision',
      title: task.title,
      detail: overdueDays > 0
        ? 'Overdue by ' + Math.floor(overdueDays) + ' day(s) · priority ' + task.priority + '/5'
        : 'Scheduled revision · priority ' + task.priority + '/5',
      courseId: task.course_id,
      sourceId: task.id,
      score: 100 + clamp(overdueDays, 0, 14) + clamp(task.priority, 1, 5) * 4,
      dueAt: task.scheduled_for,
    });
  }

  for (const mistake of input.mistakes) {
    const ageDays = Math.max(0, daysUntil(mistake.last_seen_at, now) * -1);
    actions.push({
      id: 'mistake:' + mistake.id,
      kind: 'mistake',
      title: 'Revisit a ' + mistake.mistake_type.replaceAll('_', ' ') + ' mistake',
      detail: mistake.occurrence_count + ' recorded occurrence(s) · last seen ' + Math.floor(ageDays) + ' day(s) ago',
      courseId: mistake.course_id,
      sourceId: mistake.id,
      score: 82 + clamp(mistake.occurrence_count, 1, 8) * 3 + (ageDays <= 7 ? 4 : 0),
      dueAt: null,
    });
  }

  for (const lesson of input.recommendations) {
    const mastery = lesson.masteryScore === null ? 0 : clamp(lesson.masteryScore, 0, 1);
    actions.push({
      id: 'lesson:' + lesson.lessonId,
      kind: 'lesson',
      title: 'Review: ' + lesson.lessonTitle,
      detail: lesson.conceptTitle + ' · ' + (lesson.rootCauseFor ? 'Prerequisite for ' + lesson.rootCauseFor : lesson.masteryScore === null ? 'Prerequisite evidence is still developing' : Math.round(mastery * 100) + '% measured mastery'),
      courseId: lesson.courseId,
      sourceId: lesson.lessonId,
      score: 62 + (1 - mastery) * 28 + (lesson.rootCauseFor ? 8 : 0),
      dueAt: null,
    });
  }

  for (const exam of input.upcomingExams) {
    const days = daysUntil(exam.starts_at, now);
    if (days < 0 || days > 21) continue;
    actions.push({
      id: 'exam:' + exam.id,
      kind: 'exam',
      title: 'Prepare for ' + exam.kind + ': ' + exam.title,
      detail: 'Starts in ' + Math.max(0, Math.ceil(days)) + ' day(s)',
      courseId: exam.course_id,
      sourceId: exam.id,
      score: 76 + clamp(14 - days, 0, 14),
      dueAt: exam.starts_at,
    });
  }

  for (const assignment of input.upcomingAssignments) {
    const days = daysUntil(assignment.due_at, now);
    if (days < 0 || days > 14) continue;
    actions.push({
      id: 'assignment:' + assignment.id,
      kind: 'assignment',
      title: 'Work on: ' + assignment.title,
      detail: 'Due in ' + Math.max(0, Math.ceil(days)) + ' day(s)',
      courseId: assignment.course_id,
      sourceId: assignment.id,
      score: 86 + clamp(10 - days, 0, 10),
      dueAt: assignment.due_at,
    });
  }

  const unique = new Map<string, LearningAction>();
  for (const action of actions) {
    const current = unique.get(action.id);
    if (!current || action.score > current.score) unique.set(action.id, action);
  }
  return [...unique.values()]
    .sort((a, b) => b.score - a.score || (a.dueAt ?? '').localeCompare(b.dueAt ?? '') || a.id.localeCompare(b.id))
    .slice(0, clamp(input.limit ?? 6, 1, 20));
}
