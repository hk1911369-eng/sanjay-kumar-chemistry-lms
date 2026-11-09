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
export function rankLearningActions(input: {
  revisionTasks: { id: string; title: string; scheduled_for: string; priority: number; course_id: string }[];
  mistakes: { id: string; course_id: string; mistake_type: string; occurrence_count: number; last_seen_at: string }[];
  recommendations: { lessonId: string; lessonTitle: string; courseId: string; conceptTitle: string; masteryScore: number | null; rootCauseFor: string | null }[];
  upcomingExams: { id: string; title: string; course_id: string; starts_at: string; kind: string }[];
  upcomingAssignments: { id: string; title: string; course_id: string; due_at: string }[];
  now?: Date;
  limit?: number;
}): LearningAction[];
