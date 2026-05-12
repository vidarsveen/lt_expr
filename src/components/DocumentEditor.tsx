import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { DocumentBlock, makeTextBlock, makeMathBlock } from '../types/document'
import { MathLiveEditor } from './MathLiveEditor'

// ─── Text block ───────────────────────────────────────────────────────────────

interface TextBlockProps {
  block: { type: 'text'; id: string; content: string }
  onChange: (id: string, content: string) => void
  onDelete: (id: string) => void
  onAutoDelete: (id: string) => void
  canDelete: boolean
  pendingDelete: boolean
  focusOnMount: boolean
}

function TextBlockView({
  block, onChange, onDelete, onAutoDelete, canDelete, pendingDelete, focusOnMount,
}: TextBlockProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea to content height
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [block.content])

  // Focus when newly inserted
  useEffect(() => {
    if (focusOnMount) ref.current?.focus()
  }, [focusOnMount])

  function handleBlur() {
    if (canDelete && !block.content.trim()) onAutoDelete(block.id)
  }

  return (
    <div className="doc-block doc-block--text">
      <textarea
        ref={ref}
        className="doc-text-area"
        value={block.content}
        onChange={e => onChange(block.id, e.target.value)}
        onBlur={handleBlur}
        placeholder="Write your explanation here — approach, reasoning, observations…"
        rows={1}
        aria-label="Text answer"
      />
      {canDelete && (
        <button
          className={`doc-block-delete${pendingDelete ? ' pending' : ''}`}
          onClick={() => onDelete(block.id)}
          title={pendingDelete ? 'Click again to delete' : 'Remove block'}
          aria-label={pendingDelete ? 'Confirm: remove text block' : 'Remove text block'}
        >
          {pendingDelete ? 'Delete?' : '×'}
        </button>
      )}
    </div>
  )
}

// ─── Math block ───────────────────────────────────────────────────────────────

interface MathBlockProps {
  id: string
  onLatexChange: (id: string, latex: string) => void
  onDelete: (id: string) => void
  canDelete: boolean
  pendingDelete: boolean
  focusOnMount: boolean
}

const MathBlockView = memo(function MathBlockView({
  id, onLatexChange, onDelete, canDelete, pendingDelete, focusOnMount,
}: MathBlockProps) {
  const handleLatexChange = useCallback(
    (latex: string) => onLatexChange(id, latex),
    [id, onLatexChange],
  )

  return (
    <div className="doc-block doc-block--math">
      <MathLiveEditor
        showLatexBar={false}
        onLatexChange={handleLatexChange}
        autoFocus={focusOnMount}
      />
      {canDelete && (
        <button
          className={`doc-block-delete doc-block-delete--math${pendingDelete ? ' pending' : ''}`}
          onClick={() => onDelete(id)}
          title={pendingDelete ? 'Click again to delete' : 'Remove block'}
          aria-label={pendingDelete ? 'Confirm: remove math block' : 'Remove math block'}
        >
          {pendingDelete ? 'Delete?' : '×'}
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
    <div className="block-gap" role="group" aria-label="Insert block">
      <div className="block-gap-line" aria-hidden="true" />
      <div className="block-gap-buttons">
        <button
          className="block-gap-btn"
          onClick={onInsertText}
          aria-label="Insert text block"
        >
          + Text
        </button>
        <button
          className="block-gap-btn"
          onClick={onInsertMath}
          aria-label="Insert math block"
        >
          + Math
        </button>
      </div>
      <div className="block-gap-line" aria-hidden="true" />
    </div>
  )
}

// ─── Document editor ──────────────────────────────────────────────────────────

interface Props {
  examMode?: boolean
  onChange?: (latex: string) => void
}

export function DocumentEditor({ examMode = false, onChange }: Props) {
  const [blocks, setBlocks] = useState<DocumentBlock[]>(() =>
    examMode ? [makeTextBlock(), makeMathBlock()] : [makeMathBlock()]
  )
  const [mathLatex, setMathLatex] = useState<Record<string, string>>({})
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [copyDone, setCopyDone] = useState(false)
  const pendingDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canDelete = blocks.length > 1

  // ── Full document LaTeX export ───────────────────────────────────────────────

  const fullLatex = blocks
    .map(b => {
      if (b.type === 'text') return b.content.trim()
      const latex = mathLatex[b.id]
      return latex ? `\\[\n${latex}\n\\]` : ''
    })
    .filter(Boolean)
    .join('\n\n')

  useEffect(() => { onChange?.(fullLatex) }, [fullLatex, onChange])

  // ── Block mutations ──────────────────────────────────────────────────────────

  function insertAfter(idx: number, block: DocumentBlock) {
    setFocusBlockId(block.id)
    setBlocks(prev => [...prev.slice(0, idx + 1), block, ...prev.slice(idx + 1)])
  }

  const handleDelete = useCallback((id: string) => {
    if (pendingDeleteId !== id) {
      if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current)
      setPendingDeleteId(id)
      pendingDeleteTimer.current = setTimeout(() => setPendingDeleteId(null), 2000)
    } else {
      if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current)
      setPendingDeleteId(null)
      setBlocks(prev => prev.filter(b => b.id !== id))
      setMathLatex(prev => { const n = { ...prev }; delete n[id]; return n })
    }
  }, [pendingDeleteId])

  const handleAutoDelete = useCallback((id: string) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev
      return prev.filter(b => b.id !== id)
    })
    setMathLatex(prev => { const n = { ...prev }; delete n[id]; return n })
  }, [])

  function updateText(id: string, content: string) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } as typeof b : b))
  }

  const handleLatexChange = useCallback((id: string, latex: string) => {
    setMathLatex(prev => ({ ...prev, [id]: latex }))
  }, [])

  // ── Copy with feedback ───────────────────────────────────────────────────────

  function handleCopy() {
    navigator.clipboard.writeText(fullLatex)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2000)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={`document-editor${examMode ? ' exam-mode' : ''}`}>
      {blocks.map((block, idx) => (
        <div key={block.id}>
          {block.type === 'text' ? (
            <TextBlockView
              block={block}
              onChange={updateText}
              onDelete={handleDelete}
              onAutoDelete={handleAutoDelete}
              canDelete={canDelete}
              pendingDelete={pendingDeleteId === block.id}
              focusOnMount={focusBlockId === block.id}
            />
          ) : (
            <MathBlockView
              id={block.id}
              onLatexChange={handleLatexChange}
              onDelete={handleDelete}
              canDelete={canDelete}
              pendingDelete={pendingDeleteId === block.id}
              focusOnMount={focusBlockId === block.id}
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
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {copyDone ? 'Answer copied to clipboard' : ''}
          </span>
          <button
            className={`exam-copy-btn${copyDone ? ' copied' : ''}`}
            onClick={handleCopy}
            disabled={!fullLatex}
            aria-label="Copy full solution as LaTeX to clipboard"
          >
            {copyDone ? '✓ Copied!' : 'Copy full solution as LaTeX'}
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
            aria-label="Copy full LaTeX to clipboard"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  )
}
