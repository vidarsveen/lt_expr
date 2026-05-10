/**
 * Visual inspection harness — launches a headed browser, performs interactions,
 * and saves a screenshot after each step so Claude can read them back as images
 * and spot visual / UX bugs.
 *
 * Run with:  node tests/e2e/visual.mjs
 * (dev server must already be running on the port below)
 */

import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateReplay } from './replay-gen.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'screenshots', 'visual')
const BASE_URL = 'http://localhost:5176'

await mkdir(OUT, { recursive: true })

// ─── Helpers ──────────────────────────────────────────────────────────────────

let stepIndex = 0

async function snap(page, label) {
  const idx = String(stepIndex++).padStart(2, '0')
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

async function focus(page) {
  await page.click('.editor-display')
  await page.waitForTimeout(150)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setViewportSize({ width: 1100, height: 500 })
await page.goto(BASE_URL)
await page.waitForTimeout(900)

// ── Scene 1: blank editor ─────────────────────────────────────────────────────
console.log('\n── Scene 1: blank editor')
await snap(page, 'blank_editor')

// ── Scene 2: typing plain text ────────────────────────────────────────────────
console.log('\n── Scene 2: typing body text')
await focus(page)
await type(page, 'Let f(x) = ')
await snap(page, 'body_text_typed')

// ── Scene 3: integral — inserting ─────────────────────────────────────────────
console.log('\n── Scene 3: integral')
await key(page, 'i', { alt: true, wait: 250 })
await snap(page, 'integral_just_inserted')

// ── Scene 4: integral — lower slot active (cursor blink visible?) ─────────────
await type(page, '0')
await snap(page, 'integral_lower_0')

await tab(page)
await type(page, '\\infty')
await snap(page, 'integral_upper_infty')

await tab(page)
await type(page, 'x')
await key(page, '^', { wait: 120 })
await type(page, '2')
await snap(page, 'integral_integrand_x_sq')

await tab(page)
// Trailing empty TextNode after power is skipped — one Tab lands directly in variable
await snap(page, 'integral_variable_active')

await type(page, 'x')
await snap(page, 'integral_variable_x')

await tab(page)
await snap(page, 'integral_done_cursor_after')

// ── Scene 5: fraction ─────────────────────────────────────────────────────────
console.log('\n── Scene 5: fraction')
await page.reload()
await page.waitForTimeout(800)
await focus(page)
await key(page, 'f', { alt: true, wait: 250 })
await snap(page, 'fraction_just_inserted')

await type(page, '1')
await snap(page, 'fraction_numerator_1')

await tab(page)
await type(page, '2')
await snap(page, 'fraction_denominator_2')

await tab(page)
await snap(page, 'fraction_done_cursor_after')

// ── Scene 6: square root ──────────────────────────────────────────────────────
console.log('\n── Scene 6: sqrt')
await page.reload()
await page.waitForTimeout(800)
await focus(page)
await key(page, 'r', { alt: true, wait: 250 })
await snap(page, 'sqrt_just_inserted')

await type(page, 'x')
await snap(page, 'sqrt_radicand_x')

await tab(page)
await snap(page, 'sqrt_done_cursor_after')

// ── Scene 7: power ────────────────────────────────────────────────────────────
console.log('\n── Scene 7: power')
await page.reload()
await page.waitForTimeout(800)
await focus(page)
await type(page, 'e')
await key(page, '^', { wait: 120 })
await snap(page, 'power_just_inserted')

await type(page, 'x')
await snap(page, 'power_exponent_x')

await tab(page)
await snap(page, 'power_done_cursor_after')

// ── Scene 8: eval bracket (antiderivative) ────────────────────────────────────
console.log('\n── Scene 8: eval bracket')
await page.reload()
await page.waitForTimeout(800)
await focus(page)
await key(page, 'e', { alt: true, wait: 250 })
await snap(page, 'eval_just_inserted')

await type(page, 'x')
await key(page, '^', { wait: 120 })
await type(page, '2')
await snap(page, 'eval_body_x_sq')

await tab(page)
await snap(page, 'eval_after_body_tab')

await type(page, '0')
await snap(page, 'eval_lower_0')

await tab(page)
await type(page, '1')
await snap(page, 'eval_upper_1')

await tab(page)
await snap(page, 'eval_done_cursor_after')

// ── Scene 9: sum ──────────────────────────────────────────────────────────────
console.log('\n── Scene 9: sum')
await page.reload()
await page.waitForTimeout(800)
await focus(page)
await key(page, 's', { alt: true, wait: 250 })
await snap(page, 'sum_just_inserted')

await type(page, 'n=1')
await snap(page, 'sum_lower_n1')

await tab(page)
await type(page, '\\infty')
await snap(page, 'sum_upper_infty')

await tab(page)
await type(page, 'a_n')
await snap(page, 'sum_body_an')

await tab(page)
await snap(page, 'sum_done_cursor_after')

// ── Scene 10: limit ───────────────────────────────────────────────────────────
console.log('\n── Scene 10: limit')
await page.reload()
await page.waitForTimeout(800)
await focus(page)
await key(page, 'l', { alt: true, wait: 250 })
await snap(page, 'limit_just_inserted')

await type(page, 'x')
await snap(page, 'limit_var_x')

await tab(page)
await type(page, '0')
await snap(page, 'limit_to_0')

await tab(page)
await type(page, 'f(x)')
await snap(page, 'limit_body_fx')

await tab(page)
await snap(page, 'limit_done_cursor_after')

// ── Scene 11: undo / redo ─────────────────────────────────────────────────────
console.log('\n── Scene 11: undo/redo')
await page.reload()
await page.waitForTimeout(800)
await focus(page)
await type(page, 'abc')
await snap(page, 'undo_before')
await key(page, 'z', { ctrl: true, wait: 100 })
await snap(page, 'undo_after_one')
await key(page, 'z', { ctrl: true, wait: 100 })
await snap(page, 'undo_after_two')
await key(page, 'y', { ctrl: true, wait: 100 })
await snap(page, 'redo_after_one')

// ── Scene 12: full expression (student's typical workflow) ────────────────────
console.log('\n── Scene 12: full antiderivative workflow')
await page.reload()
await page.waitForTimeout(800)
await focus(page)
// ∫ x² dx from 0 to 1 = [x³/3]₀¹
await key(page, 'i', { alt: true, wait: 250 })
await type(page, '0')
await tab(page)
await type(page, '1')
await tab(page)
// integrand: x^2
await type(page, 'x')
await key(page, '^', { wait: 120 })
await type(page, '2')
await tab(page)
// variable (trailing empty TextNode after power is skipped, so 1 Tab lands here directly)
await type(page, 'x')
await tab(page)
// cursor after integral
await type(page, ' = ')
// eval bracket [x³/3]₀¹
await key(page, 'e', { alt: true, wait: 250 })
// body: x^3 / 3 as a fraction
await key(page, 'f', { alt: true, wait: 250 })
await type(page, 'x')
await key(page, '^', { wait: 120 })
await type(page, '3')
await tab(page)
// fraction denominator (1 Tab from exponent, trailing empty skipped)
await type(page, '3')
await tab(page)
// eval lower
await type(page, '0')
await tab(page)
// eval upper
await type(page, '1')
await tab(page)
await type(page, ' = ')
await key(page, 'f', { alt: true, wait: 250 })
await type(page, '1')
await tab(page)
await type(page, '3')
await snap(page, 'full_antiderivative_expression')

await browser.close()

console.log(`\n✅  ${stepIndex} screenshots saved to:\n   ${OUT}`)
console.log('\n⏳  Generating replay player…')
const replayFile = await generateReplay(OUT)
console.log(`\n🎬  Replay ready — open in browser:\n   ${replayFile}\n`)
