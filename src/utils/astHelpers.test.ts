import { describe, it, expect } from 'vitest'
import {
  makeText,
  makeSequence,
  insertChar,
  deleteChar,
  insertIntegral,
  insertFraction,
  tabForward,
  tabBackward,
  arrowLeft,
  arrowRight,
  slotText,
} from './astHelpers'
import { Cursor, IntegralNode, FractionNode, SequenceNode } from '../types/ast'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bodyState(value = ''): { root: SequenceNode; cursor: Cursor } {
  const text = makeText(value)
  const root = makeSequence([text])
  return { root, cursor: { nodeId: text.id, offset: value.length } }
}

function getIntegral(root: SequenceNode): IntegralNode {
  const n = root.children.find(c => c.type === 'integral')
  if (!n || n.type !== 'integral') throw new Error('no integral')
  return n
}

function getFraction(root: SequenceNode): FractionNode {
  const n = root.children.find(c => c.type === 'fraction')
  if (!n || n.type !== 'fraction') throw new Error('no fraction')
  return n
}

// ─── insertChar ───────────────────────────────────────────────────────────────

describe('insertChar', () => {
  it('appends a character at the end', () => {
    const { root, cursor } = bodyState('ab')
    const result = insertChar(root, cursor, 'c')
    const text = result.root.children[0]
    expect(text.type).toBe('text')
    if (text.type === 'text') expect(text.value).toBe('abc')
    expect(result.cursor.offset).toBe(3)
  })

  it('inserts a character in the middle', () => {
    const text = makeText('ac')
    const root = makeSequence([text])
    const cursor: Cursor = { nodeId: text.id, offset: 1 }
    const result = insertChar(root, cursor, 'b')
    if (result.root.children[0].type === 'text')
      expect(result.root.children[0].value).toBe('abc')
    expect(result.cursor.offset).toBe(2)
  })

  it('inserts into an integral slot', () => {
    const { root, cursor: bodyCursor } = bodyState()
    const { root: r2, cursor: c2 } = insertIntegral(root, bodyCursor)
    const result = insertChar(r2, c2, 'a')
    const integral = getIntegral(result.root)
    expect(slotText(integral.lower).value).toBe('a')
    expect(result.cursor.offset).toBe(1)
  })

  it('inserts into a fraction slot nested inside integral integrand', () => {
    const { root, cursor: bc } = bodyState()
    let { root: r, cursor: c } = insertIntegral(root, bc)
    // Tab to integrand (3rd slot: lower→upper→integrand)
    ;({ cursor: c } = tabForward(r, c))  // upper
    ;({ cursor: c } = tabForward(r, c))  // integrand
    ;({ root: r, cursor: c } = insertFraction(r, c))  // fraction inside integrand
    ;({ root: r, cursor: c } = insertChar(r, c, 'x'))  // type in numerator
    const integral = getIntegral(r)
    const frac = integral.integrand.find(n => n.type === 'fraction') as FractionNode
    expect(frac).toBeTruthy()
    expect(slotText(frac.numerator).value).toBe('x')
  })
})

// ─── deleteChar ───────────────────────────────────────────────────────────────

