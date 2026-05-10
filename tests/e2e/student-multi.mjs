/**
 * Multi-block student session — TMA4100 Oppgave 2.
 * The problem is shown on the exam card; the student jumps straight into
 * writing the solution across math + text blocks, with the viewport
 * scrolling to keep the active block in frame.
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

// ─── Keyboard / typing helpers ────────────────────────────────────────────────

// Dispatch to the Nth math editor's hidden textarea (0-indexed from top)
async function key(page, k, opts = {}, editorN = -1) {
  const selector = editorN < 0
    ? '.editor-textarea'
    : `.editor-textarea`
  const loc = editorN < 0
    ? page.locator(selector).last()
    : page.locator(selector).nth(editorN)
  await loc.dispatchEvent('keydown', {
    key: k, bubbles: true, cancelable: true,
    ctrlKey: opts.ctrl ?? false, metaKey: opts.meta ?? false,
    altKey: opts.alt ?? false, shiftKey: opts.shift ?? false,
  })
  await page.waitForTimeout(opts.wait ?? 70)
}

async function pressTab(page)        { await key(page, 'Tab', { wait: 300 }) }
async function think(page, ms)       { await page.waitForTimeout(ms) }

async function typeMath(page, str, wpm = 50) {
  const ms = Math.round(60000 / (wpm * 5))
  for (const ch of str) {
    await key(page, ch, { wait: ms + Math.round(Math.random() * 25) })
  }
}

// Type into a regular <textarea> (text blocks)
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

// Focus the Nth math editor by clicking its display
async function focusMathEditor(page, n) {
  await page.locator('.editor-display').nth(n).click()
  await page.waitForTimeout(200)
}

// Scroll the last block into a comfortable viewing position
async function scrollToLast(page) {
  const last = page.locator('.doc-block').last()
  await last.scrollIntoViewIfNeeded()
  // nudge up a bit so there's context above
  await page.evaluate(() => window.scrollBy(0, -80))
  await page.waitForTimeout(300)
}

// ─── Block insertion helpers ──────────────────────────────────────────────────

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

console.log('\n🎬  Starting multi-block student session…\n')

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  recordVideo: { dir: OUT, size: { width: W, height: H } },
})
const page = await context.newPage()
await page.setViewportSize({ width: W, height: H })
await page.mouse.move(W / 2, H / 2)

// ── Load & navigate to exam ────────────────────────────────────────────────────
await page.goto(BASE_URL)
await page.waitForTimeout(900)

await clickLocator(page, page.locator('button', { hasText: 'TMA4100' }).first(), { hover: 200, after: 600 })

// ── Student reads Q2 ──────────────────────────────────────────────────────────
const q2Card = page.locator('.exam-card').filter({ hasText: 'Oppgave 2' })
await q2Card.scrollIntoViewIfNeeded()
await think(page, 400)

const q2Box = await q2Card.boundingBox()
await moveTo(page, q2Box.x + 120, q2Box.y + 50, 30)
await think(page, 500)
await moveTo(page, q2Box.x + 500, q2Box.y + 90, 20)
await think(page, 900)
await snap(page, '01_reading_q2')

// ── Click "Try in editor →" ───────────────────────────────────────────────────
await clickLocator(page, q2Card.locator('.exam-try-btn'), { hover: 300, after: 800 })
await page.locator('.editor-toolbar').waitFor({ state: 'visible', timeout: 5000 })
await think(page, 600)   // student thinks before starting
await snap(page, '02_editor_ready')

// ─────────────────────────────────────────────────────────────────────────────
// MATH BLOCK 1 — antiderivative evaluation: [−3/(x+2)]₁^∞
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n  [Math 1] Eval bracket [-3/(x+2)]₁^∞')

await focusMathEditor(page, 0)
await think(page, 500)

// [·] eval bracket
await clickLocator(page, toolbarBtn(page, 0, '[·]'), { hover: 250, after: 500 })
await snap(page, '03_eval_bracket_inserted')

// Body: fraction -3/(x+2)
await clickLocator(page, toolbarBtn(page, 0, '½'), { hover: 200, after: 400 })
await typeMath(page, '-3')
await pressTab(page)
await typeMath(page, 'x+2')
await pressTab(page)   // out of fraction → eval lower
await think(page, 300)
await snap(page, '04_fraction_in_eval')

// Lower = 1
await typeMath(page, '1')
await pressTab(page)

// Upper = ∞ via symbol palette
await clickLocator(page, toolbarBtn(page, 0, 'Ω'), { hover: 200, after: 350 })
const paletteOpen = await page.locator('.symbol-popover').isVisible().catch(() => false)
if (paletteOpen) {
  const infBtn = page.locator('.symbol-btn').filter({ hasText: '∞' }).first()
  if (await infBtn.count() > 0) {
    await clickLocator(page, infBtn, { hover: 120, after: 250 })
  } else {
    await page.keyboard.press('Escape')
    await typeMath(page, '\\infty')
  }
} else {
  await key(page, 'z', { ctrl: true, wait: 200 })
  await typeMath(page, '\\infty')
}
await pressTab(page)   // out of eval bracket
await think(page, 400)
await snap(page, '05_eval_bounds_done')

// ─────────────────────────────────────────────────────────────────────────────
// TEXT BLOCK 1 — bridge to the limit argument
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n  [Text 1] Limit argument')

await addTextBlock(page)
await snap(page, '06_text_block_added')

await typeText(page, page.locator('.doc-text-area').last(),
  'As b → ∞, the term −3/(b+2) → 0, leaving:')
await think(page, 400)
await snap(page, '07_text_typed')

// ─────────────────────────────────────────────────────────────────────────────
// MATH BLOCK 2 — final result
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n  [Math 2] = 0 - (-1) = 1')

await addMathBlock(page)
await snap(page, '08_math_block_2_added')

await focusMathEditor(page, 1)
await think(page, 400)

// = 0 - fraction(-3/3) = 1  →  just type the readable form
await typeMath(page, '= 0 - (')
await clickLocator(page, toolbarBtn(page, 1, '½'), { hover: 200, after: 300 })
await typeMath(page, '-3')
await pressTab(page)
await typeMath(page, '3')
await pressTab(page)   // out of fraction
await typeMath(page, ') = 1')
await think(page, 500)
await snap(page, '09_final_result')

// ── Scroll to top to show full document ───────────────────────────────────────
console.log('\n  → Showing full document…')
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
await think(page, 700)
await snap(page, '10_document_overview_top')

await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }))
await think(page, 700)
await snap(page, '11_document_overview_bottom')

// ── Copy full LaTeX ────────────────────────────────────────────────────────────
await clickLocator(page, page.locator('.doc-export-bar .copy-btn'), { hover: 350, after: 600 })
await snap(page, '12_latex_copied')
await think(page, 800)

// ─── Finish ───────────────────────────────────────────────────────────────────
console.log('\n  Closing and finalising video…')
const video = page.video()
await context.close()
await browser.close()

const videoPath = await video.path()
const videoFile = path.basename(videoPath)
console.log(`  ✅  Video: ${videoPath}`)

await generateReplay(OUT)
await buildSessionHtml(OUT, videoFile, milestones)
console.log(`\n🎬  Open in browser:\n   ${path.join(OUT, 'session.html')}\n`)

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
<title>Student Session — TMA4100 Q2 Multi-block</title>
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
  <div><h1>TMA4100 — Oppgave 2 · student solution · multi-block</h1>
  <p>Eval bracket + text explanation + final result — Playwright recording</p></div>
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
const T=JSON.parse(${JSON.stringify(JSON.stringify(frames))})
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
