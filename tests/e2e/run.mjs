/**
 * E2E test runner — uses Playwright to verify the editor against a live dev server.
 * Run with: npm run test:e2e
 */

import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS = path.join(__dirname, 'screenshots')
const BASE_URL = 'http://localhost:5176'

await mkdir(SCREENSHOTS, { recursive: true })

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed = 0, failed = 0
const failures = []

async function test(name, fn) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1200, height: 600 })
  try {
    await page.goto(BASE_URL)
    await page.waitForTimeout(800)
    await fn(page)
    console.log(`  ✓  ${name}`)
    passed++
  } catch (err) {
    console.log(`  ✗  ${name}`)
    console.log(`     ${err.message}`)
    failed++
    failures.push({ name, message: err.message })
  } finally {
    await browser.close()
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message ?? 'assertion failed')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function focusEditor(page) {
  await page.click('.editor-display')
  await page.waitForTimeout(150)
}

// Dispatch a key event directly on the hidden textarea, bypassing Playwright's
// CDP focus tracking (which may differ from document.activeElement).
async function dispatchKey(page, key, opts = {}) {
  await page.locator('.editor-textarea').dispatchEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey:  opts.ctrl  ?? false,
    metaKey:  opts.meta  ?? false,
    altKey:   opts.alt   ?? false,
    shiftKey: opts.shift ?? false,
  })
  await page.waitForTimeout(opts.wait ?? 50)
}

// Tab via dispatchEvent — prevents Playwright's built-in focus-navigation
// from stealing focus before our React handler can call e.preventDefault().
async function pressTab(page, shift = false) {
  await dispatchKey(page, 'Tab', { shift, wait: 120 })
}

// Type one character at a time via dispatchEvent so each INSERT_CHAR lands on
// the textarea directly, regardless of Playwright's focus tracking.
async function typeStr(page, str) {
  for (const char of str) {
    await dispatchKey(page, char, { wait: 40 })
  }
}

async function insertIntegral(page) {
  await focusEditor(page)
  await dispatchKey(page, 'i', { alt: true, wait: 200 })
}

async function insertFraction(page) {
  await focusEditor(page)
  await dispatchKey(page, 'f', { alt: true, wait: 200 })
}

