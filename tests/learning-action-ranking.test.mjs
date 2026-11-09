import test from 'node:test';
import assert from 'node:assert/strict';
import { rankLearningActions } from '../lib/learning-action-ranking.mjs';

const now = new Date('2026-11-09T00:00:00.000Z');

test('adaptive action ranking combines revision, mistakes, lessons and assessments', () => {
  const actions = rankLearningActions({
    now,
    revisionTasks: [{ id: 'r1', title: 'Revise equilibrium', scheduled_for: '2026-11-07T00:00:00.000Z', priority: 5, course_id: 'c1' }],
    mistakes: [{ id: 'm1', course_id: 'c1', mistake_type: 'concept_gap', occurrence_count: 3, last_seen_at: '2026-11-08T00:00:00.000Z' }],
    recommendations: [{ lessonId: 'l1', lessonTitle: 'Chemical bonding', courseId: 'c1', conceptTitle: 'Ionic bond', masteryScore: 0.3, rootCauseFor: null }],
    upcomingExams: [{ id: 'e1', title: 'Chapter test', course_id: 'c1', starts_at: '2026-11-12T00:00:00.000Z', kind: 'Quiz' }],
    upcomingAssignments: [{ id: 'a1', title: 'Worksheet', course_id: 'c1', due_at: '2026-11-10T00:00:00.000Z' }],
  });
  assert.deepEqual(actions.map(action => action.kind), ['revision', 'mistake', 'assignment', 'exam', 'lesson']);
});

test('overdue mastery reviews enter the queue and rank by urgency', () => {
  const actions = rankLearningActions({
    now, revisionTasks: [], mistakes: [], recommendations: [],
    dueReviews: [{ lessonId: 'l-review', lessonTitle: 'Atomic structure', courseId: 'c1', conceptTitle: 'Electron configuration', masteryScore: 0.4, next_review_at: '2026-11-06T00:00:00.000Z' }],
    upcomingExams: [], upcomingAssignments: [],
  });
  assert.equal(actions.length, 1);
  assert.equal(actions[0].kind, 'review');
  assert.match(actions[0].detail, /overdue by 3 day/);
});

test('ranking excludes distant or expired assessment actions and respects limit', () => {
  const actions = rankLearningActions({
    now,
    revisionTasks: [],
    mistakes: [],
    recommendations: [],
    dueReviews: [],
    upcomingExams: [
      { id: 'past', title: 'Past', course_id: 'c1', starts_at: '2026-11-08T00:00:00.000Z', kind: 'Quiz' },
      { id: 'far', title: 'Far', course_id: 'c1', starts_at: '2026-12-15T00:00:00.000Z', kind: 'Quiz' },
    ],
    upcomingAssignments: [{ id: 'a1', title: 'Soon', course_id: 'c1', due_at: '2026-11-10T00:00:00.000Z' }],
    limit: 1,
  });
  assert.equal(actions.length, 1);
  assert.equal(actions[0].id, 'assignment:a1');
});
