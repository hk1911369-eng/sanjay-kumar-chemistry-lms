function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function daysUntil(value, now) {
  return (new Date(value).getTime() - now) / 86_400_000;
}

/**
 * Ranks concrete study actions from verified platform records. This is a
 * deterministic prioritizer, not an AI prediction or an exam-readiness score.
 */
export function rankLearningActions(input) {
  const now = (input.now ?? new Date()).getTime();
  const actions = [];

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
    const ageDays = Math.max(0, -daysUntil(mistake.last_seen_at, now));
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


  for (const review of input.dueReviews ?? []) {
    const overdueDays = Math.max(0, -daysUntil(review.next_review_at, now));
    const mastery = clamp(review.masteryScore ?? 0, 0, 1);
    actions.push({
      id: 'review:' + review.lessonId,
      kind: 'review',
      title: 'Spaced review: ' + review.lessonTitle,
      detail: review.conceptTitle + ' · ' + (overdueDays > 0
        ? 'Review overdue by ' + Math.floor(overdueDays) + ' day(s)'
        : 'Scheduled concept review') + ' · ' + Math.round(mastery * 100) + '% measured mastery',
      courseId: review.courseId,
      sourceId: review.lessonId,
      score: 88 + clamp(overdueDays, 0, 14) + (1 - mastery) * 8,
      dueAt: review.next_review_at,
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

  const unique = new Map();
  for (const action of actions) {
    const current = unique.get(action.id);
    if (!current || action.score > current.score) unique.set(action.id, action);
  }
  return [...unique.values()]
    .sort((a, b) => b.score - a.score || (a.dueAt ?? '').localeCompare(b.dueAt ?? '') || a.id.localeCompare(b.id))
    .slice(0, clamp(input.limit ?? 6, 1, 20));
}
