import katex from 'katex'
import { useState } from 'react'
import { ToolGroups, NO_GROUPS, GROUP_META, GroupId } from '../types/toolConfig'

export interface ExamQuestionRef {
  number: string
  title: string
  questionTex: string
}

// ─── Static KaTeX render ──────────────────────────────────────────────────────

function KaTeX({ tex, display = true }: { tex: string; display?: boolean }) {
  let html = ''
  try {
    html = katex.renderToString(tex, {
      displayMode: display,
      trust: true,
      throwOnError: false,
    })
  } catch {
    html = `<span style="color:red">${tex}</span>`
  }
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

// ─── Question card ────────────────────────────────────────────────────────────

interface Step {
  label?: string
  tex: string
}

interface Question {
  number: string
  title: string
  questionTex: string
  suggestedGroups: ToolGroups
  steps: Step[]
  answer: string
}

interface CardProps {
  q: Question
  onTry: (ref: ExamQuestionRef) => void
  onDemo?: () => void
}

function GroupBadge({ id, active }: { id: GroupId; active: boolean }) {
  const { label, preview } = GROUP_META[id]
  return (
    <span
      className={`exam-group-badge ${active ? 'active' : 'inactive'}`}
      aria-label={active ? `${label} tools available` : `${label} tools not needed`}
    >
      {preview}
      <span className="sr-only">{label}{active ? '' : ' (not required)'}</span>
    </span>
  )
}

function QuestionCard({ q, onTry, onDemo }: CardProps) {
  const [showSolution, setShowSolution] = useState(false)
  const solutionId = `solution-${q.number}`
  const headingId  = `heading-${q.number}`

  return (
    <article className="exam-card" aria-labelledby={headingId}>
      <div className="exam-card-header">
        <span className="exam-q-number" aria-hidden="true">Oppgave {q.number}</span>
        <h3 className="exam-q-title" id={headingId}>
          <span className="sr-only">Question {q.number}: </span>
          {q.title}
        </h3>
      </div>

      <div className="exam-question-box" aria-label="Question statement">
        <KaTeX tex={q.questionTex} />
      </div>

      <div className="exam-card-footer">
        <div
          className="exam-tools-used"
          role="group"
          aria-label="Required tool groups"
        >
          <span className="exam-tools-label" aria-hidden="true">Tools:</span>
          {(Object.keys(q.suggestedGroups) as GroupId[]).map(id => (
            <GroupBadge key={id} id={id} active={q.suggestedGroups[id]} />
          ))}
        </div>
        <button
          className="exam-solution-toggle"
          onClick={() => setShowSolution(s => !s)}
          aria-expanded={showSolution}
          aria-controls={solutionId}
          aria-label={showSolution ? `Hide solution for question ${q.number}` : `Show solution for question ${q.number}`}
        >
          {showSolution ? '▾ Hide solution' : '▸ Show solution'}
        </button>
        {onDemo && (
          <button
            className="exam-demo-btn"
            onClick={onDemo}
            aria-label="Watch a step-by-step demo for this question"
          >
            Watch demo
          </button>
        )}
        <button
          className="exam-try-btn"
          onClick={() => onTry({
            number: q.number,
            title: q.title,
            questionTex: q.questionTex,
          })}
          aria-label={`Try question ${q.number} in the editor`}
        >
          Try in editor →
        </button>
      </div>

      {showSolution && (
        <div
          id={solutionId}
          className="exam-solution"
          role="region"
          aria-label={`Solution for question ${q.number}`}
        >
          <div className="exam-solution-label" aria-hidden="true">Solution</div>
          {q.steps.map((s, i) => (
            <div key={i} className="exam-step">
              {s.label && <div className="exam-step-label">{s.label}</div>}
              <KaTeX tex={s.tex} />
            </div>
          ))}
          <div className="exam-answer-box" role="status" aria-label="Final answer">
            <span className="exam-answer-label">Answer</span>
            <KaTeX tex={q.answer} display={false} />
          </div>
        </div>
      )}
    </article>
  )
}

// ─── Exam questions ───────────────────────────────────────────────────────────

const Q = (groups: Partial<ToolGroups>): ToolGroups => ({ ...NO_GROUPS, ...groups })

const QUESTIONS: Question[] = [
  {
    number: '1',
    title: 'Limit — L\'Hôpital\'s rule',
    questionTex: String.raw`\text{Compute:} \quad \lim_{x \to 0} \frac{e^x - e^{-x} - 2x}{x - \sin(x)}`,
    suggestedGroups: Q({ calculus: true, algebra: true, symbols: true }),
    steps: [
      {
        label: 'Both numerator and denominator → 0 as x → 0. Apply L\'Hôpital:',
        tex: String.raw`\lim_{x \to 0} \frac{e^x + e^{-x} - 2}{1 - \cos(x)}`,
      },
      {
        label: 'Still 0/0. Apply L\'Hôpital again:',
        tex: String.raw`\lim_{x \to 0} \frac{e^x - e^{-x}}{\sin(x)}`,
      },
      {
        label: 'Still 0/0. One more time:',
        tex: String.raw`\lim_{x \to 0} \frac{e^x + e^{-x}}{\cos(x)} = \frac{1 + 1}{1} = 2`,
      },
    ],
    answer: String.raw`\lim_{x \to 0} \frac{e^x - e^{-x} - 2x}{x - \sin(x)} = 2`,
  },

  {
    number: '2',
    title: 'Improper integral',
    questionTex: String.raw`\text{Compute:} \quad \int_1^{\infty} \frac{3}{(x+2)^2}\,dx`,
    suggestedGroups: Q({ calculus: true, algebra: true, symbols: true }),
    steps: [
      {
        label: 'Antiderivative:',
        tex: String.raw`\int \frac{3}{(x+2)^2}\,dx = -\frac{3}{x+2} + C`,
      },
      {
        label: 'Evaluate the improper integral:',
        tex: String.raw`\left[-\frac{3}{x+2}\right]_1^{\infty} = \lim_{b \to \infty}\left(-\frac{3}{b+2}\right) - \left(-\frac{3}{3}\right) = 0 + 1`,
      },
    ],
    answer: String.raw`\int_1^{\infty} \frac{3}{(x+2)^2}\,dx = 1`,
  },

  {
    number: '4',
    title: 'Implicit differentiation',
    questionTex: String.raw`\text{Find all points on } x^2 - y^2 = 1 \text{ where the tangent has slope } 2.`,
    suggestedGroups: Q({ algebra: true, symbols: true }),
    steps: [
      {
        label: 'Differentiate implicitly:',
        tex: String.raw`2x - 2y\,y' = 0 \quad \Rightarrow \quad y' = \frac{x}{y}`,
      },
      {
        label: 'Set y′ = 2, so x = 2y. Substitute into the curve:',
        tex: String.raw`4y^2 - y^2 = 1 \quad \Rightarrow \quad y^2 = \frac{1}{3} \quad \Rightarrow \quad y = \pm\frac{1}{\sqrt{3}}`,
      },
      {
        label: 'Tangent lines at the two points:',
        tex: String.raw`\text{At }\left(\tfrac{2}{\sqrt{3}},\tfrac{1}{\sqrt{3}}\right)\!: \quad y = 2x - \sqrt{3} \qquad \text{At }\left(-\tfrac{2}{\sqrt{3}},-\tfrac{1}{\sqrt{3}}\right)\!: \quad y = 2x + \sqrt{3}`,
      },
    ],
    answer: String.raw`\text{Points: } \left(\pm\frac{2}{\sqrt{3}},\,\pm\frac{1}{\sqrt{3}}\right), \quad y' = \frac{x}{y} = 2`,
  },

  {
    number: '5',
    title: 'Taylor series — higher-order derivative',
    questionTex: String.raw`f(x) = \sum_{n=0}^{\infty} (-1)^n \frac{x^{4n+1}}{(2n+1)!} \qquad \text{Find } f^{(13)}(0).`,
    suggestedGroups: Q({ algebra: true, series: true, symbols: true }),
    steps: [
      {
        label: 'The coefficient of x^k equals f^{(k)}(0)/k!. Find the term with x^13:',
        tex: String.raw`4n + 1 = 13 \quad \Rightarrow \quad n = 3`,
      },
      {
        label: 'Coefficient of x^13:',
        tex: String.raw`\frac{(-1)^3}{(2 \cdot 3 + 1)!} = -\frac{1}{7!} = -\frac{1}{5040}`,
      },
      {
        label: 'Recover the derivative value:',
        tex: String.raw`\frac{f^{(13)}(0)}{13!} = -\frac{1}{7!} \quad \Rightarrow \quad f^{(13)}(0) = -\frac{13!}{7!}`,
      },
    ],
    answer: String.raw`f^{(13)}(0) = -\frac{13!}{7!} = -1\,235\,520`,
  },

  {
    number: '9',
    title: 'Power series — interval of convergence',
    questionTex: String.raw`\text{Find the interval of convergence of} \quad \sum_{n=1}^{\infty} \frac{n(x+2)^n}{5^{n-1}}`,
    suggestedGroups: Q({ algebra: true, series: true, symbols: true }),
    steps: [
      {
        label: 'Ratio test:',
        tex: String.raw`\left|\frac{a_{n+1}}{a_n}\right| = \frac{(n+1)|x+2|}{5n} \xrightarrow{n\to\infty} \frac{|x+2|}{5}`,
      },
      {
        label: 'Converges when |x+2| < 5, i.e. radius R = 5, centre x = −2:',
        tex: String.raw`-7 < x < 3`,
      },
      {
        label: 'Endpoints: ∑n diverges at x = 3; ∑n(−1)^n diverges at x = −7.',
        tex: String.raw`\sum_{n=1}^{\infty} n \to \infty \qquad \sum_{n=1}^{\infty} n(-1)^n \;\text{diverges}`,
      },
    ],
    answer: String.raw`\text{Interval of convergence: } (-7,\; 3)`,
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  onTryQuestion: (ref: ExamQuestionRef) => void
  onWatchDemo?: () => void
}

export function ExamDemo({ onTryQuestion, onWatchDemo }: Props) {
  return (
    <main className="exam-demo" aria-label="TMA4100 Exam questions">
      <header className="exam-header">
        <h2>TMA4100 Matematikk 1</h2>
        <p>Eksamen — 2. desember 2024 &nbsp;·&nbsp; Selected calculation questions</p>
        <p className="exam-note">
          Click <strong>Try in editor →</strong> to open the math editor for any question.
        </p>
      </header>

      {QUESTIONS.map(q => (
        <QuestionCard
          key={q.number}
          q={q}
          onTry={onTryQuestion}
          onDemo={q.number === '1' ? onWatchDemo : undefined}
        />
      ))}
    </main>
  )
}
