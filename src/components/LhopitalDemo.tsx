import { useRef, useEffect, useState } from 'react'
import 'mathlive'
import type { MathfieldElement } from 'mathlive'
import { MATH_TOOLS } from '../config/mathTools'
import { Fragment } from 'react'

interface Step {
  toolId: string | null
  latex: string
  action: string
  annotation: string
}

const STEPS: Step[] = [
  {
    toolId: 'lim',
    latex: String.raw`\lim_{x\to 0}\placeholder{}`,
    action: "1 — Click 'lim' to insert the limit template",
    annotation: "Press Tab (or click the dotted box) to move between placeholders. Fill in x → 0, then move into the body of the limit.",
  },
  {
    toolId: 'frac',
    latex: String.raw`\lim_{x\to 0}\frac{e^x-e^{-x}-2x}{x-\sin\left(x\right)}`,
    action: "2 — Click '½' inside the limit, type numerator and denominator",
    annotation: "Inside the limit placeholder, click '½' to create a fraction. Type the numerator eˣ − e⁻ˣ − 2x, Tab to denominator, type x − sin(x). MathLive renders live.",
  },
  {
    toolId: null,
    latex: String.raw`\lim_{x\to 0}\frac{e^x-e^{-x}-2x}{x-\sin\left(x\right)}`,
    action: "3 — Check the indeterminate form",
    annotation: "Substitute x = 0: numerator = e⁰ − e⁻⁰ − 0 = 0, denominator = 0 − sin 0 = 0. We have 0/0 — L'Hôpital's rule applies.",
  },
  {
    toolId: 'lim',
    latex: String.raw`\lim_{x\to 0}\frac{e^x+e^{-x}-2}{1-\cos\left(x\right)}`,
    action: "4 — First application of L'Hôpital",
    annotation: "Differentiate numerator and denominator: d/dx(eˣ − e⁻ˣ − 2x) = eˣ + e⁻ˣ − 2 and d/dx(x − sin x) = 1 − cos x. Still 0/0.",
  },
  {
    toolId: 'lim',
    latex: String.raw`\lim_{x\to 0}\frac{e^x-e^{-x}}{\sin\left(x\right)}`,
    action: "5 — Second application",
    annotation: "Differentiate again: d/dx(eˣ + e⁻ˣ − 2) = eˣ − e⁻ˣ and d/dx(1 − cos x) = sin x. Still 0/0.",
  },
  {
    toolId: 'lim',
    latex: String.raw`\lim_{x\to 0}\frac{e^x+e^{-x}}{\cos\left(x\right)}=\frac{1+1}{1}=2`,
    action: "6 — Third application → evaluate",
    annotation: "Differentiate once more: numerator → eˣ + e⁻ˣ, denominator → cos x. Now substitute x = 0: (1 + 1) / 1 = 2. ✓  The limit equals 2.",
  },
]

const AUTO_PLAY_MS = 4000

interface Props {
  onClose: () => void
}

export function LhopitalDemo({ onClose }: Props) {
  const mfRef = useRef<MathfieldElement | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const current = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1

  // Sync math field value when step changes
  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return
    mf.value = current.latex
    mf.readOnly = true
    mf.mathVirtualKeyboardPolicy = 'manual'
  }, [stepIdx, current.latex])

  // Auto-play timer
  useEffect(() => {
    if (!playing) return
    timerRef.current = setTimeout(() => {
      if (isLast) {
        setPlaying(false)
      } else {
        setStepIdx(i => i + 1)
      }
    }, AUTO_PLAY_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, stepIdx, isLast])

  function goTo(idx: number) {
    setPlaying(false)
    setStepIdx(idx)
  }

  function playPause() {
    if (isLast) { setStepIdx(0); setPlaying(true) }
    else setPlaying(p => !p)
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="demo-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="L'Hôpital's rule walkthrough"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="demo-panel">

        {/* Header */}
        <header className="demo-header">
          <div>
            <h3 className="demo-title">L'Hôpital's rule — step by step</h3>
            <p className="demo-subtitle">How to solve Oppgave 1 using the editor</p>
          </div>
          <button className="demo-close-btn" onClick={onClose} aria-label="Close demo">×</button>
        </header>

        {/* Step label */}
        <div className="demo-step-action" aria-live="polite" aria-atomic="true">
          {current.action}
        </div>

        {/* Live math field with toolbar — toolbar read-only with highlight */}
        <div className="demo-editor-frame">
          <div
            className="editor-toolbar"
            role="toolbar"
            aria-label="Math formatting tools (read-only demonstration)"
            style={{ pointerEvents: 'none' }}
          >
            {MATH_TOOLS.map(tool => (
              <Fragment key={tool.id}>
                {tool.separatorBefore && <div className="toolbar-separator" aria-hidden="true" />}
                <button
                  className={`toolbar-btn ${tool.btnClass ?? ''} ${current.toolId === tool.id ? 'demo-highlighted' : ''}`}
                  disabled
                  title={tool.title}
                  aria-label={tool.ariaLabel}
                  aria-pressed={current.toolId === tool.id}
                >
                  {tool.label}
                </button>
              </Fragment>
            ))}
            <div className="toolbar-separator" aria-hidden="true" />
            <button className="toolbar-btn" disabled title="Undo">↩</button>
            <button className="toolbar-btn" disabled title="Redo">↪</button>
          </div>
          <math-field
            ref={mfRef as React.RefObject<HTMLElement>}
            className="mathlive-field demo-math-field"
            math-virtual-keyboard-policy="manual"
            read-only=""
          />
        </div>

        {/* Annotation */}
        <p className="demo-annotation">{current.annotation}</p>

        {/* Step dots */}
        <div className="demo-progress" role="tablist" aria-label="Demo steps">
          {STEPS.map((s, i) => (
            <button
              key={s.action}
              className={`demo-dot ${i === stepIdx ? 'active' : i < stepIdx ? 'done' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Step ${i + 1}: ${s.action}`}
              aria-current={i === stepIdx ? 'step' : undefined}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="demo-controls">
          <button
            className="demo-btn"
            onClick={() => goTo(Math.max(0, stepIdx - 1))}
            disabled={stepIdx === 0}
            aria-label="Previous step"
          >← Prev</button>
          <button
            className="demo-btn demo-btn--play"
            onClick={playPause}
            aria-label={playing ? 'Pause auto-play' : isLast ? 'Replay from start' : 'Start auto-play'}
          >
            {playing ? '⏸ Pause' : isLast ? '↺ Replay' : '▶ Play'}
          </button>
          <button
            className="demo-btn"
            onClick={() => goTo(Math.min(STEPS.length - 1, stepIdx + 1))}
            disabled={isLast}
            aria-label="Next step"
          >Next →</button>
        </div>

        <p className="demo-step-count">Step {stepIdx + 1} of {STEPS.length}</p>
      </div>
    </div>
  )
}
