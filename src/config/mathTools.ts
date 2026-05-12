export interface MathTool {
  id: string
  label: string
  insertLatex: string   // toolbar: uses \placeholder{}
  vkLatex: string       // virtual keyboard: uses #? / #@
  title: string
  ariaLabel: string
  btnClass?: string
  separatorBefore?: boolean
}

export const MATH_TOOLS: MathTool[] = [
  // ── Calculus ────────────────────────────────────────────────────────────────
  {
    id: 'integral',
    label: '∫',
    insertLatex: '\\int_{\\placeholder{}}^{\\placeholder{}} \\placeholder{} \\, d\\placeholder{}',
    vkLatex: '\\int_{#?}^{#?}#?\\,d#?',
    title: 'Definite integral',
    ariaLabel: 'Insert definite integral',
  },
  {
    id: 'lim',
    label: 'lim',
    insertLatex: '\\lim_{\\placeholder{} \\to \\placeholder{}} \\placeholder{}',
    vkLatex: '\\lim_{#?\\to#?}#?',
    title: 'Limit',
    ariaLabel: 'Insert limit',
    btnClass: 'toolbar-btn--lim',
  },
  {
    id: 'eval',
    label: '[·]',
    insertLatex: '\\left.\\placeholder{}\\right|_{\\placeholder{}}^{\\placeholder{}}',
    vkLatex: '\\left.#@\\right|_{#?}^{#?}',
    title: 'Evaluated-at bracket  [·]ₐᵇ',
    ariaLabel: 'Insert evaluated-at bracket',
    btnClass: 'toolbar-btn--lim',
  },
  // ── Algebra ─────────────────────────────────────────────────────────────────
  {
    id: 'frac',
    label: '½',
    insertLatex: '\\frac{\\placeholder{}}{\\placeholder{}}',
    vkLatex: '\\frac{#@}{#?}',
    title: 'Fraction (or type /)',
    ariaLabel: 'Insert fraction',
    separatorBefore: true,
  },
  {
    id: 'sqrt',
    label: '√',
    insertLatex: '\\sqrt{\\placeholder{}}',
    vkLatex: '\\sqrt{#@}',
    title: 'Square root',
    ariaLabel: 'Insert square root',
  },
  {
    id: 'power',
    label: 'xⁿ',
    insertLatex: '^{\\placeholder{}}',
    vkLatex: '^{#?}',
    title: 'Power (or type ^)',
    ariaLabel: 'Insert superscript',
  },
  // ── Series ──────────────────────────────────────────────────────────────────
  {
    id: 'sum',
    label: '∑',
    insertLatex: '\\sum_{\\placeholder{}}^{\\placeholder{}} \\placeholder{}',
    vkLatex: '\\sum_{#?}^{#?}#?',
    title: 'Sum (Σ)',
    ariaLabel: 'Insert sum',
    separatorBefore: true,
  },
  // ── Functions ────────────────────────────────────────────────────────────────
  {
    id: 'sin',
    label: 'sin',
    insertLatex: '\\sin\\left(\\placeholder{}\\right)',
    vkLatex: '\\sin\\left(#@\\right)',
    title: 'Sine',
    ariaLabel: 'Insert sine',
    btnClass: 'toolbar-btn--fn',
    separatorBefore: true,
  },
  {
    id: 'cos',
    label: 'cos',
    insertLatex: '\\cos\\left(\\placeholder{}\\right)',
    vkLatex: '\\cos\\left(#@\\right)',
    title: 'Cosine',
    ariaLabel: 'Insert cosine',
    btnClass: 'toolbar-btn--fn',
  },
  {
    id: 'ln',
    label: 'ln',
    insertLatex: '\\ln\\left(\\placeholder{}\\right)',
    vkLatex: '\\ln\\left(#@\\right)',
    title: 'Natural logarithm',
    ariaLabel: 'Insert natural log',
    btnClass: 'toolbar-btn--fn',
  },
]

// ── Virtual keyboard layout built from MATH_TOOLS ────────────────────────────
// Rows 2-6 are fixed (numbers, constants, navigation)
export const VK_LAYOUT = {
  label: 'TMA4100',
  rows: [
    // Row 1 — math structures from config
    [
      ...MATH_TOOLS.map(t => ({ label: t.label, latex: t.vkLatex, tooltip: t.title })),
      { class: 'action', label: '⌫', command: ['deleteBackward'] },
    ],
    // Row 2 — functions not in toolbar + constants
    [
      { label: 'tan', latex: '\\tan\\left(#@\\right)', tooltip: 'Tangent' },
      { label: 'eˣ', latex: 'e^{#?}', tooltip: 'Exponential' },
      { label: '|x|', latex: '\\left|#@\\right|', tooltip: 'Absolute value' },
      { label: 'π', latex: '\\pi' },
      { label: '∞', latex: '\\infty' },
      { label: 'α', latex: '\\alpha' },
      { label: 'β', latex: '\\beta' },
      { label: 'θ', latex: '\\theta' },
    ],
    // Row 3 — numbers + ops
    ['7', '8', '9',
      { label: '+', latex: '+' },
      { label: '−', latex: '-' },
      { label: '=', latex: '=' },
      { label: '(…)', latex: '\\left(#@\\right)', tooltip: 'Parentheses' },
      { label: '≠', latex: '\\ne' },
    ],
    ['4', '5', '6',
      { label: '×', latex: '\\times' },
      { label: '÷', latex: '\\div' },
      { label: '≤', latex: '\\le' },
      { label: '≥', latex: '\\ge' },
      { label: 'λ', latex: '\\lambda' },
    ],
    ['1', '2', '3',
      { label: 'n', latex: 'n' },
      { label: 'x', latex: 'x' },
      { label: 'y', latex: 'y' },
      { label: 'a', latex: 'a' },
      { label: 'b', latex: 'b' },
    ],
    // Row 6 — zero + navigation
    [
      { label: '0', latex: '0' },
      { label: '.', latex: '.' },
      { label: '±', latex: '\\pm' },
      { class: 'action', label: '◂', command: ['moveLeft'], tooltip: 'Move left' },
      { class: 'action', label: '▸', command: ['moveRight'], tooltip: 'Move right' },
      { class: 'action', label: '⇥', command: ['moveToNextPlaceholder'], tooltip: 'Next placeholder' },
      { class: 'separator' },
      { class: 'action', label: '✓', command: ['commit'], tooltip: 'Done' },
    ],
  ],
}
