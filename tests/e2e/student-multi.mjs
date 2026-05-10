/**
 * Multi-block student session — TMA4100 Oppgave 2 (improper integral).
 *
 * Mathematically correct solution flow:
 *   Math 1:  lim_{b→∞} ∫₁^b 3/(x+2)² dx      ← define the improper integral properly
 *   Text 1:  "The antiderivative is −3/(x+2). Evaluating at the bounds:"
 *   Math 2:  = lim_{b→∞} [−3/(x+2)]₁^b        ← introduce b in the eval bracket
 *   Text 2:  "As b→∞ the upper term →0. Lower bound gives −3/3 = −1:"
 *   Math 3:  = 0 − (−1) = 1
 *
 * Run with: npm run student:multi
 */

import { chromium } from 'playwright'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateReplay } from './replay-gen.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT      = path.join(__dirname, 'screenshots', 'student-multi')
const BASE_URL = 'http://localhost:5176'
const W = 1200, H = 720

await mkdir(OUT, { recursive: true })

// ─── Milestones ───────────────────────────────────────────────────────────────

let stepIndex = 0
const milestones = []

async function snap(page, label) {
  const idx  = String(stepIndex++).padStart(2, '0')
  const file = path.join(OUT, `${idx}_${label.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`)
  await page.screenshot({ path: file })
  milestones.push({ label, file })
  console.log(`  📸  ${idx} — ${label}`)
}

// ─── Mouse helpers ────────────────────────────────────────────────────────────

async function center(locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('no bounding box')
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
}

async function moveTo(page, x, y, steps = 25) {
  await page.mouse.move(x, y, { steps })
  await page.waitForTimeout(80)
}

async function clickAt(page, x, y, opts = {}) {
  await moveTo(page, x, y, opts.steps ?? 25)
  await page.waitForTimeout(opts.hover ?? 180)
  await page.mouse.click(x, y)
  await page.waitForTimeout(opts.after ?? 250)
}

async function clickLocator(page, locator, opts = {}) {
  await locator.scrollIntoViewIfNeeded()
  const { x, y } = await center(locator)
  await clickAt(page, x, y, opts)
}

// ─── Keyboard helpers ─────────────────────────────────────────────────────────

// Which math editor (0-indexed) is currently active
let activeEditorN = 0

async function key(page, k, opts = {}) {
  await page.locator('.editor-textarea').nth(activeEditorN).dispatchEvent('keydown', {
    key: k, bubbles: true, cancelable: true,
    ctrlKey: opts.ctrl ?? false, metaKey: opts.meta ?? false,
    altKey: opts.alt ?? false, shiftKey: opts.shift ?? false,
  })
  await page.waitForTimeout(opts.wait ?? 70)
}

async function pressTab(page) { await key(page, 'Tab', { wait: 300 }) }
async function think(page, ms) { await page.waitForTimeout(ms) }

async function typeMath(page, str, wpm = 50) {
  const ms = Math.round(60000 / (wpm * 5))
  for (const ch of str) {
    await key(page, ch, { wait: ms + Math.round(Math.random() * 25) })
  }
}

async function typeText(page, locator, str, wpm = 60) {
  await locator.click()
  await page.waitForTimeout(150)
  const ms = Math.round(60000 / (wpm * 5))
  for (const ch of str) {
    await page.keyboard.type(ch)
    await page.waitForTimeout(ms + Math.round(Math.random() * 20))
  }
}

// Get a toolbar button scoped to the Nth editor toolbar
function toolbarBtn(page, n, text) {
  return page.locator('.editor-toolbar').nth(n).locator('.toolbar-btn', { hasText: text })
}

// Focus the Nth math editor and update activeEditorN
async function focusMathEditor(page, n) {
  activeEditorN = n
  await page.locator('.editor-display').nth(n).click()
  await page.waitForTimeout(200)
}