describe('deleteChar', () => {
  it('deletes the character before cursor', () => {
    const { root, cursor } = bodyState('abc')
    const result = deleteChar(root, cursor)
    if (result.root.children[0].type === 'text')
      expect(result.root.children[0].value).toBe('ab')
    expect(result.cursor.offset).toBe(2)
  })

  it('does nothing at offset 0 in empty body', () => {
    const { root, cursor } = bodyState()
    const result = deleteChar(root, cursor)
    expect(result.root.children).toHaveLength(1)
    expect(result.cursor.offset).toBe(0)
  })

  it('deletes from inside an integral slot', () => {
    const { root, cursor: bc } = bodyState()
    const { root: r2, cursor: c2 } = insertIntegral(root, bc)
    const { root: r3, cursor: c3 } = insertChar(r2, c2, 'a')
    const { root: r4 } = deleteChar(r3, c3)
    const integral = getIntegral(r4)
    expect(slotText(integral.lower).value).toBe('')
  })

  it('deletes an integral node when backspacing at offset 0 after it', () => {
    const { root, cursor: bc } = bodyState()
    const { root: r2, cursor: c2 } = insertIntegral(root, bc)
    // Tab past all 4 slots to get to body text after integral
    let c = c2
    for (let i = 0; i < 4; i++) ({ cursor: c } = tabForward(r2, c))
    // cursor is now in body text after integral, at offset 0
    const { root: r3 } = deleteChar(r2, c)
    // integral should be gone
    expect(r3.children.every(n => n.type !== 'integral')).toBe(true)
  })

  it('deletes a fraction nested inside integral slot', () => {
    const { root, cursor: bc } = bodyState()
    let { root: r, cursor: c } = insertIntegral(root, bc)
    ;({ cursor: c } = tabForward(r, c))  // upper
    ;({ cursor: c } = tabForward(r, c))  // integrand
    ;({ root: r, cursor: c } = insertFraction(r, c))  // fraction in integrand
    // Tab past fraction's 2 slots
    ;({ cursor: c } = tabForward(r, c))  // fraction.denominator
    // Trailing empty TextNode after fraction is now skipped by tabForward;
    // access it directly to position cursor where Backspace deletes the fraction.
    // Cursor was at offset 0 of the integrand's text node, so no prefix was emitted:
    // integrand = [fractionNode, tailText] (index 1, not 2)
    const integral = getIntegral(r)
    const tailNode = integral.integrand[1]
    if (tailNode.type !== 'text') throw new Error('expected tail TextNode')
    c = { nodeId: tailNode.id, offset: 0 }
    // Now backspace deletes the fraction
    const { root: r2 } = deleteChar(r, c)
    const integral2 = getIntegral(r2)
    expect(integral2.integrand.every(n => n.type !== 'fraction')).toBe(true)
  })
})

// ─── insertIntegral ───────────────────────────────────────────────────────────

describe('insertIntegral', () => {
  it('inserts an integral node into the sequence', () => {
    const { root, cursor } = bodyState()
    const result = insertIntegral(root, cursor)
    expect(result.root.children.some(n => n.type === 'integral')).toBe(true)
  })

  it('places cursor in the lower slot text node', () => {
    const { root, cursor } = bodyState()
    const { root: r2, cursor: c2 } = insertIntegral(root, cursor)
    const integral = getIntegral(r2)
    expect(c2.nodeId).toBe(slotText(integral.lower).id)
    expect(c2.offset).toBe(0)
  })

  it('splits body text around the integral', () => {
    const text = makeText('hello')
    const root = makeSequence([text])
    const cursor: Cursor = { nodeId: text.id, offset: 2 }
    const { root: r2 } = insertIntegral(root, cursor)
    expect(r2.children).toHaveLength(3)
    expect(r2.children[0].type).toBe('text')
    expect(r2.children[1].type).toBe('integral')
    expect(r2.children[2].type).toBe('text')
    if (r2.children[0].type === 'text') expect(r2.children[0].value).toBe('he')
    if (r2.children[2].type === 'text') expect(r2.children[2].value).toBe('llo')
  })

  it('inserts a fraction inside integral integrand', () => {
    const { root, cursor: bc } = bodyState()
    let { root: r, cursor: c } = insertIntegral(root, bc)
    ;({ cursor: c } = tabForward(r, c))  // upper
    ;({ cursor: c } = tabForward(r, c))  // integrand
    ;({ root: r, cursor: c } = insertFraction(r, c))
    const integral = getIntegral(r)
    expect(integral.integrand.some(n => n.type === 'fraction')).toBe(true)
  })
})

// ─── tabForward ───────────────────────────────────────────────────────────────

