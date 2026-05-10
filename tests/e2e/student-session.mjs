/**
 * Student session — records a full video of a student working through
 * TMA4100 Oppgave 2 (improper integral) using toolbar buttons and keyboard.
 *
 * Output:
 *   screenshots/student/student-session.webm  ← the full video
 *   screenshots/student/replay.html           ← HTML player wrapping the video + screenshot milestones
 *
 * Run with: npm run student
 */

import { chromium } from 'playwright'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateReplay } from './replay-gen.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT      = path.join(__dirname, 'screenshots', 'student')
const BASE_URL = 'http://localhost:5176'
const W = 1200, H = 680

await mkdir(OUT, { recursive: true })

// ─── Screenshot milestones ────────────────────────────────────────────────────

let stepIndex = 0
const milestones = []

async function snap(page, label) {
  const idx  = String(stepIndex++).padStart(2, '0')
  const safe = label.replace(/[^a-zA-Z0-9_-]/g, '_')
  const file = path.join(OUT, `${idx}_${safe}.png`)
  await page.screenshot({ path: file })
  milestones.push({ label, file })
  console.log(`  📸  ${idx} — ${label}`)
}

// ─── Mouse helpers ────────────────────────────────────────────────────────────

// Get the center pixel of a locator
async function center(locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error(`Could not find bounding box for locator`)
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
}

// Move mouse smoothly from current position to (x, y)
async function moveTo(page, x, y, steps = 25) {
  await page.mouse.move(x, y, { steps })
  await page.waitForTimeout(80)
}

// Move then click, with a natural pause before clicking
async function clickAt(page, x, y, opts = {}) {
  await moveTo(page, x, y, opts.steps ?? 25)
  await page.waitForTimeout(opts.hover ?? 180)  // hover briefly before clicking
  await page.mouse.click(x, y)
  await page.waitForTimeout(opts.after ?? 250)
}

// Click a locator via its center coords (shows mouse movement)
async function clickLocator(page, locator, opts = {}) {
  const { x, y } = await center(locator)
  await clickAt(page, x, y, opts)
}

// ─── Keyboard helpers (dispatch directly to textarea) ─────────────────────────

async function key(page, k, opts = {}) {
  await page.locator('.editor-textarea').dispatchEvent('keydown', {
    key: k, bubbles: true, cancelable: true,
    ctrlKey: opts.ctrl ?? false, metaKey: opts.meta ?? false,
    altKey: opts.alt ?? false, shiftKey: opts.shift ?? false,
  })
  await page.waitForTimeout(opts.wait ?? 70)
}

async function pressTab(page) {
  await key(page, 'Tab', { wait: 350 })
}

// Type one character at a time with realistic keystroke rhythm
async function type(page, str, wpm = 55) {
  const msPerChar = Math.round(60000 / (wpm * 5))
  for (const ch of str) {
    await key(page, ch, { wait: msPerChar + Math.round(Math.random() * 30) })
  }
}

// Pause as if the student is reading / thinking
async function think(page, ms) {
  await page.waitForTimeout(ms)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('\n🎬  Starting student session recording…\n')

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  recordVideo: { dir: OUT, size: { width: W, height: H } },
})
const page = await context.newPage()
await page.setViewportSize({ width: W, height: H })

// Park mouse off-screen initially
await page.mouse.move(W / 2, H / 2)

// ─── 1. Load the app ──────────────────────────────────────────────────────────
console.log('  → Loading app…')
await page.goto(BASE_URL)
await page.waitForTimeout(1000)
await snap(page, '01_app_loaded')
await think(page, 800)

// ─── 2. Navigate to exam page ─────────────────────────────────────────────────
console.log('  → Opening exam page…')
const examTab = page.locator('button', { hasText: 'TMA4100' }).first()
await moveTo(page, W / 2, 200)      // drift mouse toward top
await clickLocator(page, examTab, { hover: 200, after: 600 })
await snap(page, '02_exam_page')

// ─── 3. Read Q2 card ──────────────────────────────────────────────────────────
console.log('  → Reading Q2…')

const q2Card = page.locator('.exam-card').filter({ hasText: 'Oppgave 2' })
// Scroll Q2 into the viewport so the mouse can interact with it
await q2Card.scrollIntoViewIfNeeded()
await think(page, 400)

const q2Box  = await q2Card.boundingBox()
// Move mouse over the question to "read" it
await moveTo(page, q2Box.x + 200, q2Box.y + 60, 30)
await think(page, 700)
await moveTo(page, q2Box.x + 400, q2Box.y + 120, 20)
await think(page, 1200)
await snap(page, '03_reading_q2')

// ─── 4. Click "Try in editor" ─────────────────────────────────────────────────
console.log('  → Clicking "Try in editor →"…')
const tryBtn = q2Card.locator('.exam-try-btn')
// Scroll try button into view, then use animated mouse click
await tryBtn.scrollIntoViewIfNeeded()
await clickLocator(page, tryBtn, { hover: 300, after: 700 })
await snap(page, '04_editor_open_restricted')

