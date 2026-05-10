import katex from 'katex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SlotKey } from '../types/ast'
import { ALL_GROUPS, ToolGroups } from '../types/toolConfig'
import { useEditor } from '../hooks/useEditor'
import { getSlotCursor } from '../utils/astHelpers'
import { astToLatex } from '../utils/astToLatex'
import { rootToLatex } from '../utils/latexExport'
import { SymbolPalette } from './SymbolPalette'

const KATEX_OPTS: katex.KatexOptions = {
  displayMode: true,
  trust: true,
  throwOnError: false,
  macros: {
    '\\cursor': '\\htmlClass{math-cursor}{\\textbf{|}}',
  },
}

interface Props {
  toolGroups?: ToolGroups
  showLatexBar?: boolean
  onLatexChange?: (latex: string) => void
}

export function Editor({ toolGroups = ALL_GROUPS, showLatexBar = true, onLatexChange }: Props) {
  const [showHelp, setShowHelp] = useState(false)
  const helpRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showHelp) return
    function onDown(e: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setShowHelp(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [showHelp])

  const {
    state, textareaRef, focusEditor, handleKeyDown,
    insertIntegralCmd, insertFractionCmd, insertSqrtCmd, insertSumCmd, insertPowerCmd,
    insertLimitCmd, insertEvalCmd, insertTextCmd, setCursor, undo, redo, canUndo, canRedo,
  } = useEditor()

  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element
    const slotEl = target.closest('[class]') as Element | null
    const slotClass = slotEl
      ? Array.from(slotEl.classList).find(c => /^slot-\d+-\w+$/.test(c))
      : null
    if (slotClass) {
      const m = slotClass.match(/^slot-(\d+)-(\w+)$/)
      if (m) {
        const c = getSlotCursor(state.root, m[1], m[2] as SlotKey)
        if (c) { setCursor(c); return }
      }
    }
    focusEditor()
  }, [state.root, focusEditor, setCursor])

  const { root, cursor } = state
  const displayLatex = astToLatex(root, cursor)
  const exportLatex  = rootToLatex(root)

  useEffect(() => { onLatexChange?.(exportLatex) }, [exportLatex, onLatexChange])

  let renderedHtml = ''
  try {
    renderedHtml = katex.renderToString(displayLatex, KATEX_OPTS)
  } catch {
    renderedHtml = `<span style="color:red;font-family:monospace">render error</span>`
  }

  const showSymbolBtn = toolGroups.greek || toolGroups.symbols

  return (
    <div className="editor-wrapper">
      <div className="editor-toolbar">

        {/* ── Calculus group ── */}
        {toolGroups.calculus && <>
          <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
            onClick={insertIntegralCmd} title="Insert integral (Alt+I)">∫</button>
          <button className="toolbar-btn toolbar-btn--lim" onMouseDown={e => e.preventDefault()}
            onClick={insertLimitCmd} title="Insert limit (Alt+L)">lim</button>
          <button className="toolbar-btn toolbar-btn--lim" onMouseDown={e => e.preventDefault()}
            onClick={insertEvalCmd} title="Insert evaluated-at brackets (Alt+E)">[·]</button>
        </>}

        {/* ── Algebra group ── */}
        {toolGroups.algebra && <>
          {(toolGroups.calculus) && <div className="toolbar-separator" />}
          <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
            onClick={insertFractionCmd} title="Insert fraction (Alt+F)">½</button>
          <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
            onClick={insertSqrtCmd} title="Insert square root (Alt+R)">√</button>
          <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
            onClick={insertPowerCmd} title="Insert power (^)">xⁿ</button>
        </>}

        {/* ── Series group ── */}
        {toolGroups.series && <>
          {(toolGroups.calculus || toolGroups.algebra) && <div className="toolbar-separator" />}
          <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
            onClick={insertSumCmd} title="Insert sum (Alt+S)">∑</button>
        </>}

        {/* ── Symbol palette ── */}
        {showSymbolBtn && <>
          {(toolGroups.calculus || toolGroups.algebra || toolGroups.series) && <div className="toolbar-separator" />}
          <SymbolPalette
            onInsert={insertTextCmd}
            showGreek={toolGroups.greek}
            showSymbols={toolGroups.symbols}
          />
        </>}

        {/* ── Edit controls (always shown) ── */}
        <div className="toolbar-separator" />
        <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
          onClick={undo} title="Undo (Ctrl+Z)" disabled={!canUndo}>↩</button>
        <button className="toolbar-btn" onMouseDown={e => e.preventDefault()}
          onClick={redo} title="Redo (Ctrl+Y)" disabled={!canRedo}>↪</button>

        <div className="toolbar-help" ref={helpRef}>
          <button
            className="toolbar-btn toolbar-help-btn"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setShowHelp(h => !h)}
            title="Keyboard shortcuts"
          >?</button>
          {showHelp && (
            <div className="toolbar-help-popover">
              <div className="help-popover-title">Keyboard shortcuts</div>
              {toolGroups.calculus && <div><kbd>Alt+I</kbd> integral &nbsp;·&nbsp; <kbd>Alt+L</kbd> limit &nbsp;·&nbsp; <kbd>Alt+E</kbd> eval [·]</div>}
              {toolGroups.algebra  && <div><kbd>Alt+F</kbd> fraction &nbsp;·&nbsp; <kbd>Alt+R</kbd> √ &nbsp;·&nbsp; <kbd>^</kbd> power</div>}
              {toolGroups.series   && <div><kbd>Alt+S</kbd> sum</div>}
              <div><kbd>Tab</kbd> next slot &nbsp;·&nbsp; <kbd>← →</kbd> move &nbsp;·&nbsp; <kbd>Ctrl+Z/Y</kbd> undo/redo</div>
            </div>
          )}
        </div>
      </div>

      <div className="editor-display" onClick={handleEditorClick}>
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          onKeyDown={handleKeyDown}
          onChange={() => {}}
          value=""
          aria-label="Math editor input"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <div
          className="editor-katex"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </div>

      {showLatexBar && (
        <div className="editor-latex-output">
          <span className="latex-label">LaTeX</span>
          <code className="latex-code">
            {exportLatex || <em>start typing…</em>}
          </code>
          <button
            className="copy-btn"
            onClick={() => navigator.clipboard.writeText(exportLatex)}
            disabled={!exportLatex}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  )
}