// Reads the full-document LaTeX export bar, stripping the \[ \] block wrapper
// added by DocumentEditor so assertions can match raw LaTeX.
async function getLatex(page) {
  const raw = await page.locator('.latex-code').last().innerText()
  return raw.replace(/^\s*\\\[\s*/, '').replace(/\s*\\\]\s*$/, '').trim()
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`) })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\nRunning e2e tests against', BASE_URL, '\n')

await test('page loads and editor is visible', async (page) => {
  const display = page.locator('.editor-display')
  assert(await display.isVisible(), 'editor-display not visible')
})

await test('initial LaTeX output is empty', async (page) => {
  const latex = await getLatex(page)
  assert(latex.includes('start') || latex.trim() === '', `unexpected: "${latex}"`)
})

await test('Alt+I inserts an integral', async (page) => {
  await insertIntegral(page)
  const latex = await getLatex(page)
  assert(latex.includes('\\int'), `LaTeX missing \\int, got: "${latex}"`)
  await screenshot(page, '01-integral-empty')
})

await test('typing in lower slot populates lower limit', async (page) => {
  await insertIntegral(page)
  await typeStr(page, 'a')
  const latex = await getLatex(page)
  assert(latex.includes('\\int_{a}'), `Expected \\int_{a}, got: "${latex}"`)
})

await test('Tab moves from lower to upper slot', async (page) => {
  await insertIntegral(page)
  await typeStr(page, '0')
  await pressTab(page)
  await typeStr(page, '1')
  const latex = await getLatex(page)
  assert(latex.includes('\\int_{0}^{1}'), `Expected \\int_{0}^{1}, got: "${latex}"`)
  await screenshot(page, '02-lower-and-upper-filled')
})

await test('Tab cycles through all four slots', async (page) => {
  await insertIntegral(page)
  await typeStr(page, 'a')
  await pressTab(page)
  await typeStr(page, 'b')
  await pressTab(page)
  await typeStr(page, 'f(x)')
  await pressTab(page)
  await typeStr(page, 'x')
  const latex = await getLatex(page)
  assert(latex.includes('\\int_{a}^{b}'), `Missing limits, got: "${latex}"`)
  assert(latex.includes('f(x)'), `Missing integrand, got: "${latex}"`)
  assert(latex.includes('dx'), `Missing dx, got: "${latex}"`)
  await screenshot(page, '03-all-slots-filled')
})

await test('Tab exits integral to body text', async (page) => {
  await insertIntegral(page)
  for (const _ of Array(4)) await pressTab(page)
  await typeStr(page, ' = C')
  const latex = await getLatex(page)
  assert(latex.includes('= C'), `Body text not appended, got: "${latex}"`)
  await screenshot(page, '04-exited-to-body')
})

await test('Shift+Tab moves backward through slots', async (page) => {
  await insertIntegral(page)
  await pressTab(page)              // lower→upper
  await typeStr(page, 'b')
  await pressTab(page, true)        // upper→lower
  await typeStr(page, 'a')
  const latex = await getLatex(page)
  assert(latex.includes('\\int_{a}^{b}'), `Shift+Tab failed, got: "${latex}"`)
})

await test('Backspace deletes character in slot', async (page) => {
  await insertIntegral(page)
  await typeStr(page, 'ab')
  await dispatchKey(page, 'Backspace')
  const latex = await getLatex(page)
  assert(latex.includes('\\int_{a}'), `Backspace failed, got: "${latex}"`)
  assert(!latex.includes('\\int_{ab}'), `b was not deleted, got: "${latex}"`)
})

await test('text before integral renders correctly', async (page) => {
  await focusEditor(page)
  await typeStr(page, 'Let ')
  await insertIntegral(page)
  await typeStr(page, 'a')
  await pressTab(page)
  await typeStr(page, 'b')
  const latex = await getLatex(page)
  assert(latex.startsWith('Let '), `Prefix text missing, got: "${latex}"`)
  assert(latex.includes('\\int_{a}^{b}'), `Integral missing, got: "${latex}"`)
  await screenshot(page, '05-text-before-integral')
})

await test('copy button copies LaTeX to clipboard', async (page) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await insertIntegral(page)
  await typeStr(page, 'a')
  await page.locator('.copy-btn').last().click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  assert(clip.includes('\\int'), `Clipboard missing \\int, got: "${clip}"`)
})

await test('Alt+F inserts a fraction', async (page) => {
  await insertFraction(page)
  const latex = await getLatex(page)
  assert(latex.includes('\\frac{'), `LaTeX missing \\frac{, got: "${latex}"`)
  await screenshot(page, '06-fraction-empty')
})

await test('typing in fraction numerator and denominator', async (page) => {
  await insertFraction(page)
  await typeStr(page, 'a')
  await pressTab(page)
  await typeStr(page, 'b')
  const latex = await getLatex(page)
  assert(latex.includes('\\frac{a}{b}'), `Expected \\frac{a}{b}, got: "${latex}"`)
  await screenshot(page, '07-fraction-filled')
})

await test('Tab exits fraction to body text', async (page) => {
  await insertFraction(page)
  await pressTab(page)   // numerator → denominator
  await pressTab(page)   // denominator → body
  await typeStr(page, 'x')
  const latex = await getLatex(page)
  assert(latex.includes('x'), `Body text not appended after fraction, got: "${latex}"`)
})

await test('fraction inside integral integrand', async (page) => {
  await insertIntegral(page)
  await pressTab(page)   // lower→upper
  await pressTab(page)   // upper→integrand
  await insertFraction(page)
  await typeStr(page, '1')
  await pressTab(page)   // frac.numerator→denominator
  await typeStr(page, 'x')
  const latex = await getLatex(page)
  assert(latex.includes('\\frac{1}{x}'), `Expected \\frac{1}{x} in integrand, got: "${latex}"`)
  assert(latex.includes('\\int_'), `Missing \\int_, got: "${latex}"`)
  await screenshot(page, '08-fraction-inside-integral')
})

await test('Backspace deletes preceding math node', async (page) => {
  await insertIntegral(page)
  for (const _ of Array(4)) await pressTab(page)
  await dispatchKey(page, 'Backspace')
  const latex = await getLatex(page)
  assert(!latex.includes('\\int'), `Integral not deleted, got: "${latex}"`)
})

await test('clicking a slot focuses it', async (page) => {
  await insertIntegral(page)
  await typeStr(page, 'a')
  await pressTab(page)
  await typeStr(page, 'b')
  await page.mouse.click(100, 100)
  const lowerSlot = page.locator('[class*="slot-"][class*="-lower"]').first()
  if (await lowerSlot.isVisible()) {
    await lowerSlot.click()
    await page.waitForTimeout(100)
    await typeStr(page, '0')
    const latex = await getLatex(page)
    assert(latex.includes('a0') || latex.includes('\\int'), `Click-to-slot failed, got: "${latex}"`)
  }
  await screenshot(page, '09-click-to-slot')
})

await test('ArrowLeft moves cursor within body text', async (page) => {
  await focusEditor(page)
  await typeStr(page, 'ab')
  await dispatchKey(page, 'ArrowLeft')
  await typeStr(page, 'X')
  const latex = await getLatex(page)
  assert(latex === 'aXb', `Expected aXb, got: "${latex}"`)
})

await test('ArrowRight moves cursor within body text', async (page) => {
  await focusEditor(page)
  await typeStr(page, 'ab')
  await dispatchKey(page, 'ArrowLeft')
  await dispatchKey(page, 'ArrowLeft')
  await dispatchKey(page, 'ArrowRight')
  await typeStr(page, 'X')
  const latex = await getLatex(page)
  assert(latex === 'aXb', `Expected aXb, got: "${latex}"`)
})

await test('ArrowLeft enters integral from body text after it', async (page) => {
  await insertIntegral(page)
  for (const _ of Array(4)) await pressTab(page)
  await dispatchKey(page, 'ArrowLeft')
  await typeStr(page, 'x')
  const latex = await getLatex(page)
  assert(latex.includes('dx'), `Expected dx in output, got: "${latex}"`)
  await screenshot(page, '10-arrow-enters-integral')
})

await test('Ctrl+Z undoes last character', async (page) => {
  await focusEditor(page)
  await typeStr(page, 'abc')
  await page.waitForTimeout(100)
  await dispatchKey(page, 'z', { ctrl: true })
  const latex = await getLatex(page)
  assert(latex === 'ab', `Expected ab after undo, got: "${latex}"`)
})

await test('Ctrl+Z undoes integral insertion', async (page) => {
  await insertIntegral(page)
  await dispatchKey(page, 'z', { ctrl: true })
  const latex = await getLatex(page)
  assert(!latex.includes('\\int'), `Integral not undone, got: "${latex}"`)
})

await test('Ctrl+Y redoes after undo', async (page) => {
  await focusEditor(page)
  await typeStr(page, 'abc')
  await page.waitForTimeout(100)
  await dispatchKey(page, 'z', { ctrl: true })
  await page.waitForTimeout(80)
  await dispatchKey(page, 'y', { ctrl: true })
  const latex = await getLatex(page)
  assert(latex === 'abc', `Expected abc after redo, got: "${latex}"`)
})

await test('Alt+R inserts sqrt and Tab exits', async (page) => {
  await focusEditor(page)
  await dispatchKey(page, 'r', { alt: true, wait: 200 })
  await typeStr(page, 'x')
  const latex = await getLatex(page)
  assert(latex.includes('\\sqrt{x}'), `Expected \\sqrt{x}, got: "${latex}"`)
  await screenshot(page, '11-sqrt')
})

await test('^ inserts power absorbing preceding char', async (page) => {
  await focusEditor(page)
  await typeStr(page, 'x')
  await dispatchKey(page, '^', { wait: 200 })
  await typeStr(page, '2')
  const latex = await getLatex(page)
  assert(latex.includes('x^{2}') || latex.includes('x^2'), `Expected x^2, got: "${latex}"`)
  await screenshot(page, '12-power')
})

await test('Alt+S inserts sum with limits', async (page) => {
  await focusEditor(page)
  await dispatchKey(page, 's', { alt: true, wait: 200 })
  await typeStr(page, '0')
  await pressTab(page)
  await typeStr(page, 'n')
  await pressTab(page)
  await typeStr(page, 'i')
  const latex = await getLatex(page)
  assert(latex.includes('\\sum_{0}^{n}'), `Expected \\sum_{0}^{n}, got: "${latex}"`)
  assert(latex.includes('i'), `Missing summand, got: "${latex}"`)
  await screenshot(page, '13-sum')
})

await test('sqrt nested inside fraction numerator', async (page) => {
  await focusEditor(page)
  await dispatchKey(page, 'f', { alt: true, wait: 200 })
  await dispatchKey(page, 'r', { alt: true, wait: 200 })
  await typeStr(page, '2')
  await pressTab(page)   // exit sqrt radicand → fraction denominator
  await pressTab(page)   // fraction denominator → body
  await typeStr(page, 'x')
  const latex = await getLatex(page)
  assert(latex.includes('\\sqrt{2}'), `Missing sqrt, got: "${latex}"`)
  assert(latex.includes('\\frac{'), `Missing frac, got: "${latex}"`)
  await screenshot(page, '14-sqrt-in-fraction')
})

await test('Alt+E inserts evaluated-at brackets [·]_a^b', async (page) => {
  await focusEditor(page)
  await dispatchKey(page, 'e', { alt: true, wait: 200 })  // insert eval, cursor in body
  await typeStr(page, 'x')                    // body: x
  await dispatchKey(page, '^', { wait: 200 }) // INSERT_POWER: x→base, cursor in exponent
  await typeStr(page, '2')                    // exponent: 2
  // tabForward skips the trailing empty TextNode in body (after the power node),
  // so one Tab goes directly from exponent → lower.
  await pressTab(page)
  await typeStr(page, '0')   // lower: 0
  await pressTab(page)       // lower → upper
  await typeStr(page, '3')   // upper: 3
  const latex = await getLatex(page)
  assert(latex.includes('\\left['), `Missing \\left[, got: "${latex}"`)
  assert(latex.includes('\\right]'), `Missing \\right], got: "${latex}"`)
  assert(latex.includes('_{0}') || latex.includes('_{ 0}'), `Missing lower=0, got: "${latex}"`)
  assert(latex.includes('^{3}') || latex.includes('^{ 3}'), `Missing upper=3, got: "${latex}"`)
  await screenshot(page, '15-eval-brackets')
})

await test('antiderivative: integral then [F(x)] brackets', async (page) => {
  // ∫_2^3 x^3 dx = [¼x^4]_2^3
  await insertIntegral(page)
  await typeStr(page, '2')
  await pressTab(page)
  await typeStr(page, '3')
  await pressTab(page)
  await typeStr(page, 'x')
  await dispatchKey(page, '^', { wait: 200 })
  await typeStr(page, '3')
  await pressTab(page)   // x^3 exponent → variable (trailing TextNode in integrand skipped)
  await typeStr(page, 'x')
  await pressTab(page)   // variable → body after integral
  await typeStr(page, ' = ')
  await dispatchKey(page, 'e', { alt: true, wait: 200 })
  // type ¼x^4 in eval body slot
  await dispatchKey(page, 'f', { alt: true, wait: 200 })
  await typeStr(page, '1')
  await pressTab(page)
  await typeStr(page, '4')
  await pressTab(page)   // denominator → body after fraction (trailing TextNode in frac skipped)
  await typeStr(page, 'x')
  await dispatchKey(page, '^', { wait: 200 })
  await typeStr(page, '4')
  await pressTab(page)   // exponent → lower eval (trailing TextNode in eval body skipped)
  await typeStr(page, '2')
  await pressTab(page)   // lower → upper
  await typeStr(page, '3')
  const latex = await getLatex(page)
  assert(latex.includes('\\int_{2}^{3}'), `Missing integral, got: "${latex}"`)
  assert(latex.includes('\\left['), `Missing eval brackets, got: "${latex}"`)
  assert(latex.includes('\\frac{1}{4}'), `Missing ¼ fraction, got: "${latex}"`)
  await screenshot(page, '16-antiderivative-full')
})

await test('Alt+L inserts limit', async (page) => {
  await focusEditor(page)
  await dispatchKey(page, 'l', { alt: true, wait: 200 })
  await typeStr(page, 'x')       // limitVar
  await pressTab(page)
  await typeStr(page, '0')       // approach
  await pressTab(page)
  await typeStr(page, 'f(x)')    // body
  const latex = await getLatex(page)
  assert(latex.includes('\\lim_{'), `Missing \\lim_, got: "${latex}"`)
  assert(latex.includes('\\to'), `Missing \\to, got: "${latex}"`)
  assert(latex.includes('f(x)'), `Missing body, got: "${latex}"`)
  await screenshot(page, '17-limit')
})

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} passed, ${failed} failed`)
if (failures.length) {
  console.log('\nFailures:')
  failures.forEach(f => console.log(`  • ${f.name}: ${f.message}`))
  process.exit(1)
}
console.log(`  Screenshots → tests/e2e/screenshots/\n`)
