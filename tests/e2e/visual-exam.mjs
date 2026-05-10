/**
 * Visual exam test — simulates a student working through each TMA4100 question.
 * Loads the exam page, screenshots the question cards, clicks "Try in editor →",
 * then types a representative answer expression for each question.
 *
 * Run with: npm run visual:exam
 */

import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateReplay } from './replay-gen.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT      = path.join(__dirname, 'screenshots', 'exam')
const BASE_URL = 'http://localhost:5176'

await mkdir(OUT, { recursive: true })

// ─── Helpers ──────────────────────────────────────────────────────────────────

let stepIndex = 0

async function snap(page, label) {
  const idx  = String(stepIndex++).padStart(2, '0')
  const safe = label.replace(/[^a-zA-Z0-9_-]/g, '_')
  const file = path.join(OUT, `${idx}_${safe}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`  📸  ${idx} — ${label}`)
  return file
}

async function key(page, k, opts = {}) {
  await page.locator('.editor-textarea').dispatchEvent('keydown', {
    key: k, bubbles: true, cancelable: true,
    ctrlKey:  opts.ctrl  ?? false,
    metaKey:  opts.meta  ?? false,
    altKey:   opts.alt   ?? false,
    shiftKey: opts.shift ?? false,
  })
  await page.waitForTimeout(opts.wait ?? 60)
}

async function tab(page, shift = false) { await key(page, 'Tab', { shift, wait: 120 }) }

async function type(page, str) {
  for (const ch of str) await key(page, ch, { wait: 50 })
}

async function focusEditor(page) {
  await page.click('.editor-display')
  await page.waitForTimeout(150)
}

// Open exam tab then return to free editor with given question's tool groups
async function openExamQuestion(page, questionNumber) {
  // Click the exam tab
  await page.click('button:has-text("TMA4100")')
  await page.waitForTimeout(400)

  // Find the Try button for this question (by card header "Oppgave N")
  const card = page.locator('.exam-card').filter({ hasText: `Oppgave ${questionNumber}` })
  await snap(page, `q${questionNumber}_exam_card`)
  await card.locator('.exam-try-btn').click()
  await page.waitForTimeout(400)
  await snap(page, `q${questionNumber}_editor_restricted`)
  await focusEditor(page)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const browser = await chromium.launch({ headless: true })
const page    = await browser.newPage()
await page.setViewportSize({ width: 1100, height: 600 })
await page.goto(BASE_URL)
await page.waitForTimeout(900)

// ── Overview: exam question page ───────────────────────────────────────────────
console.log('\n── Overview: exam page')
await page.click('button:has-text("TMA4100")')
await page.waitForTimeout(400)
await snap(page, 'exam_page_overview')

// Scroll to show all questions
await page.evaluate(() => window.scrollTo(0, 300))
await page.waitForTimeout(200)
await snap(page, 'exam_page_questions')
await page.evaluate(() => window.scrollTo(0, 0))

// ─────────────────────────────────────────────────────────────────────────────
// Q1 — Limit (L'Hôpital)
// Student types: lim_{x→0} frac{e^x + e^{-x}}{cos(x)} = 2
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Q1: Limit — L\'Hôpital')
await openExamQuestion(page, '1')

// Insert limit node
await key(page, 'l', { alt: true, wait: 250 })
await snap(page, 'q1_limit_inserted')

// limitVar = x
await type(page, 'x')
await tab(page)
// approach = 0
await type(page, '0')
await tab(page)
await snap(page, 'q1_limit_x_to_0')

// Body: final L'Hôpital step evaluated at x=0: (e^0 + e^{-0}) / cos(0) = 2/1
// Show the fraction structure with power in numerator
await key(page, 'f', { alt: true, wait: 200 })
await snap(page, 'q1_fraction_in_body')

// Numerator: e^x  (single power showing the structure)
await type(page, 'e')
await key(page, '^', { wait: 120 })
await type(page, 'x')
// Tab → denominator directly (trailing empty text in numerator is skipped)
await tab(page)
await snap(page, 'q1_numerator_filled')

// Denominator: cos(x)
await type(page, 'cos(x)')
await snap(page, 'q1_denominator_filled')

// Tab out of fraction → limit body tail (skipped) → out of limit → root
await tab(page)
await tab(page)
await type(page, '= 2')
await snap(page, 'q1_answer_equals_2')

// ─────────────────────────────────────────────────────────────────────────────
// Q2 — Improper integral ∫_1^∞ 3/(x+2)² dx = 1
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Q2: Improper integral')
await page.reload(); await page.waitForTimeout(800)
await openExamQuestion(page, '2')

// Step 1: type the antiderivative evaluation form  [-3/(x+2)]_1^∞ = 1
// Eval bracket
await key(page, 'e', { alt: true, wait: 250 })
await snap(page, 'q2_eval_inserted')

// Body: -3/(x+2) as a fraction
await key(page, 'f', { alt: true, wait: 200 })
// Numerator: -3
await type(page, '-3')
await tab(page)
// Denominator: x+2
await type(page, 'x+2')
await snap(page, 'q2_fraction_in_eval')

// Tab out of fraction → eval lower
await tab(page)
// lower = 1
await type(page, '1')
await tab(page)
// upper = \infty
await type(page, '\\infty')
await snap(page, 'q2_eval_bounds_filled')

await tab(page)
await type(page, '= 1')
await snap(page, 'q2_answer')

// Also show the full integral setup
await page.reload(); await page.waitForTimeout(500)
await page.click('button:has-text("TMA4100")')
await page.waitForTimeout(200)
const card2 = page.locator('.exam-card').filter({ hasText: 'Oppgave 2' })
await card2.locator('.exam-try-btn').click()
await page.waitForTimeout(300)
await focusEditor(page)

await key(page, 'i', { alt: true, wait: 250 })  // integral
await type(page, '1'); await tab(page)            // lower = 1
await type(page, '\\infty'); await tab(page)      // upper = ∞
await key(page, 'f', { alt: true, wait: 200 })   // fraction in integrand
await type(page, '3'); await tab(page)            // numerator = 3
await type(page, '(x+2)')
await key(page, '^', { wait: 120 })
await type(page, '2')
await tab(page)                                   // exponent → variable (trailing empty skipped)
await type(page, 'x')
await tab(page)
await type(page, '= 1')
await snap(page, 'q2_full_integral')

// ─────────────────────────────────────────────────────────────────────────────
// Q4 — Implicit differentiation  y' = x/y
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Q4: Implicit differentiation')
await page.reload(); await page.waitForTimeout(800)
await openExamQuestion(page, '4')

// y' = x/y  (simple fraction, no integral/limit)
await type(page, "y'=")
await key(page, 'f', { alt: true, wait: 200 })
await type(page, 'x')
await tab(page)
await type(page, 'y')
await tab(page)
await snap(page, 'q4_y_prime_equals_x_over_y')

// Also show the sqrt result: y = ±1/√3
await type(page, ', y=')
await key(page, 'f', { alt: true, wait: 200 })
await type(page, '1')
await tab(page)
await key(page, 'r', { alt: true, wait: 200 })   // sqrt
await type(page, '3')
await tab(page)  // out of sqrt radicand → denominator
await tab(page)  // out of fraction
await snap(page, 'q4_with_sqrt_result')

// ─────────────────────────────────────────────────────────────────────────────
// Q5 — Taylor series   f^{(13)}(0) = -13!/7!
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Q5: Taylor / higher-order derivative')
await page.reload(); await page.waitForTimeout(800)
await openExamQuestion(page, '5')

// Show the sum definition
await key(page, 's', { alt: true, wait: 250 })
await snap(page, 'q5_sum_inserted')

await type(page, 'n=0'); await tab(page)    // lower
await type(page, '\\infty'); await tab(page) // upper
// summand: (-1)^n * frac{x^{4n+1}}{(2n+1)!}
await type(page, '(-1)')
await key(page, '^', { wait: 120 })
await type(page, 'n')
await tab(page)
await key(page, 'f', { alt: true, wait: 200 })
// numerator: x^{4n+1}
await type(page, 'x')
await key(page, '^', { wait: 120 })
await type(page, '4n+1')
await tab(page)
// denominator: (2n+1)!
await type(page, '(2n+1)!')
await tab(page)  // fraction denominator done → out
await tab(page)  // out of fraction, past sum body tail
await snap(page, 'q5_sum_expression')

// Then show the derivative result
await type(page, ', f')
await key(page, '^', { wait: 120 })
await type(page, '(13)')
await tab(page)
await type(page, '(0)=-')
await key(page, 'f', { alt: true, wait: 200 })
await type(page, '13!')
await tab(page)
await type(page, '7!')
await tab(page)
await snap(page, 'q5_derivative_answer')

// ─────────────────────────────────────────────────────────────────────────────
// Q9 — Power series interval of convergence  ∑ n(x+2)^n / 5^{n-1}
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Q9: Power series')
await page.reload(); await page.waitForTimeout(800)
await openExamQuestion(page, '9')

// Show the sum
await key(page, 's', { alt: true, wait: 250 })
await type(page, 'n=1'); await tab(page)    // lower
await type(page, '\\infty'); await tab(page) // upper
// summand: frac{n(x+2)^n}{5^{n-1}}
await key(page, 'f', { alt: true, wait: 200 })
// numerator: n(x+2)^n
await type(page, 'n(x+2)')
await key(page, '^', { wait: 120 })
await type(page, 'n')
await tab(page)          // exponent → (trailing text in numerator - but inSlot skips it) → denominator
// denominator: 5^{n-1}
await type(page, '5')
await key(page, '^', { wait: 120 })
await type(page, 'n-1')
await tab(page)          // exponent done → denominator done → summand tail → after sum
await tab(page)
await snap(page, 'q9_power_series')

// Ratio test result: |x+2|/5 < 1 → -7 < x < 3
await type(page, ', -7<x<3')
await snap(page, 'q9_convergence_interval')

// ─────────────────────────────────────────────────────────────────────────────

await browser.close()

console.log(`\n✅  ${stepIndex} screenshots saved to:\n   ${OUT}`)
console.log('\n⏳  Generating replay player…')
const replayFile = await generateReplay(OUT)
console.log(`\n🎬  Replay ready — open in browser:\n   ${replayFile}\n`)
