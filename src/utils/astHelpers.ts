import {
  ASTNode, Cursor, EvalNode, FractionNode, IntegralNode, LimitNode, PowerNode, SequenceNode,
  SlotKey, SqrtNode, SumNode, TextNode,
} from '../types/ast'

// ─── ID generator ─────────────────────────────────────────────────────────────

let _id = 0
export function newId(): string { return String(++_id) }

// ─── Constructors ─────────────────────────────────────────────────────────────

export function makeText(value = ''): TextNode {
  return { type: 'text', id: newId(), value }
}

export function makeSequence(children: ASTNode[] = []): SequenceNode {
  return { type: 'sequence', id: newId(), children }
}

export function makeIntegral(): IntegralNode {
  return {
    type: 'integral', id: newId(),
    lower: [makeText()], upper: [makeText()],
    integrand: [makeText()], variable: [makeText()],
  }
}

export function makeFraction(): FractionNode {
  return {
    type: 'fraction', id: newId(),
    numerator: [makeText()], denominator: [makeText()],
  }
}

export function makePower(baseValue = ''): PowerNode {
  return {
    type: 'power', id: newId(),
    base: [makeText(baseValue)], exponent: [makeText()],
  }
}

export function makeSqrt(): SqrtNode {
  return { type: 'sqrt', id: newId(), radicand: [makeText()] }
}

export function makeSum(): SumNode {
  return {
    type: 'sum', id: newId(),
    lower: [makeText()], upper: [makeText()], summand: [makeText()],
  }
}

export function makeLimit(): LimitNode {
  return {
    type: 'limit', id: newId(),
    limitVar: [makeText()], approach: [makeText()], body: [makeText()],
  }
}

export function makeEval(): EvalNode {
  return {
    type: 'eval', id: newId(),
    body: [makeText()], lower: [makeText()], upper: [makeText()],
  }
}

// ─── Slot accessor ────────────────────────────────────────────────────────────

export function getSlot(node: ASTNode, slotKey: SlotKey): ASTNode[] | null {
  switch (node.type) {
    case 'integral': return (['lower','upper','integrand','variable'] as SlotKey[]).includes(slotKey) ? (node as any)[slotKey] : null
    case 'fraction': return (['numerator','denominator'] as SlotKey[]).includes(slotKey) ? (node as any)[slotKey] : null
    case 'power':    return (['base','exponent'] as SlotKey[]).includes(slotKey) ? (node as any)[slotKey] : null
    case 'sqrt':     return slotKey === 'radicand' ? node.radicand : null
    case 'sum':      return (['lower','upper','summand'] as SlotKey[]).includes(slotKey) ? (node as any)[slotKey] : null
    case 'limit':    return (['limitVar','approach','body'] as SlotKey[]).includes(slotKey) ? (node as any)[slotKey] : null
    case 'eval':     return (['body','lower','upper'] as SlotKey[]).includes(slotKey) ? (node as any)[slotKey] : null
    default:         return null
  }
}

// Returns slots in Tab order — also the order used for nested traversal
export function allSlotsWithKeys(node: ASTNode): [ASTNode[], SlotKey][] {
  switch (node.type) {
    case 'integral': return [[node.lower,'lower'],[node.upper,'upper'],[node.integrand,'integrand'],[node.variable,'variable']]
    case 'fraction': return [[node.numerator,'numerator'],[node.denominator,'denominator']]
    case 'power':    return [[node.base,'base'],[node.exponent,'exponent']]
    case 'sqrt':     return [[node.radicand,'radicand']]
    case 'sum':      return [[node.lower,'lower'],[node.upper,'upper'],[node.summand,'summand']]
    case 'limit':    return [[node.limitVar,'limitVar'],[node.approach,'approach'],[node.body,'body']]
    case 'eval':     return [[node.body,'body'],[node.lower,'lower'],[node.upper,'upper']]
    default:         return []
  }
}

// Retrieve the first text leaf in a slot array
export function slotText(nodes: ASTNode[]): TextNode {
  const t = nodes.find((n): n is TextNode => n.type === 'text')
  if (!t) throw new Error('slot has no text node')
  return t
}

// ─── Flat text-node traversal (defines Tab order) ────────────────────────────

