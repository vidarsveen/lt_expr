/**
 * Generates a self-contained replay.html from the visual screenshots directory.
 * The HTML embeds all frames as base64 so it works from file:// with no server.
 *
 * Usage:
 *   node tests/e2e/replay-gen.mjs               → reads screenshots/visual/
 *   node tests/e2e/replay-gen.mjs <dir>          → reads <dir>/
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function generateReplay(screenshotsDir) {
  const dir  = screenshotsDir ?? path.join(__dirname, 'screenshots', 'visual')
  const out  = path.join(dir, 'replay.html')

  const files = (await readdir(dir))
    .filter(f => f.endsWith('.png'))
    .sort()

  if (files.length === 0) throw new Error(`No PNG files found in ${dir}`)

  const frames = await Promise.all(files.map(async f => {
    const buf  = await readFile(path.join(dir, f))
    const b64  = buf.toString('base64')
    // "06_integral_variable_x.png" → "06 — integral variable x"
    const label = f.replace('.png', '').replace(/_/g, ' ').replace(/^(\d+) /, '$1 — ')
    return { label, src: `data:image/png;base64,${b64}` }
  }))

  const html = buildHtml(frames)
  await writeFile(out, html, 'utf8')
  return out
}

function buildHtml(frames) {
  const framesJson = JSON.stringify(frames.map(f => ({ label: f.label, src: f.src })))

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Visual Test Replay</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1117; color: #e5e7eb; font-family: ui-monospace, 'Cascadia Code', monospace; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

  /* ── Main image ───────────────────────────────────────── */
  #main-wrap { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 12px; }
  #main-img  { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 32px rgba(0,0,0,.6); }

  /* ── Controls ────────────────────────────────────────── */
  #controls { background: #1a1d27; border-top: 1px solid #2d3148; padding: 10px 16px; display: flex; flex-direction: column; gap: 8px; }

  #step-label { text-align: center; font-size: 13px; color: #94a3b8; letter-spacing: .03em; }

  /* progress bar */
  #progress { height: 4px; background: #2d3148; border-radius: 2px; cursor: pointer; position: relative; }
  #progress-fill { height: 100%; background: #3b82f6; border-radius: 2px; transition: width .12s; }
  #progress:hover #progress-fill { background: #60a5fa; }

  /* button row */
  #btn-row { display: flex; gap: 8px; align-items: center; justify-content: center; }
  button { padding: 5px 14px; background: #252836; color: #e5e7eb; border: 1px solid #3d4166; border-radius: 5px; cursor: pointer; font-family: inherit; font-size: 13px; transition: background .1s; }
  button:hover { background: #2f3347; }
  button.primary { background: #3b82f6; border-color: #3b82f6; }
  button.primary:hover { background: #2563eb; }
  button:disabled { opacity: .35; cursor: not-allowed; }

  select { padding: 5px 8px; background: #252836; color: #e5e7eb; border: 1px solid #3d4166; border-radius: 5px; font-family: inherit; font-size: 13px; cursor: pointer; }

  #counter { font-size: 12px; color: #64748b; min-width: 60px; text-align: center; }
  #loop-label { font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 4px; cursor: pointer; }
  #loop-label input { cursor: pointer; }

  /* ── Filmstrip ───────────────────────────────────────── */
  #filmstrip { display: flex; gap: 4px; overflow-x: auto; padding: 6px 8px; background: #0a0c13; border-top: 1px solid #2d3148; scroll-behavior: smooth; }
  #filmstrip::-webkit-scrollbar { height: 4px; }
  #filmstrip::-webkit-scrollbar-thumb { background: #3d4166; border-radius: 2px; }

  .thumb { cursor: pointer; flex-shrink: 0; border-radius: 4px; overflow: hidden; border: 2px solid transparent; transition: border-color .1s, opacity .1s; opacity: .55; }
  .thumb:hover { opacity: .8; }
  .thumb.active { border-color: #3b82f6; opacity: 1; }
  .thumb img { width: 110px; height: 55px; object-fit: cover; display: block; }
  .thumb-lbl { font-size: 9px; color: #64748b; padding: 2px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 110px; text-align: center; background: #0f1117; }
</style>
</head>
<body>

<div id="main-wrap">
  <img id="main-img" src="" alt="screenshot">
</div>

<div id="controls">
  <div id="step-label">—</div>

  <div id="progress"><div id="progress-fill"></div></div>

  <div id="btn-row">
    <button id="btn-prev" title="Previous (←)">◀ Prev</button>
    <button id="btn-play" class="primary" title="Play/Pause (Space)">▶ Play</button>
    <button id="btn-next" title="Next (→)">Next ▶</button>
    <select id="speed" title="Playback speed">
      <option value="3000">0.3× slow</option>
      <option value="1500" selected>0.5× review</option>
      <option value="900">1× normal</option>
      <option value="450">2× fast</option>
      <option value="180">5× skim</option>
    </select>
    <label id="loop-label"><input type="checkbox" id="loop-cb"> loop</label>
    <span id="counter">1 / ${frames.length}</span>
  </div>
</div>

<div id="filmstrip"></div>

<script>
const FRAMES = ${framesJson};

let current  = 0
let playing  = false
let timer    = null

// ── DOM refs ─────────────────────────────────────────────
const mainImg   = document.getElementById('main-img')
const stepLabel = document.getElementById('step-label')
const progFill  = document.getElementById('progress-fill')
const counter   = document.getElementById('counter')
const btnPlay   = document.getElementById('btn-play')
const btnPrev   = document.getElementById('btn-prev')
const btnNext   = document.getElementById('btn-next')
const speedSel  = document.getElementById('speed')
const loopCb    = document.getElementById('loop-cb')
const filmstrip = document.getElementById('filmstrip')
const progress  = document.getElementById('progress')

// ── Build filmstrip ──────────────────────────────────────
FRAMES.forEach((f, i) => {
  const div = document.createElement('div')
  div.className = 'thumb'
  div.dataset.i = i
  div.innerHTML = \`<img src="\${f.src}" loading="lazy" alt=""><div class="thumb-lbl">\${f.label}</div>\`
  div.addEventListener('click', () => { goTo(i); if (!playing) pause() })
  filmstrip.appendChild(div)
})

// ── Rendering ────────────────────────────────────────────
function render(idx) {
  const f = FRAMES[idx]
  mainImg.src   = f.src
  stepLabel.textContent = f.label
  counter.textContent   = \`\${idx + 1} / \${FRAMES.length}\`
  progFill.style.width  = \`\${((idx) / (FRAMES.length - 1)) * 100}%\`

  // filmstrip thumbs
  document.querySelectorAll('.thumb').forEach((el, i) => {
    el.classList.toggle('active', i === idx)
  })
  // scroll active thumb into view
  const thumb = filmstrip.children[idx]
  if (thumb) thumb.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })

  btnPrev.disabled = idx === 0
  btnNext.disabled = idx === FRAMES.length - 1
}

// ── Navigation ───────────────────────────────────────────
function goTo(idx) {
  current = Math.max(0, Math.min(FRAMES.length - 1, idx))
  render(current)
}

function step(dir) {
  const next = current + dir
  if (next < 0 || next >= FRAMES.length) return false
  goTo(next)
  return true
}

// ── Playback ─────────────────────────────────────────────
function tick() {
  const advanced = step(1)
  if (!advanced) {
    if (loopCb.checked) { goTo(0); schedule() }
    else pause()
    return
  }
  schedule()
}

function schedule() { timer = setTimeout(tick, Number(speedSel.value)) }

function play() {
  playing = true
  btnPlay.textContent = '⏸ Pause'
  btnPlay.classList.remove('primary')
  if (current === FRAMES.length - 1 && !loopCb.checked) goTo(0)
  schedule()
}

function pause() {
  playing = false
  clearTimeout(timer)
  btnPlay.textContent = '▶ Play'
  btnPlay.classList.add('primary')
}

function togglePlay() { playing ? pause() : play() }

// ── Events ───────────────────────────────────────────────
btnPlay.addEventListener('click', togglePlay)
btnPrev.addEventListener('click', () => { pause(); step(-1) })
btnNext.addEventListener('click', () => { pause(); step(1)  })

speedSel.addEventListener('change', () => {
  if (playing) { clearTimeout(timer); schedule() }
})

progress.addEventListener('click', e => {
  const pct = e.offsetX / progress.offsetWidth
  goTo(Math.round(pct * (FRAMES.length - 1)))
  pause()
})

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
  if (e.key === ' ')          { e.preventDefault(); togglePlay() }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); pause(); step(-1) }
  if (e.key === 'ArrowRight') { e.preventDefault(); pause(); step(1)  }
  if (e.key === 'Home')       { e.preventDefault(); pause(); goTo(0)  }
  if (e.key === 'End')        { e.preventDefault(); pause(); goTo(FRAMES.length - 1) }
})

// ── Init ─────────────────────────────────────────────────
goTo(0)
</script>
</body>
</html>`
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2]
  generateReplay(dir).then(out => console.log(`\n✅  Replay written to:\n   ${out}\n`))
}
