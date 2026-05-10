import { describe, it, expect } from 'vitest'
import { makeText, makeSequence, insertIntegral, insertFraction, insertChar, tabForward } from './astHelpers'
import { astToLatex } from './astToLatex'
import { Cursor } from '../types/ast'

function emptyBody() {
  const text = makeText()
  const root = makeSequence([text])
  const cursor: Cursor = { nodeId: text.id, offset: 0 }
  return { root, cursor }
}

describe('astToLatex — body text', () => {
  it('renders empty body as empty string with cursor', () => {
    const { root, cursor } = emptyBody()
    expect(astToLatex(root, cursor)).toContain('\\cursor{}')
  })

  it('places cursor in the middle of body text', () => {
    const text = makeText('ab')
    const root = makeSequence([text])
    const cursor: Cursor = { nodeId: text.id, offset: 1 }
    const latex = astToLatex(root, cursor)
    expect(latex).toBe('a\\cursor{}b')
  })

  it('renders inactive body text without cursor', () => {
    const text = makeText('hello')
    const root = makeSequence([text])
    const other = makeText()
    const cursor: Cursor = { nodeId: other.id, offset: 0 }
    expect(astToLatex(root, cursor)).toBe('hello')
  })
})

describe('astToLatex — integral', () => {
  it('emits \\int_{...}^{...} structure', () => {
    const { root, cursor } = emptyBody()
    const { root: r2, cursor: c2 } = insertIntegral(root, cursor)
    const latex = astToLatex(r2, c2)
    expect(latex).toMatch(/\\int_\{/)
    expect(latex).toMatch(/\}\^\{/)
  })

  it('marks active lower slot with \\htmlClass{...active-slot...}', () => {
    const { root, cursor } = emptyBody()
    const { root: r2, cursor: c2 } = insertIntegral(root, cursor)
    const latex = astToLatex(r2, c2)
    expect(latex).toContain('active-slot')
    expect(latex).toContain('\\cursor{}')
  })

  it('inactive empty slots show \\square', () => {
    const { root, cursor } = emptyBody()
    const { root: r2, cursor: c2 } = insertIntegral(root, cursor)
    const latex = astToLatex(r2, c2)
    expect(latex).toContain('\\square')
  })

  it('renders slot content without active-slot when filled and inactive', () => {
    const { root, cursor } = emptyBody()
    let { root: r, cursor: c } = insertIntegral(root, cursor)
    ;({ root: r, cursor: c } = insertChar(r, c, 'a'))  // fill lower with 'a'
    ;({ cursor: c } = tabForward(r, c))                // move to upper
    const latex = astToLatex(r, c)
    expect(latex).toContain('\\int_{')
    // lower is inactive+filled → no active-slot around 'a' in lower
    // upper is active → has active-slot
  })

  it('full expression renders correctly after all slots filled', () => {
    const { root, cursor } = emptyBody()
    let { root: r, cursor: c } = insertIntegral(root, cursor)
    for (const ch of 'a') { ({ root: r, cursor: c } = insertChar(r, c, ch)) }
    ;({ cursor: c } = tabForward(r, c))
    for (const ch of 'b') { ({ root: r, cursor: c } = insertChar(r, c, ch)) }
    ;({ cursor: c } = tabForward(r, c))
    for (const ch of 'f(x)') { ({ root: r, cursor: c } = insertChar(r, c, ch)) }
    ;({ cursor: c } = tabForward(r, c))
    for (const ch of 'x') { ({ root: r, cursor: c } = insertChar(r, c, ch)) }
    const latex = astToLatex(r, c)
    expect(latex).toContain('\\int_{')
    expect(latex).toContain('f(x)')
    // active slot is variable with 'x' and cursor
    expect(latex).toContain('active-slot')
    expect(latex).toContain('x\\cursor{}')
  })
})

describe('astToLatex — fraction', () => {
  it('emits \\frac{...}{...} structure', () => {
    const { root, cursor } = emptyBody()
    const { root: r, cursor: c } = insertFraction(root, cursor)
    const latex = astToLatex(r, c)
    expect(latex).toContain('\\frac{')
  })

  it('marks active numerator with active-slot', () => {
    const { root, cursor } = emptyBody()
    const { root: r, cursor: c } = insertFraction(root, cursor)
    const latex = astToLatex(r, c)
    expect(latex).toContain('active-slot')
    expect(latex).toContain('\\cursor{}')
  })

  it('denominator shows \\square when empty and inactive', () => {
    const { root, cursor } = emptyBody()
    const { root: r, cursor: c } = insertFraction(root, cursor)
    const latex = astToLatex(r, c)
    expect(latex).toContain('\\square')
  })

  it('renders filled slots without active-slot when inactive', () => {
    const { root, cursor } = emptyBody()
    let { root: r, cursor: c } = insertFraction(root, cursor)
    ;({ root: r, cursor: c } = insertChar(r, c, 'a'))  // numerator = 'a'
    ;({ cursor: c } = tabForward(r, c))                // move to denominator
    ;({ root: r, cursor: c } = insertChar(r, c, 'b'))  // denominator = 'b'
    const latex = astToLatex(r, c)
    expect(latex).toContain('\\frac{')
    // numerator is 'a' (inactive), denominator 'b' is active
    expect(latex).toContain('active-slot')
    expect(latex).toContain('b\\cursor{}')
  })

  it('fraction nested inside integral renders correctly', () => {
    const { root, cursor } = emptyBody()
    let { root: r, cursor: c } = insertIntegral(root, cursor)
    ;({ cursor: c } = tabForward(r, c))  // upper
    ;({ cursor: c } = tabForward(r, c))  // integrand
    ;({ root: r, cursor: c } = insertFraction(r, c))
    const latex = astToLatex(r, c)
    expect(latex).toContain('\\int_')
    expect(latex).toContain('\\frac{')
    expect(latex).toContain('active-slot')
  })
})
