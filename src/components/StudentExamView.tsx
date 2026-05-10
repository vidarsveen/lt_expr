import katex from 'katex'
import { DocumentEditor } from './DocumentEditor'
import { ExamQuestionRef } from '../pages/ExamDemo'

interface Props {
  question: ExamQuestionRef
  onBack: () => void
}

export function StudentExamView({ question, onBack }: Props) {
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
      <div className="student-exam-header">
        <button className="student-back-btn" onClick={onBack}>← Questions</button>
        <span className="student-q-number">Oppgave {question.number}</span>
        <span className="student-q-title">{question.title}</span>
      </div>

      <div className="student-question-display">
        <div dangerouslySetInnerHTML={{ __html: questionHtml }} />
      </div>

      <div className="student-answer-section">
        <div className="student-answer-label">Your answer</div>
        <DocumentEditor toolGroups={question.groups} examMode />
      </div>
    </div>
  )
}
