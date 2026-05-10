import { useState } from 'react'
import { DocumentEditor } from './components/DocumentEditor'
import { ToolGroupPicker } from './components/ToolGroupPicker'
import { ExamDemo } from './pages/ExamDemo'
import { ALL_GROUPS, ToolGroups } from './types/toolConfig'

type Tab = 'editor' | 'exam'

export default function App() {
  const [tab, setTab] = useState<Tab>('editor')
  const [toolGroups, setToolGroups] = useState<ToolGroups>(ALL_GROUPS)

  function handleTryQuestion(groups: ToolGroups) {
    setToolGroups(groups)
    setTab('editor')
  }

  return (
    <div>
      <h1 className="app-title">LaTeX Math Editor</h1>
      <div className="app-tabs">
        <button
          className={`app-tab ${tab === 'editor' ? 'active' : ''}`}
          onClick={() => setTab('editor')}
        >
          Free editor
        </button>
        <button
          className={`app-tab ${tab === 'exam' ? 'active' : ''}`}
          onClick={() => setTab('exam')}
        >
          TMA4100 — 2024 Exam
        </button>
      </div>

      {tab === 'editor' ? (
        <div>
          <div style={{ maxWidth: 820, margin: '10px auto', padding: '0 20px' }}>
            <ToolGroupPicker groups={toolGroups} onChange={setToolGroups} />
          </div>
          <DocumentEditor toolGroups={toolGroups} />
        </div>
      ) : (
        <ExamDemo onTryQuestion={handleTryQuestion} />
      )}
    </div>
  )
}
