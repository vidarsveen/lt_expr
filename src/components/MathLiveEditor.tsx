import { useRef, useEffect, useState, useCallback, Fragment } from 'react'
import 'mathlive'
import type { MathfieldElement } from 'mathlive'
import { MATH_TOOLS, VK_LAYOUT } from '../config/mathTools'

// Configure MathLive's virtual keyboard once per session
let vkReady = false
function ensureVK() {
  if (vkReady || typeof window === 'undefined') return
  window.mathVirtualKeyboard.layouts = [VK_LAYOUT]
  vkReady = true
}

interface Props {
  showLatexBar?: boolean
  onLatexChange?: (latex: string) => void
  autoFocus?: boolean
  readOnly?: boolean
  highlightToolId?: string | null
}

export function MathLiveEditor({
  showLatexBar = true,
  onLatexChange,
  autoFocus,
  readOnly = false,
  highlightToolId = null,
}: Props) {
  const mfRef = useRef<MathfieldElement | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [latex, setLatex] = useState('')
  const [copyDone, setCopyDone] = useState(false)

  useEffect(() => {
    ensureVK()
  }, [])

  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return

    mf.mathVirtualKeyboardPolicy = readOnly ? 'manual' : 'auto'
    if (readOnly) {
      mf.readOnly = true
      return
    }

    function onInput() {
      const val = mf!.value
      setLatex(val)
      onLatexChange?.(val)
    }

    function onUndoChange() {
      setCanUndo(mf!.canUndo())
      setCanRedo(mf!.canRedo())
    }

    mf.addEventListener('input', onInput)
    mf.addEventListener('undo-state-change', onUndoChange)

    if (autoFocus) mf.focus()

    return () => {
      mf.removeEventListener('input', onInput)
      mf.removeEventListener('undo-state-change', onUndoChange)
    }
  }, [onLatexChange, autoFocus, readOnly])

  // Insert LaTeX, re-focusing the field first (fixes keyboard-tab-then-Enter flow)
  const ins = useCallback((insertLatex: string) => {
    const mf = mfRef.current
    if (!mf || readOnly) return
    mf.focus()
    mf.insert(insertLatex, { focus: true, selectionMode: 'placeholder' })
  }, [readOnly])

  function toolbarKeyDown(e: React.KeyboardEvent, insertLatex: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      ins(insertLatex)
    }
  }

  function undoRedoKeyDown(e: React.KeyboardEvent, cmd: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const mf = mfRef.current
      if (!mf) return
      mf.focus()
      mf.executeCommand(cmd as any)
    }
  }

  return (
    <div className="mathlive-wrapper">

      {/* Toolbar */}
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="Math formatting tools"
        style={readOnly ? { pointerEvents: 'none' } : undefined}
      >
        {MATH_TOOLS.map(tool => (
          <Fragment key={tool.id}>
            {tool.separatorBefore && <div className="toolbar-separator" aria-hidden="true" />}
            <button
              className={`toolbar-btn ${tool.btnClass ?? ''} ${highlightToolId === tool.id ? 'demo-highlighted' : ''}`}
              title={tool.title}
              aria-label={tool.ariaLabel}
              disabled={readOnly}
              onMouseDown={e => e.preventDefault()}
              onClick={() => ins(tool.insertLatex)}
              onKeyDown={e => toolbarKeyDown(e, tool.insertLatex)}
            >
              {tool.label}
            </button>
          </Fragment>
        ))}

        <div className="toolbar-separator" aria-hidden="true" />
        <button
          className="toolbar-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => mfRef.current?.executeCommand('undo')}
          onKeyDown={e => undoRedoKeyDown(e, 'undo')}
          disabled={!canUndo || readOnly}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
        >↩</button>
        <button
          className="toolbar-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => mfRef.current?.executeCommand('redo')}
          onKeyDown={e => undoRedoKeyDown(e, 'redo')}
          disabled={!canRedo || readOnly}
          aria-label="Redo"
          title="Redo (Ctrl+Y)"
        >↪</button>
      </div>

      {/* Math field */}
      <math-field
        ref={mfRef as React.RefObject<HTMLElement>}
        className="mathlive-field"
        math-virtual-keyboard-policy={readOnly ? 'manual' : 'auto'}
        placeholder={readOnly ? '' : '\\text{Type or use the buttons above…}'}
        read-only={readOnly || undefined}
      />

      {/* LaTeX output bar (free editor only) */}
      {showLatexBar && !readOnly && (
        <div className="editor-latex-output" aria-label="LaTeX output">
          <span className="latex-label">LaTeX</span>
          <code className="latex-code" aria-live="polite" aria-atomic="true">
            {latex || <em>start typing…</em>}
          </code>
          <button
            className={`copy-btn${copyDone ? ' copied' : ''}`}
            disabled={!latex}
            aria-label="Copy LaTeX to clipboard"
            onClick={() => {
              navigator.clipboard.writeText(latex)
              setCopyDone(true)
              setTimeout(() => setCopyDone(false), 2000)
            }}
          >
            {copyDone ? '✓' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
