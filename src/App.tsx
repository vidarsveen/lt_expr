import { useState } from 'react'
import { DocumentEditor } from './components/DocumentEditor'
import { ToolGroupPicker } from './components/ToolGroupPicker'
import { StudentExamView } from './components/StudentExamView'
import { ExamDemo, ExamQuestionRef } from './pages/ExamDemo'
import { ALL_GROUPS, ToolGroups } from './types/toolConfig'

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
      <h1 className="app-title">LaTeX Math Editor</h1>
      <div className="app-tabs">
        <button
          className={`app-tab ${tab === 'editor' ? 'active' : ''}`}
          onClick={() => switchTab('editor')}
        >
          Free editor
        </button>
        <button
          className={`app-tab ${tab === 'exam' ? 'active' : ''}`}
          onClick={() => switchTab('exam')}
        >
          TMA4100 — 2024 Exam
        </button>
      </div>

      {tab === 'editor' && (
        <div>
          <div style={{ maxWidth: 820, margin: '10px auto', padding: '0 20px' }}>
            <ToolGroupPicker groups={toolGroups} onChange={setToolGroups} />
          </div>
          <DocumentEditor toolGroups={toolGroups} />
        </div>
      )}

      {tab === 'exam' && !activeQuestion && (
        <ExamDemo onTryQuestion={handleTryQuestion} />
      )}

      {tab === 'exam' && activeQuestion && (
        <StudentExamView
          question={activeQuestion}
          onBack={() => setActiveQuestion(null)}
        />
      )}
    </div>
  )
}