describe('tabForward', () => {
  it('advances lower → upper', () => {
    const { root, cursor: bc } = bodyState()
    const { root: r, cursor: c } = insertIntegral(root, bc)
    const integral = getIntegral(r)
    const { cursor: c2 } = tabForward(r, c)
    expect(c2.nodeId).toBe(slotText(integral.upper).id)
  })

  it('advances upper → integrand', () => {
    const { root, cursor: bc } = bodyState()
    const { root: r, cursor: c } = insertIntegral(root, bc)
    const integral = getIntegral(r)
    const { cursor: c2 } = tabForward(r, c)
    const { cursor: c3 } = tabForward(r, c2)
    expect(c3.nodeId).toBe(slotText(integral.integrand).id)
  })

  it('advances integrand → variable', () => {
    const { root, cursor: bc } = bodyState()
    const { root: r, cursor: c } = insertIntegral(root, bc)
    const integral = getIntegral(r)
    let cur = c
    for (let i = 0; i < 2; i++) ({ cursor: cur } = tabForward(r, cur))
    const { cursor: c2 } = tabForward(r, cur)
    expect(c2.nodeId).toBe(slotText(integral.variable).id)
  })

  it('exits integral to body text after variable', () => {
    const { root, cursor: bc } = bodyState()
    const { root: r, cursor: c } = insertIntegral(root, bc)
    let cur = c
    for (let i = 0; i < 4; i++) ({ cursor: cur } = tabForward(r, cur))
    // Should now be in the body text node after the integral
    expect(r.children.some(n => n.type === 'text' && n.id === cur.nodeId)).toBe(true)
  })

  it('tabs through fraction nested inside integral integrand', () => {
    const { root, cursor: bc } = bodyState()
    let { root: r, cursor: c } = insertIntegral(root, bc)
    ;({ cursor: c } = tabForward(r, c))  // upper
    ;({ cursor: c } = tabForward(r, c))  // integrand (first text in integrand)
    ;({ root: r, cursor: c } = insertFraction(r, c))  // fraction in integrand; cursor = frac.numerator
    ;({ cursor: c } = tabForward(r, c))  // frac.denominator
    // Trailing empty TextNode after fraction is skipped — next Tab goes directly to variable
    const integral = getIntegral(r)
    ;({ cursor: c } = tabForward(r, c))
    expect(c.nodeId).toBe(slotText(integral.variable).id)
  })
})

// ─── tabBackward ──────────────────────────────────────────────────────────────

describe('tabBackward', () => {
  it('reverses from upper back to lower', () => {
    const { root, cursor: bc } = bodyState()
    const { root: r, cursor: lowerC } = insertIntegral(root, bc)
    const integral = getIntegral(r)
    const { cursor: upperC } = tabForward(r, lowerC)
    const { cursor: backC } = tabBackward(r, upperC)
    expect(backC.nodeId).toBe(slotText(integral.lower).id)
  })

  it('stays put when already at first stop (body text before integral)', () => {
    const { root, cursor } = bodyState()
    const { root: r } = insertIntegral(root, cursor)
    // cursor is already at first text node in the tree
    // tabBackward from first stop should do nothing — need to start from beginning
    const stops = [r.children[0]] // first text node
    const firstId = stops[0].id
    const startCursor: Cursor = { nodeId: firstId, offset: 0 }
    const { cursor: c2 } = tabBackward(r, startCursor)
    expect(c2.nodeId).toBe(firstId)
  })
})

// ─── insertFraction ───────────────────────────────────────────────────────────

describe('insertFraction', () => {
  it('inserts a fraction node into the sequence', () => {
    const { root, cursor } = bodyState()
    const result = insertFraction(root, cursor)
    expect(result.root.children.some(n => n.type === 'fraction')).toBe(true)
  })

  it('places cursor in the numerator text node', () => {
    const { root, cursor } = bodyState()
    const { root: r, cursor: c } = insertFraction(root, cursor)
    const frac = getFraction(r)
    expect(c.nodeId).toBe(slotText(frac.numerator).id)
    expect(c.offset).toBe(0)
  })

  it('tabs numerator → denominator', () => {
    const { root, cursor } = bodyState()
    const { root: r, cursor: c } = insertFraction(root, cursor)
    const frac = getFraction(r)
    const { cursor: c2 } = tabForward(r, c)
    expect(c2.nodeId).toBe(slotText(frac.denominator).id)
  })

  it('tabs out of denominator to body text', () => {
    const { root, cursor } = bodyState()
    const { root: r, cursor: c } = insertFraction(root, cursor)
    const { cursor: c2 } = tabForward(r, c)   // → denominator
    const { cursor: c3 } = tabForward(r, c2)  // → body text after fraction
    expect(r.children.some(n => n.type === 'text' && n.id === c3.nodeId)).toBe(true)
  })

  it('types into numerator and denominator correctly', () => {
    const { root, cursor } = bodyState()
    let { root: r, cursor: c } = insertFraction(root, cursor)
    ;({ root: r, cursor: c } = insertChar(r, c, 'a'))
    ;({ cursor: c } = tabForward(r, c))
    ;({ root: r, cursor: c } = insertChar(r, c, 'b'))
    const frac = getFraction(r)
    expect(slotText(frac.numerator).value).toBe('a')
    expect(slotText(frac.denominator).value).toBe('b')
  })
})

