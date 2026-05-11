import { useState } from 'react'
import { DocumentEditor } from './components/DocumentEditor'
import { ToolGroupPicker } from './components/ToolGroupPicker'
import { StudentExamView } from './components/StudentExamView'
import { ExamDemo, ExamQuestionRef } from './pages/ExamDemo'
import { ALL_GROUPS, ToolGroups } from './types/toolConfig'

const APP_VERSION = 'v0.3.0'

type Tab = 'editor' | 'exam'

export default function App() {
  const [tab, setTab]               = useState<Tab>('editor')
  const [toolGroups, setToolGroups] = useState<ToolGroups>(ALL_GROUPS)
  const [activeQuestion, setActiveQuestion] = useState<ExamQuestionRef | null>(null)

  function handleTryQuestion(ref: ExamQuestionRef) {
    setActiveQuestion(ref)
  }

  function switchTab(t: Tab) {
    setTab(t)
    setActiveQuestion(null)
  }

  return (
    <div>
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
        >
          <div style={{ maxWidth: 820, margin: '10px auto', padding: '0 20px' }}>
            <ToolGroupPicker groups={toolGroups} onChange={setToolGroups} />
          </div>
          <DocumentEditor toolGroups={toolGroups} />
        </div>
      )}

      {tab === 'exam' && !activeQuestion && (
        <div
          id="panel-exam"
          role="tabpanel"
          aria-labelledby="tab-exam"
        >
          <ExamDemo onTryQuestion={handleTryQuestion} />
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
    </div>
  )
}
