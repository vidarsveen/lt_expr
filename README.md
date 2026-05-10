# LaTeX Math Editor

A structured math editor for university students, built for exam practice.
KaTeX-rendered expressions with a structured AST — students type math the way it looks, not raw LaTeX.

**Live site:** https://vidarsveen.github.io/lt_expr/

## Features

- Free editor with math blocks (integral, limit, fraction, power, sum, eval bracket)
- TMA4100 — 2024 Exam: question list with collapsible solutions and "Try in editor" student mode
- Student exam view: fixed question at top, editor below, toolbar scoped to question's tool groups
- Keyboard shortcuts hidden behind a `?` help menu (author mode exposes tool group picker)
- Demo session recording: `public/demo.webm`

## Tech

- React + TypeScript + Vite
- KaTeX for rendering (`displayMode: true`, `\htmlClass` for cursor injection)
- Playwright for session recording (`tests/e2e/`)

## Dev

```bash
npm install
npm run dev          # http://localhost:5173
npm run student      # record single-question session (tests/e2e/student-session.mjs)
npm run student:multi  # record multi-block Q2 solution (tests/e2e/student-multi.mjs)
```

## Deploy

Automatic on push to `main` via `.github/workflows/deploy.yml` → GitHub Pages.
