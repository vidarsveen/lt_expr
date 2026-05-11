import { useRef, useEffect, useState, useCallback } from 'react'
import 'mathlive'
import type { MathfieldElement } from 'mathlive'
import { ALL_GROUPS, ToolGroups } from '../types/toolConfig'

interface Props {
  toolGroups?: ToolGroups
  showLatexBar?: boolean
  onLatexChange?: (latex: string) => void
  autoFocus?: boolean
}

export function MathLiveEditor({
  toolGroups = ALL_GROUPS,
  showLatexBar = true,
  onLatexChange,
  autoFocus,
}: Props) {
  const mfRef = useRef<MathfieldElement | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [latex, setLatex] = useState('')
  const [copyDone, setCopyDone] = useState(false)

  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return

    // Show the math virtual keyboard automatically on touch devices
    mf.mathVirtualKeyboardPolicy = 'auto'

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
  }, [onLatexChange, autoFocus])

  // Insert a LaTeX snippet, landing cursor on the first \placeholder{}
  const ins = useCallback((latex: string) => {
    const mf = mfRef.current
    if (!mf) return
    mf.insert(latex, { focus: true, selectionMode: 'placeholder' })
  }, [])

  const showFunctions = toolGroups.calculus

  return (
    <div className="mathlive-wrapper">

      {/* ── Toolbar ── */}
      <div className="editor-toolbar" role="toolbar" aria-label="Math formatting tools">

        {/* Calculus */}
        {toolGroups.calculus && <>
          <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
            onClick={() => ins('\\int_{\\placeholder{}}^{\\placeholder{}} \\placeholder{} \\, d\\placeholder{}')}
            title="Integral (Alt+I)" aria-label="Insert integral">∫</button>
          <button className="toolbar-btn toolbar-btn--lim" onMouseDown={e => e.preventDefault()}
            onClick={() => ins('\\lim_{\\placeholder{} \\to \\placeholder{}} \\placeholder{}')}
            title="Limit" aria-label="Insert limit">lim</button>
          <button className="toolbar-btn toolbar-btn--lim" onMouseDown={e => e.preventDefault()}
            onClick={() => ins('\\left.\\placeholder{}\\right|_{\\placeholder{}}^{\\placeholder{}}')}
            title="Evaluated at [·]" aria-label="Insert evaluated-at brackets">[·]</button>
        </>}

        {/* Algebra */}
        {toolGroups.algebra && <>
          {toolGroups.calculus && <div className="toolbar-separator" aria-hidden="true" />}
          <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
            onClick={() => ins('\\frac{\\placeholder{}}{\\placeholder{}}')}
            title="Fraction (type /)" aria-label="Insert fraction">½</button>
          <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
            onClick={() => ins('\\sqrt{\\placeholder{}}')}
            title="Square root" aria-label="Insert square root">√</button>
          <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
            onClick={() => ins('^{\\placeholder{}}')}
            title="Power (type ^)" aria-label="Insert power">xⁿ</button>
        </>}

        {/* Series */}
        {toolGroups.series && <>
          {(toolGroups.calculus || toolGroups.algebra) && <div className="toolbar-separator" aria-hidden="true" />}
          <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
            onClick={() => ins('\\sum_{\\placeholder{}}^{\\placeholder{}} \\placeholder{}')}
            title="Sum" aria-label="Insert sum">∑</button>
        </>}

        {/* Common functions — shown when calculus tools are active */}
        {showFunctions && <>
          <div className="toolbar-separator" aria-hidden="true" />
          <button className="toolbar-btn toolbar-btn--fn" onMouseDown={e => e.preventDefault()}
            onClick={() => ins('\\sin\\left(\\placeholder{}\\right)')}
            title="sin" aria-label="Insert sine">sin</button>
          <button className="toolbar-btn toolbar-btn--fn" onMouseDown={e => e.preventDefault()}
            onClick={() => ins('\\cos\\left(\\placeholder{}\\right)')}
            title="cos" aria-label="Insert cosine">cos</button>
          <button className="toolbar-btn toolbar-btn--fn" onMouseDown={e => e.preventDefault()}
            onClick={() => ins('\\ln\\left(\\placeholder{}\\right)')}
            title="ln" aria-label="Insert natural log">ln</button>
        </>}

        {/* Undo / Redo */}
        <div className="toolbar-separator" aria-hidden="true" />
        <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
          onClick={() => mfRef.current?.executeCommand('undo')}
          disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">↩</button>
        <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
          onClick={() => mfRef.current?.executeCommand('redo')}
          disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Y)">↪</button>
      </div>

      {/* ── Math field ── */}
      <math-field
        ref={mfRef as React.RefObject<HTMLElement>}
        className="mathlive-field"
        math-virtual-keyboard-policy="auto"
        placeholder="\text{Type or use the buttons above…}"
      />

      {/* ── LaTeX output bar (free editor only) ── */}
      {showLatexBar && (
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