// Wait for editor tab to be active and toolbar to render
await page.locator('.editor-toolbar').waitFor({ state: 'visible', timeout: 5000 })
// Mouse drifts to editor area while student "reads" the restricted toolbar
await think(page, 500)
const toolbarBox = await page.locator('.editor-toolbar').boundingBox()
await moveTo(page, toolbarBox.x + 100, toolbarBox.y + toolbarBox.height / 2, 30)
await think(page, 800)   // reading available buttons

// ─── 5. Focus the editor by clicking the display ──────────────────────────────
console.log('  → Focusing editor…')
const displayBox = await page.locator('.editor-display').boundingBox()
const editorCx   = displayBox.x + displayBox.width / 2
const editorCy   = displayBox.y + displayBox.height / 2
await clickAt(page, editorCx, editorCy, { hover: 200, after: 300 })

// ─── 6. Click ∫ toolbar button ────────────────────────────────────────────────
console.log('  → Clicking ∫ button…')
// Find the integral toolbar button (first .toolbar-btn, which is ∫ when calculus group is active)
const integralBtn = page.locator('.toolbar-btn').first()
await clickLocator(page, integralBtn, { hover: 250, after: 500 })
await snap(page, '05_integral_inserted')

// ─── 7. Type lower bound: 1 ──────────────────────────────────────────────────
console.log('  → Typing lower bound "1"…')
await think(page, 400)
await type(page, '1')
await think(page, 300)
await snap(page, '06_lower_bound_1')

// ─── 8. Tab to upper bound ────────────────────────────────────────────────────
console.log('  → Tab to upper bound…')
await pressTab(page)
await think(page, 500)

// ─── 9. Click Ω (symbols) then click ∞ from palette ─────────────────────────
console.log('  → Opening symbol palette for ∞…')
// Find the Ω button (last in the main toolbar buttons before undo/redo)
const omegaBtn = page.locator('.toolbar-btn', { hasText: 'Ω' })
await clickLocator(page, omegaBtn, { hover: 250, after: 400 })

// Check if a palette opened; if so, click ∞. Otherwise fall back to typing.
const paletteVisible = await page.locator('.symbol-popover').isVisible().catch(() => false)
if (paletteVisible) {
  const infBtn = page.locator('.symbol-btn').filter({ hasText: '∞' }).first()
  if (await infBtn.count() > 0) {
    await clickLocator(page, infBtn, { hover: 150, after: 300 })
  } else {
    await page.keyboard.press('Escape')
    await think(page, 200)
    await type(page, '\\infty')
  }
} else {
  // Ω click put a character; undo and type \infty instead
  await key(page, 'z', { ctrl: true, wait: 200 })
  await think(page, 300)
  await type(page, '\\infty')
}

await think(page, 400)
await snap(page, '07_upper_bound_infty')

// ─── 10. Tab to integrand ─────────────────────────────────────────────────────
console.log('  → Tab to integrand…')
await pressTab(page)
await think(page, 700)   // student plans what to type here

// ─── 11. Click ½ to insert fraction ──────────────────────────────────────────
console.log('  → Clicking ½ button for fraction in integrand…')
const fractionBtn = page.locator('.toolbar-btn', { hasText: '½' })
await clickLocator(page, fractionBtn, { hover: 250, after: 500 })
await snap(page, '08_fraction_in_integrand')

// ─── 12. Type numerator: 3 ───────────────────────────────────────────────────
console.log('  → Typing numerator "3"…')
await think(page, 300)
await type(page, '3')
await think(page, 400)
await snap(page, '09_numerator_3')

// ─── 13. Tab to denominator ──────────────────────────────────────────────────
console.log('  → Tab to denominator…')
await pressTab(page)
await think(page, 600)

// ─── 14. Type (x+2) then click xⁿ for the power ─────────────────────────────
console.log('  → Typing denominator "(x+2)" then inserting power…')
await type(page, '(x+2)')
await think(page, 500)
await snap(page, '10_denominator_x_plus_2')

// Click xⁿ button for the power
const powerBtn = page.locator('.toolbar-btn', { hasText: 'xⁿ' }).first()
const powerBtnCount = await powerBtn.count()
if (powerBtnCount > 0) {
  await clickLocator(page, powerBtn, { hover: 250, after: 400 })
} else {
  // Fallback: press ^ key
  await key(page, '^', { wait: 200 })
}
await think(page, 300)

// ─── 15. Type exponent: 2 ────────────────────────────────────────────────────
console.log('  → Typing exponent "2"…')
await type(page, '2')
await think(page, 400)
await snap(page, '11_denominator_powered')

// ─── 16. Tab to variable ─────────────────────────────────────────────────────
console.log('  → Tab to variable slot…')
await pressTab(page)   // exponent → variable (trailing empty text in denominator skipped)
await think(page, 500)

// ─── 17. Type variable: x ────────────────────────────────────────────────────
console.log('  → Typing variable "x"…')
await type(page, 'x')
await think(page, 400)
await snap(page, '12_variable_x')

// ─── 18. Tab out of integral ─────────────────────────────────────────────────
console.log('  → Tab out of integral…')
await pressTab(page)
await think(page, 600)

