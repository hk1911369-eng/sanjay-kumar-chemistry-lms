'use client';

import { useState } from 'react';
import { submitStudentPracticeAnswer } from '@/app/actions/student-practice';

export type StudentPracticeQuestion = {
  question_id: string;
  concept_id: string | null;
  chapter_label: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  options: string[];
  marks: number;
  attempt_count: number;
  last_attempt_at: string | null;
  selection_reason: string;
};

const difficultyLabel: Record<StudentPracticeQuestion['difficulty'], string> = {
  easy: 'Foundation',
  medium: 'Standard',
  hard: 'Challenge',
};

export function StudentPracticeWorkspace({ questions }: { questions: StudentPracticeQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, {
    correct: boolean;
    attemptNumber: number;
    correctOption: number;
    explanation: string;
    awardedMarks: number;
  }>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const answeredCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter(result => result.correct).length;

  async function submit(questionId: string) {
    const selectedOption = answers[questionId];
    if (!Number.isInteger(selectedOption) || pending) return;
    setPending(questionId);
    setErrors(current => ({ ...current, [questionId]: '' }));
    try {
      const response = await submitStudentPracticeAnswer(questionId, selectedOption);
      if (!response.ok) {
        const messages: Record<typeof response.error, string> = {
          login: 'Please sign in again to continue.',
          invalid: 'Choose one of the available options.',
          already_answered: 'This question has already been submitted.',
          unavailable: 'This question is no longer available for your enrolment.',
          failed: 'Your answer could not be saved. Please try again.',
        };
        setErrors(current => ({ ...current, [questionId]: messages[response.error] }));
      } else {
        setResults(current => ({
          ...current,
          [questionId]: {
            correct: response.isCorrect,
            attemptNumber: response.attemptNumber,
            correctOption: response.correctOption,
            explanation: response.explanation,
            awardedMarks: response.awardedMarks,
          },
        }));
      }
    } catch {
      setErrors(current => ({ ...current, [questionId]: 'A connection error occurred. Please try again.' }));
    } finally {
      setPending(null);
    }
  }

  if (!questions.length) {
    return <section className="practice-empty portal-card">
      <span className="auth-kicker">PRACTICE LIBRARY</span>
      <h2>Your practice set is being prepared</h2>
      <p className="muted">There are no published questions for this course and subject yet. Your teacher can publish concept-linked practice questions here; they will then appear automatically.</p>
    </section>;
  }

  return <div className="practice-workspace">
    <section className="practice-session-summary portal-card" aria-live="polite">
      <div><span className="auth-kicker">YOUR SESSION</span><strong>{answeredCount} / {questions.length}</strong><small>Questions answered</small></div>
      <div><strong>{correctCount}</strong><small>Correct answers</small></div>
      <div><strong>{answeredCount ? Math.round((correctCount / answeredCount) * 100) : '—'}{answeredCount ? '%' : ''}</strong><small>Current accuracy</small></div>
      <div className="practice-progress-track" role="progressbar" aria-label="Practice completion" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount}>
        <span style={{ width: (answeredCount / questions.length * 100) + '%' }}/>
      </div>
    </section>

    {questions.map((question, index) => {
      const result = results[question.question_id];
      return <article className="practice-question-card portal-card" key={question.question_id}>
        <header className="practice-question-header">
          <span className="auth-kicker">QUESTION {index + 1} · {difficultyLabel[question.difficulty]}</span>
          <span className="practice-marks">{question.marks} mark{question.marks === 1 ? '' : 's'}</span>
        </header>
        {(question.chapter_label || question.topic) && <p className="practice-topic">{[question.chapter_label, question.topic].filter(Boolean).join(' · ')}</p>}
        <p className="muted"><b>Why this question:</b> {question.selection_reason}</p>
        {question.attempt_count > 0 && <p className="muted">Review question · previously attempted {question.attempt_count} time{question.attempt_count === 1 ? '' : 's'}{question.last_attempt_at ? ` · last attempt ${new Date(question.last_attempt_at).toLocaleDateString('en-GB')}` : ''}</p>}
        <h2>{question.question_text}</h2>
        <fieldset className="practice-options" disabled={Boolean(result) || pending === question.question_id}>
          <legend className="sr-only">Choose your answer</legend>
          {question.options.map((option, optionIndex) => {
            const selected = answers[question.question_id] === optionIndex;
            const correct = result?.correctOption === optionIndex;
            return <label
              className={[
                'practice-option',
                selected ? 'is-selected' : '',
                result && correct ? 'is-correct' : '',
                result && selected && !result.correct ? 'is-incorrect' : '',
              ].filter(Boolean).join(' ')}
              key={optionIndex}
            >
              <input
                type="radio"
                name={'practice-' + question.question_id}
                value={optionIndex}
                checked={selected}
                onChange={() => setAnswers(current => ({ ...current, [question.question_id]: optionIndex }))}
              />
              <span className="practice-option-letter">{String.fromCharCode(65 + optionIndex)}</span>
              <span>{option}</span>
              {result && correct && <b className="practice-option-state">Correct</b>}
              {result && selected && !result.correct && <b className="practice-option-state">Your answer</b>}
            </label>;
          })}
        </fieldset>

        {errors[question.question_id] && <p className="form-error" role="alert">{errors[question.question_id]}</p>}
        {!result ? <button
          type="button"
          className="practice-submit-button"
          disabled={answers[question.question_id] === undefined || pending !== null}
          onClick={() => void submit(question.question_id)}
        >{pending === question.question_id ? 'Checking answer…' : 'Check answer'}</button> : <section className={result.correct ? 'practice-feedback is-correct' : 'practice-feedback is-incorrect'} aria-live="polite">
          <strong>{result.correct ? 'Correct — well done.' : 'Not quite. Review the explanation.'}</strong>
          <p>{result.explanation || 'Review the correct option and revisit this concept in your next study session.'}</p>
          <small>{result.awardedMarks} / {question.marks} marks · {result.attemptNumber === 1 ? 'Initial evidence recorded' : 'Retake recorded; this repeat does not inflate mastery evidence'}</small>
        </section>}
      </article>;
    })}
  </div>;
}
