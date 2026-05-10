import { ASTNode, Cursor, EvalNode, FractionNode, IntegralNode, LimitNode, PowerNode, SequenceNode, SlotKey, SqrtNode, SumNode, TextNode } from '../types/ast'

// ─── Public entry point ───────────────────────────────────────────────────────

export function astToLatex(root: SequenceNode, cursor: Cursor): string {
  return root.children.map(node => nodeToLatex(node, cursor)).join('')
}

// ─── Node dispatch ────────────────────────────────────────────────────────────

function nodeToLatex(node: ASTNode, cursor: Cursor): string {
  switch (node.type) {
    case 'text':     return textToLatex(node, cursor)
    case 'integral': return integralToLatex(node, cursor)
    case 'fraction': return fractionToLatex(node, cursor)
    case 'power':    return powerToLatex(node, cursor)
    case 'sqrt':     return sqrtToLatex(node, cursor)
    case 'sum':      return sumToLatex(node, cursor)
    case 'limit':    return limitToLatex(node, cursor)
    case 'eval':     return evalToLatex(node, cursor)
    case 'sequence': return node.children.map(c => nodeToLatex(c, cursor)).join('')
  }
}

// ─── Text node ────────────────────────────────────────────────────────────────

function textToLatex(node: TextNode, cursor: Cursor): string {
  if (cursor.nodeId !== node.id) return node.value
  const before = node.value.slice(0, cursor.offset)
  const after  = node.value.slice(cursor.offset)
  return before + '\\cursor{}' + after
}

// ─── Integral node ────────────────────────────────────────────────────────────

function integralToLatex(node: IntegralNode, cursor: Cursor): string {
  const lower    = slotToLatex(node.lower,     cursor, node.id, 'lower')
  const upper    = slotToLatex(node.upper,     cursor, node.id, 'upper')
  const integrand = slotToLatex(node.integrand, cursor, node.id, 'integrand')
  const variable = slotToLatex(node.variable,  cursor, node.id, 'variable')
  return `\\int_{${lower}}^{${upper}} ${integrand} \\, d${variable}`
}

// ─── Fraction node ────────────────────────────────────────────────────────────

function fractionToLatex(node: FractionNode, cursor: Cursor): string {
  const num = slotToLatex(node.numerator,   cursor, node.id, 'numerator')
  const den = slotToLatex(node.denominator, cursor, node.id, 'denominator')
  return `\\frac{${num}}{${den}}`
}

// ─── Power / Sqrt / Sum nodes ─────────────────────────────────────────────────

function powerToLatex(node: PowerNode, cursor: Cursor): string {
  const base = slotToLatex(node.base,     cursor, node.id, 'base')
  const exp  = slotToLatex(node.exponent, cursor, node.id, 'exponent')
  return `${base}^{${exp}}`
}

function sqrtToLatex(node: SqrtNode, cursor: Cursor): string {
  const rad = slotToLatex(node.radicand, cursor, node.id, 'radicand')
  return `\\sqrt{${rad}}`
}

function sumToLatex(node: SumNode, cursor: Cursor): string {
  const lower   = slotToLatex(node.lower,   cursor, node.id, 'lower')
  const upper   = slotToLatex(node.upper,   cursor, node.id, 'upper')
  const summand = slotToLatex(node.summand, cursor, node.id, 'summand')
  return `\\sum_{${lower}}^{${upper}} ${summand}`
}

function limitToLatex(node: LimitNode, cursor: Cursor): string {
  const limitVar = slotToLatex(node.limitVar, cursor, node.id, 'limitVar')
  const approach = slotToLatex(node.approach, cursor, node.id, 'approach')
  const body     = slotToLatex(node.body,     cursor, node.id, 'body')
  return `\\lim_{${limitVar} \\to ${approach}} ${body}`
}

function evalToLatex(node: EvalNode, cursor: Cursor): string {
  const body  = slotToLatex(node.body,  cursor, node.id, 'body')
  const lower = slotToLatex(node.lower, cursor, node.id, 'lower')
  const upper = slotToLatex(node.upper, cursor, node.id, 'upper')
  return `\\left[${body}\\right]_{${lower}}^{${upper}}`
}

// ─── Slot renderer ────────────────────────────────────────────────────────────
//
// Every slot is wrapped in \htmlClass{slot-NODEID-SLOTKEY ...}{} so click
// handlers in the UI can map a click back to a (nodeId, slotKey) pair.
//
// Active = cursor TextNode is a direct child of this slot array.
// (Nested math nodes handle their own slots' active highlighting recursively.)
//
// Empty inactive slots show a gray □ placeholder.

function slotToLatex(
  nodes: ASTNode[],
  cursor: Cursor,
  ownerId: string,
  slotKey: SlotKey,
): string {
  const slotClass = `slot-${ownerId}-${slotKey}`

  const isActive = nodes.some(n => n.type === 'text' && n.id === cursor.nodeId)
  const content = nodes.map(n => nodeToLatex(n, cursor)).join('')
  const inner = content || '{\\color{gray}\\square}'

  const classes = isActive ? `${slotClass} active-slot` : slotClass
  return `\\htmlClass{${classes}}{${inner}}`
}
