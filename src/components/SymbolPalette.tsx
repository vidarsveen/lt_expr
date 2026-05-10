import { useState, useRef, useEffect } from 'react'

type Symbol = { label: string; latex: string; title: string }

const GREEK: Symbol[] = [
  { label: 'α', latex: '\\alpha',   title: 'alpha' },
  { label: 'β', latex: '\\beta',    title: 'beta' },
  { label: 'γ', latex: '\\gamma',   title: 'gamma' },
  { label: 'δ', latex: '\\delta',   title: 'delta' },
  { label: 'ε', latex: '\\epsilon', title: 'epsilon' },
  { label: 'θ', latex: '\\theta',   title: 'theta' },
  { label: 'λ', latex: '\\lambda',  title: 'lambda' },
  { label: 'μ', latex: '\\mu',      title: 'mu' },
  { label: 'π', latex: '\\pi',      title: 'pi' },
  { label: 'σ', latex: '\\sigma',   title: 'sigma' },
  { label: 'τ', latex: '\\tau',     title: 'tau' },
  { label: 'φ', latex: '\\phi',     title: 'phi' },
  { label: 'ω', latex: '\\omega',   title: 'omega' },
  { label: 'Γ', latex: '\\Gamma',   title: 'Gamma' },
  { label: 'Δ', latex: '\\Delta',   title: 'Delta' },
  { label: 'Θ', latex: '\\Theta',   title: 'Theta' },
  { label: 'Λ', latex: '\\Lambda',  title: 'Lambda' },
  { label: 'Σ', latex: '\\Sigma',   title: 'Sigma' },
  { label: 'Φ', latex: '\\Phi',     title: 'Phi' },
  { label: 'Ω', latex: '\\Omega',   title: 'Omega' },
]

const SYMBOLS: Symbol[] = [
  { label: '∞', latex: '\\infty',   title: 'infinity' },
  { label: '±', latex: '\\pm',      title: 'plus-minus' },
  { label: '∓', latex: '\\mp',      title: 'minus-plus' },
  { label: '≤', latex: '\\leq',     title: 'less or equal' },
  { label: '≥', latex: '\\geq',     title: 'greater or equal' },
  { label: '≠', latex: '\\neq',     title: 'not equal' },
  { label: '≈', latex: '\\approx',  title: 'approximately' },
  { label: '∈', latex: '\\in',      title: 'element of' },
  { label: '∉', latex: '\\notin',   title: 'not element of' },
  { label: '⊂', latex: '\\subset',  title: 'subset' },
  { label: '∪', latex: '\\cup',     title: 'union' },
  { label: '∩', latex: '\\cap',     title: 'intersection' },
  { label: '∅', latex: '\\emptyset',title: 'empty set' },
  { label: '→', latex: '\\to',      title: 'arrow right' },
  { label: '⇒', latex: '\\Rightarrow', title: 'implies' },
  { label: '⇔', latex: '\\Leftrightarrow', title: 'iff' },
  { label: '·', latex: '\\cdot',    title: 'dot product' },
  { label: '×', latex: '\\times',   title: 'times' },
  { label: '∂', latex: '\\partial', title: 'partial' },
  { label: '∇', latex: '\\nabla',   title: 'nabla' },
]

interface Props {
  onInsert: (latex: string) => void
  showGreek?: boolean
  showSymbols?: boolean
}

export function SymbolPalette({ onInsert, showGreek = true, showSymbols = true }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'greek' | 'symbols'>(showGreek ? 'greek' : 'symbols')
  const ref = useRef<HTMLDivElement>(null)

  // If the active tab gets disabled, switch to the other one
  const activeTab = (tab === 'greek' && !showGreek) ? 'symbols'
                  : (tab === 'symbols' && !showSymbols) ? 'greek'
                  : tab

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const symbols = activeTab === 'greek' ? GREEK : SYMBOLS
  const showTabs = showGreek && showSymbols

  return (
    <div className="symbol-palette" ref={ref}>
      <button
        className="toolbar-btn symbol-trigger"
        onMouseDown={e => e.preventDefault()}
        onClick={() => setOpen(o => !o)}
        title="Insert symbol"
      >
        Ω
      </button>
      {open && (
        <div className="symbol-popover">
          {showTabs && (
          <div className="symbol-tabs">
            <button
              className={`symbol-tab ${activeTab === 'greek' ? 'active' : ''}`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => setTab('greek')}
            >
              Greek
            </button>
            <button
              className={`symbol-tab ${activeTab === 'symbols' ? 'active' : ''}`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => setTab('symbols')}
            >
              Symbols
            </button>
          </div>
          )}
          {!showTabs && (
            <div className="symbol-single-label">{activeTab === 'greek' ? 'Greek' : 'Symbols'}</div>
          )}
          <div className="symbol-grid">
            {symbols.map(s => (
              <button
                key={s.latex}
                className="symbol-btn"
                title={s.title}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onInsert(s.latex); setOpen(false) }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