// ─── 19. Type "= 1" ──────────────────────────────────────────────────────────
console.log('  → Typing "= 1"…')
await type(page, '= 1')
await think(page, 800)
await snap(page, '13_final_answer')

// ─── 20. Hover over Copy, then click ─────────────────────────────────────────
console.log('  → Copying LaTeX…')
const copyBtn = page.locator('.copy-btn').first()
await moveTo(page, editorCx, editorCy + 50, 20) // drift down toward copy bar
await clickLocator(page, copyBtn, { hover: 400, after: 600 })
await snap(page, '14_latex_copied')

await think(page, 1200)  // student admires the result

// ─── Finish ───────────────────────────────────────────────────────────────────
console.log('\n  Closing browser and finalising video…')
const video = page.video()
await context.close()
await browser.close()

const videoPath = await video.path()
const videoFile = path.basename(videoPath)

console.log(`  ✅  Video: ${videoPath}`)

// ─── Generate HTML player ─────────────────────────────────────────────────────
const replayHtmlPath = await generateReplay(OUT)
// Now build the combined player (video + milestone filmstrip)
await buildSessionHtml(OUT, videoFile, milestones)

console.log(`\n🎬  Open in browser:\n   ${path.join(OUT, 'session.html')}\n`)

// ─────────────────────────────────────────────────────────────────────────────

async function buildSessionHtml(dir, videoFile, milestones) {
  const { readFile } = await import('fs/promises')

  // Embed milestone screenshots as base64
  const frames = await Promise.all(milestones.map(async m => {
    const buf = await readFile(m.file)
    return { label: m.label, src: `data:image/png;base64,${buf.toString('base64')}` }
  }))

  const thumbsJson = JSON.stringify(frames)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Student Session — TMA4100 Oppgave 2</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1117; color: #e5e7eb; font-family: ui-monospace, monospace; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

  header { padding: 10px 16px; background: #1a1d27; border-bottom: 1px solid #2d3148; display: flex; align-items: center; gap: 12px; }
  header h1 { font-size: 14px; color: #e5e7eb; }
  header p  { font-size: 12px; color: #64748b; }
  .badge { font-size: 11px; background: #3b82f6; color: #fff; padding: 2px 8px; border-radius: 12px; }

  /* ── Video ───── */
  #video-wrap { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; background: #000; padding: 8px; position: relative; }
  video { max-width: 100%; max-height: 100%; border-radius: 4px; }

  /* ── Milestone filmstrip ───── */
  #filmstrip { display: flex; gap: 4px; overflow-x: auto; padding: 6px 8px; background: #0a0c13; border-top: 1px solid #2d3148; }
  #filmstrip::-webkit-scrollbar { height: 4px; }
  #filmstrip::-webkit-scrollbar-thumb { background: #3d4166; }
  .thumb { flex-shrink: 0; cursor: pointer; border-radius: 4px; overflow: hidden; border: 2px solid transparent; opacity: .55; transition: opacity .1s, border-color .1s; }
  .thumb:hover { opacity: .9; border-color: #3b82f6; }
  .thumb img { width: 130px; height: 65px; object-fit: cover; display: block; }
  .thumb-lbl { font-size: 9px; color: #64748b; padding: 2px 4px; background: #0f1117; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 130px; }

  /* ── Milestone overlay ───── */
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
  <div>
    <h1>TMA4100 — Oppgave 2: Improper Integral</h1>
    <p>Full student session · mouse movement + toolbar clicks · recorded with Playwright</p>
  </div>
</header>

<div id="video-wrap">
  <video src="${videoFile}" controls autoplay muted loop>
    <p style="color:#94a3b8;padding:20px">Video not found — run <code>npm run student</code> first.</p>
  </video>
  <div id="overlay">
    <img id="overlay-img" src="" alt="">
    <div id="overlay-label"></div>
    <button id="overlay-close">× Close</button>
  </div>
</div>

<div id="filmstrip"></div>

<script>
const THUMBS = ${thumbsJson};
const filmstrip = document.getElementById('filmstrip')
const overlay   = document.getElementById('overlay')
const overlayImg = document.getElementById('overlay-img')
const overlayLbl = document.getElementById('overlay-label')
const video     = document.querySelector('video')

THUMBS.forEach(t => {
  const div = document.createElement('div')
  div.className = 'thumb'
  div.innerHTML = \`<img src="\${t.src}" loading="lazy" alt=""><div class="thumb-lbl">\${t.label}</div>\`
  div.addEventListener('click', () => {
    overlayImg.src = t.src
    overlayLbl.textContent = t.label
    overlay.classList.add('visible')
    video.pause()
  })
  filmstrip.appendChild(div)
})

document.getElementById('overlay-close').addEventListener('click', () => {
  overlay.classList.remove('visible')
  video.play()
})
overlay.addEventListener('click', e => {
  if (e.target === overlay) { overlay.classList.remove('visible'); video.play() }
})
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { overlay.classList.remove('visible'); video.play() }
})
</script>
</body>
</html>`

  await writeFile(path.join(dir, 'session.html'), html, 'utf8')
}