// Scroll the last block into comfortable view
async function scrollToLast(page) {
  await page.locator('.doc-block').last().scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -80))
  await page.waitForTimeout(300)
}

async function addTextBlock(page) {
  const btn = page.locator('.block-gap-btn', { hasText: '+ Text' }).last()
  await clickLocator(page, btn, { hover: 250, after: 500 })
  await scrollToLast(page)
}

async function addMathBlock(page) {
  const btn = page.locator('.block-gap-btn', { hasText: '+ Math' }).last()
  await clickLocator(page, btn, { hover: 250, after: 500 })
  await scrollToLast(page)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('\n🎬  Starting student session…\n')

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  recordVideo: { dir: OUT, size: { width: W, height: H } },
})
const page = await context.newPage()
await page.setViewportSize({ width: W, height: H })
await page.mouse.move(W / 2, H / 2)

// ── Load & navigate to Q2 ─────────────────────────────────────────────────────
await page.goto(BASE_URL)
await page.waitForTimeout(900)

await clickLocator(page, page.locator('button', { hasText: 'TMA4100' }).first(), { hover: 200, after: 600 })

const q2Card = page.locator('.exam-card').filter({ hasText: 'Oppgave 2' })
await q2Card.scrollIntoViewIfNeeded()
await think(page, 400)

const q2Box = await q2Card.boundingBox()
await moveTo(page, q2Box.x + 120, q2Box.y + 50, 30)
await think(page, 600)
await moveTo(page, q2Box.x + 500, q2Box.y + 90, 20)
await think(page, 900)
await snap(page, '01_reading_q2')

await clickLocator(page, q2Card.locator('.exam-try-btn'), { hover: 300, after: 800 })
await page.locator('.editor-toolbar').waitFor({ state: 'visible', timeout: 5000 })
await think(page, 700)
await snap(page, '02_editor_ready')

// ─────────────────────────────────────────────────────────────────────────────
// MATH BLOCK 1 — lim_{b→∞} ∫₁^b 3/(x+2)² dx
//
// Tab trace (inSlot-empty skipping rules):
//   limitVar → approach → limit.body → integral.lower → integral.upper
//   → integrand → frac.num → frac.den → power.exp
//   → [skip: frac.den tail, integrand tail] → integral.variable
//   → [skip: limit.body tail] → root trailing
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n  [Math 1] lim_{b→∞} ∫₁^b 3/(x+2)² dx')

await focusMathEditor(page, 0)
await think(page, 500)

// Insert limit (lim button)
await clickLocator(page, toolbarBtn(page, 0, 'lim'), { hover: 250, after: 500 })
await snap(page, '03_limit_inserted')

// limitVar = b
await typeMath(page, 'b')
await pressTab(page)

// approach = \infty  (typed as \infty which KaTeX renders as ∞)
await typeMath(page, '\\infty')
await pressTab(page)
await think(page, 400)

// In limit body — insert integral
await clickLocator(page, toolbarBtn(page, 0, '∫'), { hover: 250, after: 400 })
await snap(page, '04_integral_in_limit')

// lower = 1
await typeMath(page, '1')
await pressTab(page)

// upper = b  (finite upper bound — this is what makes it a proper limit definition)
await typeMath(page, 'b')
await pressTab(page)
await think(page, 400)

// integrand: fraction 3/(x+2)²
await clickLocator(page, toolbarBtn(page, 0, '½'), { hover: 250, after: 400 })
await typeMath(page, '3')
await pressTab(page)
await typeMath(page, '(x+2)')
await key(page, '^', { wait: 150 })
await typeMath(page, '2')
await pressTab(page)   // skip: frac.den tail + integrand tail → variable

// variable = x
await typeMath(page, 'x')
await pressTab(page)   // skip: limit.body tail → root trailing
await think(page, 500)
await snap(page, '05_math_block_1_done')

