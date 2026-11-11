"use client";

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { saveWrittenExamDraft, submitWrittenExam } from '@/app/actions/academic';

type Question = {
  id: string;
  position: number;
  question_type: 'mcq' | 'short_answer' | 'long_answer';
  question_text: string;
  options: string[];
  marks: number;
};

type SaveState = 'saved' | 'saving' | 'error' | 'conflict';

export function WrittenExamAttempt({
  examId,
  title,
  instructions,
  questions,
  initialAnswers,
  initialVersion,
  initialSavedAt,
}: {
  examId: string;
  title: string;
  instructions: string;
  questions: Question[];
  initialAnswers: Record<string, string>;
  initialVersion: number;
  initialSavedAt: string | null;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  const answersRef = useRef(answers);
  const versionRef = useRef(initialVersion);
  const hasEditsRef = useRef(false);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const resubmitRef = useRef(false);
  const persistRef = useRef<() => Promise<boolean>>(async () => true);

  persistRef.current = async () => {
    if (!hasEditsRef.current) return true;

    if (inFlightRef.current) {
      const previousSaveSucceeded = await inFlightRef.current;
      if (!previousSaveSucceeded) return false;
      if (!hasEditsRef.current) return true;
    }

    const snapshot = { ...answersRef.current };
    const request = (async () => {
      const result = await saveWrittenExamDraft(examId, snapshot, versionRef.current);
      if (result.ok) {
        versionRef.current = result.version;
        hasEditsRef.current = JSON.stringify(snapshot) !== JSON.stringify(answersRef.current);
        setSavedAt(result.savedAt);
        setSaveState('saved');
        return true;
      }
      setSaveState(result.conflict ? 'conflict' : 'error');
      return false;
    })();

    inFlightRef.current = request;
    const succeeded = await request;
    if (inFlightRef.current === request) inFlightRef.current = null;
    return succeeded;
  };

  useEffect(() => {
    if (!hasEditsRef.current) return;
    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [answers]);

  function changeAnswer(questionId: string, value: string) {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;
    hasEditsRef.current = true;
    setAnswers(next);
    setSaveState('saving');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (resubmitRef.current) {
      resubmitRef.current = false;
      return;
    }

    event.preventDefault();
    const form = event.currentTarget;
    const saved = await persistRef.current();
    if (!saved) return;

    resubmitRef.current = true;
    form.requestSubmit();
  }

  const statusText = saveState === 'saving'
    ? 'Saving your answers…'
    : saveState === 'error'
      ? 'Autosave failed. Check your connection and try saving again before leaving this exam.'
      : saveState === 'conflict'
        ? 'A newer draft exists in another session. This save was blocked to protect the newer version. Copy any recent text before refreshing.'
        : savedAt
          ? `All changes saved at ${new Date(savedAt).toLocaleTimeString('en-BD', { timeZone: 'Asia/Dhaka' })} (Bangladesh time).`
          : 'Your answers will be saved automatically as you work.';

  return (
    <form action={submitWrittenExam} onSubmit={handleSubmit} className="auth-form portal-card">
      <h3>{title}</h3>
      {instructions && <p>{instructions}</p>}
      <input type="hidden" name="exam_id" value={examId} />
      {questions.map((question) => (
        <fieldset key={question.id} className="portal-card">
          <legend>{question.position}. {question.question_text} ({question.marks} marks)</legend>
          {question.question_type === 'mcq'
            ? question.options.map((option, index) => (
              <label className="toggle-label" key={index}>
                <input
                  type="radio"
                  name={`answer_${question.id}`}
                  value={option}
                  checked={answers[question.id] === option}
                  onChange={() => changeAnswer(question.id, option)}
                  required
                />
                {option}
              </label>
            ))
            : (
              <label>
                Your answer
                <textarea
                  name={`answer_${question.id}`}
                  rows={question.question_type === 'long_answer' ? 8 : 4}
                  maxLength={12000}
                  value={answers[question.id] ?? ''}
                  onChange={(event) => changeAnswer(question.id, event.target.value)}
                  required
                />
              </label>
            )}
          <input type="hidden" name={`answer_${question.id}`} value={answers[question.id] ?? ''} />
        </fieldset>
      ))}
      <p className="muted" role="status" aria-live="polite">{statusText}</p>
      {(saveState === 'error' || saveState === 'conflict') && (
        <button type="button" className="quiet-button" onClick={() => void persistRef.current()}>
          {saveState === 'conflict' ? 'Try saving against the latest version' : 'Try saving now'}
        </button>
      )}
      <p className="muted">Your saved draft can be restored if you refresh or reconnect before the exam closes. Final submission cannot be changed.</p>
      <button className="auth-submit" type="submit">Submit written exam</button>
    </form>
  );
}
