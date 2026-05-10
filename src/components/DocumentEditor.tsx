import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { DocumentBlock, makeTextBlock, makeMathBlock } from '../types/document'
import { ToolGroups, ALL_GROUPS } from '../types/toolConfig'
import { Editor } from './Editor'

// ─── Text block ───────────────────────────────────────────────────────────────

interface TextBlockProps {
  block: { type: 'text'; id: string; content: string }
  onChange: (id: string, content: string) => void
  onDelete: (id: string) => void
  canDelete: boolean
}

function TextBlockView({ block, onChange, onDelete, canDelete }: TextBlockProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea to content height
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [block.content])

  return (
    <div className="doc-block doc-block--text">
      <textarea
        ref={ref}
        className="doc-text-area"
        value={block.content}
        onChange={e => onChange(block.id, e.target.value)}
        placeholder="Write text here — explanation, reasoning, conclusion…"
        rows={1}
      />
      {canDelete && (
        <button className="doc-block-delete" onClick={() => onDelete(block.id)} title="Remove block">
          ×
        </button>
      )}
    </div>
  )
}

// ─── Math block ───────────────────────────────────────────────────────────────

interface MathBlockProps {
  id: string
  toolGroups: ToolGroups
  onLatexChange: (id: string, latex: string) => void
  onDelete: (id: string) => void
  canDelete: boolean
}

const MathBlockView = memo(function MathBlockView({ id, toolGroups, onLatexChange, onDelete, canDelete }: MathBlockProps) {
  const handleLatexChange = useCallback(
    (latex: string) => onLatexChange(id, latex),
    [id, onLatexChange],
  )

  return (
    <div className="doc-block doc-block--math">
      <Editor
        toolGroups={toolGroups}
        showLatexBar={false}
        onLatexChange={handleLatexChange}
      />
      {canDelete && (
        <button className="doc-block-delete doc-block-delete--math" onClick={() => onDelete(id)} title="Remove block">
          ×
        </button>
      )}
    </div>
  )
})

// ─── Gap between blocks ───────────────────────────────────────────────────────

interface GapProps {
  onInsertText: () => void
  onInsertMath: () => void
}

function BlockGap({ onInsertText, onInsertMath }: GapProps) {
  return (
    <div className="block-gap">
      <div className="block-gap-line" />
      <div className="block-gap-buttons">
        <button className="block-gap-btn" onClick={onInsertText}>+ Text</button>
        <button className="block-gap-btn" onClick={onInsertMath}>+ Math</button>
      </div>
      <div className="block-gap-line" />
    </div>
  )
}

// ─── Document editor ──────────────────────────────────────────────────────────

interface Props {
  toolGroups?: ToolGroups
  examMode?: boolean
}

export function DocumentEditor({ toolGroups = ALL_GROUPS, examMode = false }: Props) {
  const [blocks, setBlocks] = useState<DocumentBlock[]>(() => [makeMathBlock()])
  const [mathLatex, setMathLatex] = useState<Record<string, string>>({})

  const canDelete = blocks.length > 1

  // ── Block mutations ──────────────────────────────────────────────────────────

  function insertAfter(idx: number, block: DocumentBlock) {
    setBlocks(prev => [...prev.slice(0, idx + 1), block, ...prev.slice(idx + 1)])
  }

  function deleteBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setMathLatex(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  function updateText(id: string, content: string) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } as typeof b : b))
  }

  const handleLatexChange = useCallback((id: string, latex: string) => {
    setMathLatex(prev => ({ ...prev, [id]: latex }))
  }, [])

  // ── Full document LaTeX export ───────────────────────────────────────────────

  const fullLatex = blocks
    .map(b => {
      if (b.type === 'text') return b.content.trim()
      const latex = mathLatex[b.id]
      return latex ? `\\[\n${latex}\n\\]` : ''
    })
    .filter(Boolean)
    .join('\n\n')

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={`document-editor${examMode ? ' exam-mode' : ''}`}>
      {blocks.map((block, idx) => (
        <div key={block.id}>
          {block.type === 'text' ? (
            <TextBlockView
              block={block}
              onChange={updateText}
              onDelete={deleteBlock}
              canDelete={canDelete}
            />
          ) : (
            <MathBlockView
              id={block.id}
              toolGroups={toolGroups}
              onLatexChange={handleLatexChange}
              onDelete={deleteBlock}
              canDelete={canDelete}
            />
          )}
          <BlockGap
            onInsertText={() => insertAfter(idx, makeTextBlock())}
            onInsertMath={() => insertAfter(idx, makeMathBlock())}
          />
        </div>
      ))}

      {examMode ? (
        <div className="exam-copy-bar">
          <button
            className="exam-copy-btn"
            onClick={() => navigator.clipboard.writeText(fullLatex)}
            disabled={!fullLatex}
          >
            Copy answer as LaTeX
          </button>
        </div>
      ) : (
        <div className="doc-export-bar">
          <span className="latex-label">Full LaTeX</span>
          <code className="latex-code">{fullLatex || <em>start writing…</em>}</code>
          <button
            className="copy-btn"
            onClick={() => navigator.clipboard.writeText(fullLatex)}
            disabled={!fullLatex}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  )
}
