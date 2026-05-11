import { useState, useCallback, useEffect } from 'react'
import katex from 'katex'
import { DocumentEditor } from './DocumentEditor'
import { ExamQuestionRef } from '../pages/ExamDemo'

interface Props {
  question: ExamQuestionRef
  onBack: () => void
}

export function StudentExamView({ question, onBack }: Props) {
  const storageKey = `exam-draft-${question.number}`
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [hasSavedDraft] = useState(() => Boolean(localStorage.getItem(storageKey)))

  // Auto-save to localStorage whenever the answer changes
  const handleAnswerChange = useCallback((latex: string) => {
    setCurrentAnswer(latex)
    if (latex) {
      localStorage.setItem(storageKey, latex)
    } else {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  // Warn before browser navigation (refresh, close tab) if there is an answer
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (currentAnswer) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [currentAnswer])

  function handleBack() {
    if (currentAnswer) {
      const confirmed = window.confirm(
        'Leave this question? Your answer is saved in this browser, but make sure you have copied your LaTeX before leaving.',
      )
      if (!confirmed) return
    }
    onBack()
  }

  function handleCopyDraft() {
    const draft = localStorage.getItem(storageKey) ?? ''
    if (draft) navigator.clipboard.writeText(draft)
  }

  let questionHtml = ''
  try {
    questionHtml = katex.renderToString(question.questionTex, {
      displayMode: true,
      trust: true,
      throwOnError: false,
    })
  } catch {
    questionHtml = `<span style="color:red">${question.questionTex}</span>`
  }

  return (
    <div className="student-exam-view">
      <header className="student-exam-header">
        <button
          className="student-back-btn"
          onClick={handleBack}
          aria-label="Return to question list"
        >
          ← Questions
        </button>
        <span className="student-q-number" aria-label={`Question ${question.number}`}>
          Oppgave {question.number}
        </span>
        <span className="student-q-title">{question.title}</span>
      </header>

      {hasSavedDraft && !currentAnswer && (
        <div className="student-draft-banner" role="status" aria-live="polite">
          <span>You have a saved draft for this question.</span>
          <button
            className="student-draft-view-btn"
            onClick={handleCopyDraft}
            aria-label="Copy saved draft LaTeX to clipboard"
          >
            Copy draft LaTeX
          </button>
        </div>
      )}

      <div
        className="student-question-display"
        aria-label="Question"
        role="region"
      >
        <div dangerouslySetInnerHTML={{ __html: questionHtml }} />
      </div>

      <section
        className="student-answer-section"
        aria-labelledby="answer-label"
      >
        <div className="student-answer-label" id="answer-label">Your answer</div>
        <DocumentEditor
          toolGroups={question.groups}
          examMode
          onChange={handleAnswerChange}
        />
      </section>
    </div>
  )
}