// inSlot=true means this sequence is a named slot inside a math node.
// In that context, trailing empty TextNodes that follow a math sibling are
// skipped — they're invisible insertion points and shouldn't cost a Tab press.
function allTabTextNodes(node: ASTNode, inSlot = false): TextNode[] {
  if (node.type === 'text') return [node]
  if (node.type === 'sequence') {
    const result: TextNode[] = []
    let hasMathSibling = false
    for (const child of node.children) {
      if (child.type === 'text') {
        if (inSlot && hasMathSibling && child.value === '') continue  // skip tail
        result.push(child)
      } else {
        hasMathSibling = true
        result.push(...allTabTextNodes(child, true))
      }
    }
    return result
  }
  // Math node: visit each slot sequence with inSlot=true
  return allSlotsWithKeys(node).flatMap(([slot]) =>
    allTabTextNodes({ type: 'sequence', id: '', children: slot } as SequenceNode, true)
  )
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function insertChar(
  root: SequenceNode, cursor: Cursor, char: string,
): { root: SequenceNode; cursor: Cursor } {
  return insertText(root, cursor, char)
}

export function insertText(
  root: SequenceNode, cursor: Cursor, text: string,
): { root: SequenceNode; cursor: Cursor } {
  const newRoot = mapNodes(root, node => {
    if (node.type === 'text' && node.id === cursor.nodeId) {
      const v = node.value
      return { ...node, value: v.slice(0, cursor.offset) + text + v.slice(cursor.offset) }
    }
    return node
  }) as SequenceNode
  return { root: newRoot, cursor: { nodeId: cursor.nodeId, offset: cursor.offset + text.length } }
}

export function deleteChar(
  root: SequenceNode, cursor: Cursor,
): { root: SequenceNode; cursor: Cursor } {
  if (cursor.offset === 0) return deletePrecedingNode(root, cursor.nodeId)

  const newRoot = mapNodes(root, node => {
    if (node.type === 'text' && node.id === cursor.nodeId) {
      const v = node.value
      return { ...node, value: v.slice(0, cursor.offset - 1) + v.slice(cursor.offset) }
    }
    return node
  }) as SequenceNode
  return { root: newRoot, cursor: { nodeId: cursor.nodeId, offset: cursor.offset - 1 } }
}

// ─── Insert a math node (splits the text node at cursor position) ─────────────

export function insertIntegral(root: SequenceNode, cursor: Cursor) {
  return insertMathNode(root, cursor, makeIntegral(), 'lower')
}

export function insertFraction(root: SequenceNode, cursor: Cursor) {
  return insertMathNode(root, cursor, makeFraction(), 'numerator')
}

export function insertSqrt(root: SequenceNode, cursor: Cursor) {
  return insertMathNode(root, cursor, makeSqrt(), 'radicand')
}

export function insertSum(root: SequenceNode, cursor: Cursor) {
  return insertMathNode(root, cursor, makeSum(), 'lower')
}

export function insertLimit(root: SequenceNode, cursor: Cursor) {
  return insertMathNode(root, cursor, makeLimit(), 'limitVar')
}

export function insertEval(root: SequenceNode, cursor: Cursor) {
  return insertMathNode(root, cursor, makeEval(), 'body')
}

export function insertPower(root: SequenceNode, cursor: Cursor): { root: SequenceNode; cursor: Cursor } {
  // Absorb the character immediately left of cursor as the base value
  const textNode = findNode(root, cursor.nodeId)
  const baseValue = (textNode?.type === 'text' && cursor.offset > 0)
    ? textNode.value[cursor.offset - 1]
    : ''
  const { root: trimmedRoot, cursor: trimmedCursor } = baseValue
    ? deleteChar(root, cursor)   // remove that char from the text node
    : { root, cursor }
  const mathNode = makePower(baseValue)
  const firstSlot: SlotKey = baseValue ? 'exponent' : 'base'
  return insertMathNode(trimmedRoot, trimmedCursor, mathNode, firstSlot)
}

// ─── Arrow key navigation ─────────────────────────────────────────────────────

export function arrowLeft(
  root: SequenceNode, cursor: Cursor,
): { root: SequenceNode; cursor: Cursor } {
  if (cursor.offset > 0) {
    return { root, cursor: { nodeId: cursor.nodeId, offset: cursor.offset - 1 } }
  }
  const stops = allTabTextNodes(root)
  const idx = stops.findIndex(n => n.id === cursor.nodeId)
  if (idx <= 0) return { root, cursor }
  const prev = stops[idx - 1]
  return { root, cursor: { nodeId: prev.id, offset: prev.value.length } }
}

export function arrowRight(
  root: SequenceNode, cursor: Cursor,
): { root: SequenceNode; cursor: Cursor } {
  const stops = allTabTextNodes(root)
  const idx = stops.findIndex(n => n.id === cursor.nodeId)
  if (idx === -1) return { root, cursor }
  const curr = stops[idx]
  if (cursor.offset < curr.value.length) {
    return { root, cursor: { nodeId: cursor.nodeId, offset: cursor.offset + 1 } }
  }
  if (idx === stops.length - 1) return { root, cursor }
  return { root, cursor: { nodeId: stops[idx + 1].id, offset: 0 } }
}

// ─── Tab navigation ───────────────────────────────────────────────────────────

export function tabForward(
  root: SequenceNode, cursor: Cursor,
): { root: SequenceNode; cursor: Cursor } {
  const stops = allTabTextNodes(root)
  const idx = stops.findIndex(n => n.id === cursor.nodeId)
  if (idx === -1 || idx === stops.length - 1) return { root, cursor }
  const next = stops[idx + 1]
  return { root, cursor: { nodeId: next.id, offset: 0 } }
}

export function tabBackward(
  root: SequenceNode, cursor: Cursor,
): { root: SequenceNode; cursor: Cursor } {
  const stops = allTabTextNodes(root)
  const idx = stops.findIndex(n => n.id === cursor.nodeId)
  if (idx <= 0) return { root, cursor }
  const prev = stops[idx - 1]
  return { root, cursor: { nodeId: prev.id, offset: prev.value.length } }
}

// ─── Click-to-slot cursor placement ──────────────────────────────────────────

// Given a math node ID and slot key (from the clicked slot's CSS class),
// returns a cursor at the end of the last text node in that slot.
export function getSlotCursor(
  root: SequenceNode, nodeId: string, slotKey: SlotKey,
): Cursor | null {
  const node = findNode(root, nodeId)
  if (!node) return null
  const slot = getSlot(node, slotKey)
  if (!slot) return null
  for (let i = slot.length - 1; i >= 0; i--) {
    const n = slot[i]
    if (n.type === 'text') return { nodeId: n.id, offset: n.value.length }
  }
  return null
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type SeqEdit = { newArr: ASTNode[]; cursor: Cursor }
type NodeEdit = { node: ASTNode; cursor: Cursor }

// Split arr at the text node with textId, inserting mathNode between the two halves.
function splitAndInsertInArr(
  arr: ASTNode[], textId: string, offset: number,
  mathNode: ASTNode, firstSlotKey: SlotKey,
): SeqEdit | null {
  const idx = arr.findIndex(n => n.type === 'text' && n.id === textId)
  if (idx === -1) return null

  const text = arr[idx] as TextNode
  const before = text.value.slice(0, offset)
  const after  = text.value.slice(offset)
  const afterNode = makeText(after)

  const newArr: ASTNode[] = [
    ...arr.slice(0, idx),
    ...(before ? [{ ...text, value: before } as TextNode] : []),
    mathNode,
    afterNode,
    ...arr.slice(idx + 1),
  ]

  const firstSlotArr = getSlot(mathNode, firstSlotKey)!
  const firstText = slotText(firstSlotArr)
  return { newArr, cursor: { nodeId: firstText.id, offset: 0 } }
}

function insertIntoNode(
  node: ASTNode, textId: string, offset: number,
  mathNode: ASTNode, firstSlotKey: SlotKey,
): NodeEdit | null {
  if (node.type === 'text') return null

  if (node.type === 'sequence') {
    const edit = splitAndInsertInArr(node.children, textId, offset, mathNode, firstSlotKey)
    if (edit) return { node: { ...node, children: edit.newArr }, cursor: edit.cursor }
    for (let i = 0; i < node.children.length; i++) {
      const res = insertIntoNode(node.children[i], textId, offset, mathNode, firstSlotKey)
      if (res) {
        const nc = [...node.children]; nc[i] = res.node
        return { node: { ...node, children: nc }, cursor: res.cursor }
      }
    }
    return null
  }

  // Math node: try each slot
  for (const [slot, key] of allSlotsWithKeys(node)) {
    const edit = splitAndInsertInArr(slot, textId, offset, mathNode, firstSlotKey)
    if (edit) return { node: { ...node, [key]: edit.newArr }, cursor: edit.cursor }
    for (let i = 0; i < slot.length; i++) {
      const res = insertIntoNode(slot[i], textId, offset, mathNode, firstSlotKey)
      if (res) {
        const ns = [...slot]; ns[i] = res.node
        return { node: { ...node, [key]: ns }, cursor: res.cursor }
      }
    }
  }
  return null
}

function insertMathNode(
  root: SequenceNode, cursor: Cursor,
  mathNode: ASTNode, firstSlotKey: SlotKey,
): { root: SequenceNode; cursor: Cursor } {
  const res = insertIntoNode(root, cursor.nodeId, cursor.offset, mathNode, firstSlotKey)
  if (res) return { root: res.node as SequenceNode, cursor: res.cursor }
  return { root, cursor }
}

// Remove the node immediately before the text node with textId in its container.
// Merges surrounding text nodes.
function deletePrecedingInArr(arr: ASTNode[], textId: string): SeqEdit | null {
  const idx = arr.findIndex(n => n.type === 'text' && n.id === textId)
  if (idx <= 0) return null  // not found or nothing before

  const prev = arr[idx - 1]
  const curr = arr[idx] as TextNode

  if (prev.type === 'text') {
    // Adjacent text nodes: merge
    const merged: TextNode = { ...prev, value: prev.value + curr.value }
    return {
      newArr: [...arr.slice(0, idx - 1), merged, ...arr.slice(idx + 1)],
      cursor: { nodeId: merged.id, offset: prev.value.length },
    }
  }

  // prev is a math node: delete it, optionally merge with the text node before it
  const beforeMath = idx >= 2 ? arr[idx - 2] : null
  if (beforeMath?.type === 'text') {
    const merged: TextNode = { ...beforeMath, value: beforeMath.value + curr.value }
    return {
      newArr: [...arr.slice(0, idx - 2), merged, ...arr.slice(idx + 1)],
      cursor: { nodeId: merged.id, offset: beforeMath.value.length },
    }
  }
  return {
    newArr: [...arr.slice(0, idx - 1), ...arr.slice(idx)],
    cursor: { nodeId: curr.id, offset: 0 },
  }
}

function deletePrecedingInNode(node: ASTNode, textId: string): NodeEdit | null {
  if (node.type === 'text') return null

  if (node.type === 'sequence') {
    const edit = deletePrecedingInArr(node.children, textId)
    if (edit) return { node: { ...node, children: edit.newArr }, cursor: edit.cursor }
    for (let i = 0; i < node.children.length; i++) {
      const res = deletePrecedingInNode(node.children[i], textId)
      if (res) {
        const nc = [...node.children]; nc[i] = res.node
        return { node: { ...node, children: nc }, cursor: res.cursor }
      }
    }
    return null
  }

  // Math node: try each slot
  for (const [slot, key] of allSlotsWithKeys(node)) {
    const edit = deletePrecedingInArr(slot, textId)
    if (edit) return { node: { ...node, [key]: edit.newArr }, cursor: edit.cursor }
    for (let i = 0; i < slot.length; i++) {
      const res = deletePrecedingInNode(slot[i], textId)
      if (res) {
        const ns = [...slot]; ns[i] = res.node
        return { node: { ...node, [key]: ns }, cursor: res.cursor }
      }
    }
  }
  return null
}

function deletePrecedingNode(
  root: SequenceNode, textId: string,
): { root: SequenceNode; cursor: Cursor } {
  const res = deletePrecedingInNode(root, textId)
  if (res) return { root: res.node as SequenceNode, cursor: res.cursor }
  return { root, cursor: { nodeId: textId, offset: 0 } }
}

// ─── Tree utilities ───────────────────────────────────────────────────────────

function mapNodes(node: ASTNode, fn: (n: ASTNode) => ASTNode): ASTNode {
  const mapped = fn(node)
  if (mapped.type === 'sequence') {
    return { ...mapped, children: mapped.children.map(c => mapNodes(c, fn)) }
  }
  // Generic: rebuild all slots for any math node type
  const slots = allSlotsWithKeys(mapped)
  if (slots.length > 0) {
    const updates: Record<string, ASTNode[]> = {}
    for (const [slot, key] of slots) updates[key] = slot.map(c => mapNodes(c, fn))
    return { ...mapped, ...updates }
  }
  return mapped
}

export function findNode(root: ASTNode, id: string): ASTNode | null {
  if (root.id === id) return root
  if (root.type === 'sequence') {
    for (const c of root.children) { const f = findNode(c, id); if (f) return f }
  }
  for (const [slot] of allSlotsWithKeys(root)) {
    for (const c of slot) { const f = findNode(c, id); if (f) return f }
  }
  return null
}