// ─────────────────────────────────────────────────────────────────────────────
// TEXT BLOCK 1
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n  [Text 1]')
await addTextBlock(page)
await typeText(page, page.locator('.doc-text-area').last(),
  'The antiderivative of 3∕(x+2)² is −3∕(x+2) + C. Evaluating at the bounds:')
await think(page, 400)
await snap(page, '06_text_1_typed')

// ─────────────────────────────────────────────────────────────────────────────
// MATH BLOCK 2 — = lim_{b→∞} [−3/(x+2)]₁^b
//
// Tab trace:
//   "= " text → limitVar → approach → limit.body → eval.body
//   → frac.num → frac.den
//   → [skip: frac.den tail, eval.body tail] → eval.lower
//   → eval.upper
//   → [skip: eval tail in limit.body, limit.body tail] → root trailing
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n  [Math 2] = lim_{b→∞} [-3/(x+2)]₁^b')
await addMathBlock(page)
await snap(page, '07_math_block_2_added')

await focusMathEditor(page, 1)
await think(page, 400)

// "= " before the limit (plain text at root level)
await typeMath(page, '= ')

// Insert limit
await clickLocator(page, toolbarBtn(page, 1, 'lim'), { hover: 250, after: 400 })

// limitVar = b
await typeMath(page, 'b')
await pressTab(page)

// approach = \infty
await typeMath(page, '\\infty')
await pressTab(page)
await think(page, 300)

// In limit body — insert eval bracket
await clickLocator(page, toolbarBtn(page, 1, '[·]'), { hover: 250, after: 400 })
await snap(page, '08_eval_in_limit')

// Eval body: fraction −3/(x+2)
await clickLocator(page, toolbarBtn(page, 1, '½'), { hover: 200, after: 400 })
await typeMath(page, '-3')
await pressTab(page)
await typeMath(page, 'x+2')
await pressTab(page)   // skip: frac.den tail + eval.body tail → eval.lower

// lower = 1
await typeMath(page, '1')
await pressTab(page)   // → eval.upper

// upper = b  (finite — the limit handles the ∞)
await typeMath(page, 'b')
await pressTab(page)   // skip: eval tail + limit.body tail → root trailing
await think(page, 400)
await snap(page, '09_math_block_2_done')

// ─────────────────────────────────────────────────────────────────────────────
// TEXT BLOCK 2
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n  [Text 2]')
await addTextBlock(page)
await typeText(page, page.locator('.doc-text-area').last(),
  'As b → ∞, the upper term −3∕(b+2) → 0. The lower bound gives −3∕(1+2) = −1. So:')
await think(page, 400)
await snap(page, '10_text_2_typed')

// ─────────────────────────────────────────────────────────────────────────────
// MATH BLOCK 3 — = 0 − (−1) = 1
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n  [Math 3] = 0 − (−1) = 1')
await addMathBlock(page)
await snap(page, '11_math_block_3_added')

await focusMathEditor(page, 2)
await think(page, 500)

// Type the arithmetic step — upper term gave 0, lower term gave −(−1) = 1
await typeMath(page, '= 0-(-1) = 1')
await think(page, 600)
await snap(page, '12_final_result')

// ─────────────────────────────────────────────────────────────────────────────
// Show full document
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n  → Full document view…')
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
await think(page, 700)
await snap(page, '13_document_top')

await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }))
await think(page, 700)
await snap(page, '14_document_bottom')

await clickLocator(page, page.locator('.doc-export-bar .copy-btn'), { hover: 350, after: 600 })
await snap(page, '15_latex_copied')
await think(page, 800)

// ─── Finish ───────────────────────────────────────────────────────────────────
console.log('\n  Closing…')
const video = page.video()
await context.close()
await browser.close()

const videoPath = await video.path()
const videoFile = path.basename(videoPath)
console.log(`  ✅  Video: ${videoPath}`)

await generateReplay(OUT)
await buildSessionHtml(OUT, videoFile, milestones)
console.log(`\n🎬  Open:\n   ${path.join(OUT, 'session.html')}\n`)

