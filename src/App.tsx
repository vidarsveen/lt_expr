import { useState } from 'react'
import { DocumentEditor } from './components/DocumentEditor'
import { StudentExamView } from './components/StudentExamView'
import { LhopitalDemo } from './components/LhopitalDemo'
import { ExamDemo, ExamQuestionRef } from './pages/ExamDemo'

const APP_VERSION = 'v0.5.1'

type Tab = 'editor' | 'exam'

export default function App() {
  const [tab, setTab]               = useState<Tab>('editor')
  const [activeQuestion, setActiveQuestion] = useState<ExamQuestionRef | null>(null)
  const [showDemo, setShowDemo]     = useState(false)

  function handleTryQuestion(ref: ExamQuestionRef) {
    setActiveQuestion(ref)
  }

  function switchTab(t: Tab) {
    setTab(t)
    setActiveQuestion(null)
    setShowDemo(false)
  }

  return (
    <div className="app-root">
      <h1 className="app-title">
        LaTeX Math Editor
        <span className="app-version">{APP_VERSION}</span>
      </h1>

      <nav className="app-tabs" role="tablist" aria-label="Application mode">
        <button
          className={`app-tab ${tab === 'editor' ? 'active' : ''}`}
          role="tab"
          aria-selected={tab === 'editor'}
          aria-controls="panel-editor"
          id="tab-editor"
          onClick={() => switchTab('editor')}
        >
          Free editor
        </button>
        <button
          className={`app-tab ${tab === 'exam' ? 'active' : ''}`}
          role="tab"
          aria-selected={tab === 'exam'}
          aria-controls="panel-exam"
          id="tab-exam"
          onClick={() => switchTab('exam')}
        >
          TMA4100 — 2024 Exam
        </button>
      </nav>

      {tab === 'editor' && (
        <div
          id="panel-editor"
          role="tabpanel"
          aria-labelledby="tab-editor"
          style={{ maxWidth: 710, margin: '10px auto', padding: '0 20px' }}
        >
          <DocumentEditor />
        </div>
      )}

      {tab === 'exam' && !activeQuestion && (
        <div
          id="panel-exam"
          role="tabpanel"
          aria-labelledby="tab-exam"
        >
          <ExamDemo
            onTryQuestion={handleTryQuestion}
            onWatchDemo={() => setShowDemo(true)}
          />
        </div>
      )}

      {tab === 'exam' && activeQuestion && (
        <div
          id="panel-exam"
          role="tabpanel"
          aria-labelledby="tab-exam"
        >
          <StudentExamView
            question={activeQuestion}
            onBack={() => setActiveQuestion(null)}
          />
        </div>
      )}

      {showDemo && <LhopitalDemo onClose={() => setShowDemo(false)} />}
    </div>
  )
}