// ─── arrowLeft / arrowRight ───────────────────────────────────────────────────

describe('arrowLeft', () => {
  it('decrements offset within a text node', () => {
    const { root, cursor } = bodyState('abc')  // offset at 3
    const { cursor: c2 } = arrowLeft(root, cursor)
    expect(c2.nodeId).toBe(cursor.nodeId)
    expect(c2.offset).toBe(2)
  })

  it('stops at offset 0 when no previous node', () => {
    const { root, cursor } = bodyState()  // single text node, offset 0
    const { cursor: c2 } = arrowLeft(root, cursor)
    expect(c2.offset).toBe(0)
    expect(c2.nodeId).toBe(cursor.nodeId)
  })

  it('crosses into previous text node at its end', () => {
    const { root, cursor: bc } = bodyState()
    const { root: r, cursor: lowerC } = insertIntegral(root, bc)
    const integral = getIntegral(r)
    // Tab to upper slot
    const { cursor: upperC } = tabForward(r, lowerC)
    // ArrowLeft from start of upper slot → end of lower slot text
    const { cursor: c2 } = arrowLeft(r, upperC)
    expect(c2.nodeId).toBe(slotText(integral.lower).id)
    expect(c2.offset).toBe(slotText(integral.lower).value.length)
  })

  it('exits integral leftward into body text before it', () => {
    // body("pre") → Integral → body("suf")
    const text = makeText('pre')
    const root = makeSequence([text])
    const startCursor: Cursor = { nodeId: text.id, offset: text.value.length }
    let { root: r, cursor: c } = insertIntegral(root, startCursor)
    const integral = getIntegral(r)
    // cursor is in lower slot; move to variable slot (last)
    for (let i = 0; i < 3; i++) ({ cursor: c } = tabForward(r, c))
    // Tab to body text after integral
    ;({ cursor: c } = tabForward(r, c))
    // Arrow left from start of after-text → variable slot end
    ;({ cursor: c } = arrowLeft(r, c))
    expect(c.nodeId).toBe(slotText(integral.variable).id)
  })
})

describe('arrowRight', () => {
  it('increments offset within a text node', () => {
    const text = makeText('abc')
    const root = makeSequence([text])
    const cursor: Cursor = { nodeId: text.id, offset: 0 }
    const { cursor: c2 } = arrowRight(root, cursor)
    expect(c2.offset).toBe(1)
    expect(c2.nodeId).toBe(cursor.nodeId)
  })

  it('stops at end when no next node', () => {
    const { root, cursor } = bodyState('abc')  // single node, offset at end
    const { cursor: c2 } = arrowRight(root, cursor)
    expect(c2.offset).toBe(3)
    expect(c2.nodeId).toBe(cursor.nodeId)
  })

  it('crosses into next text node at its start', () => {
    const { root, cursor: bc } = bodyState()
    const { root: r, cursor: lowerC } = insertIntegral(root, bc)
    const integral = getIntegral(r)
    // Fill lower with 'a', cursor at offset 1
    const { root: r2, cursor: c2 } = insertChar(r, lowerC, 'a')
    // ArrowRight from end of lower → start of upper
    const { cursor: c3 } = arrowRight(r2, c2)
    expect(c3.nodeId).toBe(slotText(integral.upper).id)
    expect(c3.offset).toBe(0)
  })

  it('enters integral slots from body text before it', () => {
    // Insert integral after "pre" so there IS a body text node before the integral
    const text = makeText('pre')
    const root = makeSequence([text])
    const atEnd: Cursor = { nodeId: text.id, offset: text.value.length }
    const { root: r } = insertIntegral(root, atEnd)
    const integral = getIntegral(r)
    // r.children = [TextNode("pre"), IntegralNode, TextNode("")]
    const bodyBefore = r.children[0]
    if (bodyBefore.type === 'text') {
      const endOfPre: Cursor = { nodeId: bodyBefore.id, offset: bodyBefore.value.length }
      const { cursor: c2 } = arrowRight(r, endOfPre)
      expect(c2.nodeId).toBe(slotText(integral.lower).id)
      expect(c2.offset).toBe(0)
    }
  })
})