// ─────────────────────────────────────────────────────────────────────────────

async function buildSessionHtml(dir, videoFile, milestones) {
  const { readFile } = await import('fs/promises')
  const frames = await Promise.all(milestones.map(async m => {
    const buf = await readFile(m.file)
    return { label: m.label, src: `data:image/png;base64,${buf.toString('base64')}` }
  }))
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Student Session — TMA4100 Q2</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1117; color: #e5e7eb; font-family: ui-monospace, monospace; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  header { padding: 10px 16px; background: #1a1d27; border-bottom: 1px solid #2d3148; display: flex; align-items: center; gap: 12px; }
  header h1 { font-size: 14px; } header p { font-size: 12px; color: #64748b; }
  .badge { font-size: 11px; background: #3b82f6; color: #fff; padding: 2px 8px; border-radius: 12px; white-space: nowrap; }
  #video-wrap { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; background: #000; padding: 8px; position: relative; }
  video { max-width: 100%; max-height: 100%; border-radius: 4px; }
  #filmstrip { display: flex; gap: 4px; overflow-x: auto; padding: 6px 8px; background: #0a0c13; border-top: 1px solid #2d3148; }
  #filmstrip::-webkit-scrollbar { height: 4px; } #filmstrip::-webkit-scrollbar-thumb { background: #3d4166; }
  .thumb { flex-shrink: 0; cursor: pointer; border-radius: 4px; overflow: hidden; border: 2px solid transparent; opacity: .55; transition: opacity .1s, border-color .1s; }
  .thumb:hover { opacity: .9; border-color: #3b82f6; }
  .thumb img { width: 130px; height: 65px; object-fit: cover; display: block; }
  .thumb-lbl { font-size: 9px; color: #64748b; padding: 2px 4px; background: #0f1117; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 130px; }
  #overlay { display: none; position: absolute; inset: 0; background: rgba(0,0,0,.85); align-items: center; justify-content: center; flex-direction: column; gap: 12px; z-index: 10; }
  #overlay.visible { display: flex; }
  #overlay img { max-width: 95%; max-height: 85%; object-fit: contain; border-radius: 6px; }
  #overlay-label { font-size: 13px; color: #94a3b8; }
  #overlay-close { padding: 6px 20px; background: #3b82f6; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
</style>
</head>
<body>
<header>
  <span class="badge">LIVE RECORDING</span>
  <div><h1>TMA4100 — Oppgave 2 · improper integral · realistic student solution</h1>
  <p>lim definition → antiderivative → evaluate at b → let b→∞</p></div>
</header>
<div id="video-wrap">
  <video src="${videoFile}" controls autoplay muted loop></video>
  <div id="overlay">
    <img id="overlay-img" src="" alt="">
    <div id="overlay-label"></div>
    <button id="overlay-close">× Close</button>
  </div>
</div>
<div id="filmstrip"></div>
<script>
const T=${JSON.stringify(frames)}
const fs=document.getElementById('filmstrip'),ov=document.getElementById('overlay'),oi=document.getElementById('overlay-img'),ol=document.getElementById('overlay-label'),v=document.querySelector('video')
T.forEach(t=>{const d=document.createElement('div');d.className='thumb';d.innerHTML=\`<img src="\${t.src}" loading="lazy"><div class="thumb-lbl">\${t.label}</div>\`;d.onclick=()=>{oi.src=t.src;ol.textContent=t.label;ov.classList.add('visible');v.pause()};fs.appendChild(d)})
document.getElementById('overlay-close').onclick=()=>{ov.classList.remove('visible');v.play()}
ov.onclick=e=>{if(e.target===ov){ov.classList.remove('visible');v.play()}}
document.onkeydown=e=>{if(e.key==='Escape'){ov.classList.remove('visible');v.play()}}
</script>
</body>
</html>`
  await writeFile(path.join(dir, 'session.html'), html, 'utf8')
}
