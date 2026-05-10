import { useCallback, useEffect, useReducer, useRef } from 'react'
import { Cursor, SequenceNode } from '../types/ast'
import {
  makeSequence,
  makeText,
  insertChar,
  insertText,
  deleteChar,
  insertIntegral,
  insertFraction,
  insertLimit,
  insertEval,
  insertPower,
  insertSqrt,
  insertSum,
  tabForward,
  tabBackward,
  arrowLeft,
  arrowRight,
} from '../utils/astHelpers'

// ─── State types ──────────────────────────────────────────────────────────────

type Snapshot = { root: SequenceNode; cursor: Cursor }

type EditorState = Snapshot & {
  past:   Snapshot[]   // undo stack (oldest first)
  future: Snapshot[]   // redo stack (most-recent first)
}

type Action =
  | { type: 'INSERT_CHAR'; char: string }
  | { type: 'INSERT_TEXT'; text: string }
  | { type: 'DELETE_CHAR' }
  | { type: 'INSERT_INTEGRAL' }
  | { type: 'INSERT_FRACTION' }
  | { type: 'INSERT_POWER' }
  | { type: 'INSERT_SQRT' }
  | { type: 'INSERT_SUM' }
  | { type: 'INSERT_LIMIT' }
  | { type: 'INSERT_EVAL' }
  | { type: 'TAB'; shift: boolean }
  | { type: 'ARROW_LEFT' }
  | { type: 'ARROW_RIGHT' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_CURSOR'; cursor: Cursor }

// ─── Which actions modify the tree (and therefore create undo entries) ────────

const MUTATIONS = new Set<Action['type']>([
  'INSERT_CHAR', 'INSERT_TEXT', 'DELETE_CHAR',
  'INSERT_INTEGRAL', 'INSERT_FRACTION', 'INSERT_POWER', 'INSERT_SQRT', 'INSERT_SUM', 'INSERT_LIMIT', 'INSERT_EVAL',
])

// ─── Pure snapshot computation (no history side-effects) ─────────────────────

function applyAction(snap: Snapshot, action: Action): Snapshot {
  switch (action.type) {
    case 'INSERT_CHAR':      return insertChar(snap.root, snap.cursor, action.char)
    case 'INSERT_TEXT':      return insertText(snap.root, snap.cursor, action.text)
    case 'DELETE_CHAR':      return deleteChar(snap.root, snap.cursor)
    case 'INSERT_INTEGRAL':  return insertIntegral(snap.root, snap.cursor)
    case 'INSERT_FRACTION':  return insertFraction(snap.root, snap.cursor)
    case 'INSERT_POWER':     return insertPower(snap.root, snap.cursor)
    case 'INSERT_SQRT':      return insertSqrt(snap.root, snap.cursor)
    case 'INSERT_SUM':       return insertSum(snap.root, snap.cursor)
    case 'INSERT_LIMIT':     return insertLimit(snap.root, snap.cursor)
    case 'INSERT_EVAL':      return insertEval(snap.root, snap.cursor)
    case 'TAB':              return action.shift
                               ? tabBackward(snap.root, snap.cursor)
                               : tabForward(snap.root, snap.cursor)
    case 'ARROW_LEFT':       return arrowLeft(snap.root, snap.cursor)
    case 'ARROW_RIGHT':      return arrowRight(snap.root, snap.cursor)
    case 'SET_CURSOR':       return { root: snap.root, cursor: action.cursor }
    default:                 return snap
  }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function createInitialState(): EditorState {
  const text = makeText()
  const root = makeSequence([text])
  return { root, cursor: { nodeId: text.id, offset: 0 }, past: [], future: [] }
}

function reducer(state: EditorState, action: Action): EditorState {
  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state
    const prev = state.past[state.past.length - 1]
    return {
      ...prev,
      past:   state.past.slice(0, -1),
      future: [{ root: state.root, cursor: state.cursor }, ...state.future],
    }
  }

  if (action.type === 'REDO') {
    if (state.future.length === 0) return state
    const next = state.future[0]
    return {
      ...next,
      past:   [...state.past, { root: state.root, cursor: state.cursor }],
      future: state.future.slice(1),
    }
  }

  const next = applyAction(state, action)
  if (next.root === state.root && next.cursor === state.cursor) return state

  if (MUTATIONS.has(action.type)) {
    return {
      ...next,
      past:   [...state.past.slice(-99), { root: state.root, cursor: state.cursor }],
      future: [],
    }
  }

  // Cursor-only moves: update position, preserve history
  return { ...next, past: state.past, future: state.future }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEditor() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Mobile keyboards (Android) fire keydown with key='Unidentified' for printable
  // characters. We use a sentinel zero-width-space so that:
  //   - typing a char  → value becomes '​<char>'  → we extract and dispatch INSERT_CHAR
  //   - backspace       → value becomes ''              → we dispatch DELETE_CHAR
  // Desktop keyboards call e.preventDefault() in onKeyDown, which suppresses the
  // input event, so only one path fires per keystroke.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.value = '​'

    const onInput = () => {
      const val = el.value
      if (val.length > 1) {
        const newChars = val.replace('​', '')
        for (const ch of newChars) {
          dispatch({ type: 'INSERT_CHAR', char: ch })
        }
      } else if (val === '') {
        dispatch({ type: 'DELETE_CHAR' })
      }
      el.value = '​'
    }

    el.addEventListener('input', onInput)
    return () => el.removeEventListener('input', onInput)
  }, [dispatch])

  const focusEditor = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    if (el.value !== '​') el.value = '​'
    el.focus()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ── Undo / Redo ──────────────────────────────────────────────────────────
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault(); dispatch({ type: 'UNDO' }); return
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault(); dispatch({ type: 'REDO' }); return
    }

    // ── Insert math nodes ────────────────────────────────────────────────────
    if (e.altKey && e.key === 'i') {
      e.preventDefault(); dispatch({ type: 'INSERT_INTEGRAL' }); return
    }
    if (e.altKey && e.key === 'f') {
      e.preventDefault(); dispatch({ type: 'INSERT_FRACTION' }); return
    }
    if (e.altKey && e.key === 'r') {
      e.preventDefault(); dispatch({ type: 'INSERT_SQRT' }); return
    }
    if (e.altKey && e.key === 's') {
      e.preventDefault(); dispatch({ type: 'INSERT_SUM' }); return
    }
    if (e.altKey && e.key === 'l') {
      e.preventDefault(); dispatch({ type: 'INSERT_LIMIT' }); return
    }
    if (e.altKey && e.key === 'e') {
      e.preventDefault(); dispatch({ type: 'INSERT_EVAL' }); return
    }
    if (e.key === '^' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); dispatch({ type: 'INSERT_POWER' }); return
    }

    // ── Navigation ───────────────────────────────────────────────────────────
    if (e.key === 'Tab') {
      e.preventDefault(); dispatch({ type: 'TAB', shift: e.shiftKey })
      textareaRef.current?.focus(); return
    }
    if (e.key === 'ArrowLeft'  && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); dispatch({ type: 'ARROW_LEFT' })
      textareaRef.current?.focus(); return
    }
    if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); dispatch({ type: 'ARROW_RIGHT' })
      textareaRef.current?.focus(); return
    }

    // ── Edit ─────────────────────────────────────────────────────────────────
    if (e.key === 'Backspace') {
      e.preventDefault(); dispatch({ type: 'DELETE_CHAR' }); return
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); dispatch({ type: 'INSERT_CHAR', char: e.key }); return
    }
  }, [])

  const setCursor = useCallback((cursor: Cursor) => {
    dispatch({ type: 'SET_CURSOR', cursor })
    const el = textareaRef.current
    if (!el) return
    if (el.value !== '​') el.value = '​'
    el.focus()
  }, [])

  const insertIntegralCmd = useCallback(() => {
    dispatch({ type: 'INSERT_INTEGRAL' })
    textareaRef.current?.focus()
  }, [])

  const insertFractionCmd = useCallback(() => {
    dispatch({ type: 'INSERT_FRACTION' })
    textareaRef.current?.focus()
  }, [])

  const insertSqrtCmd = useCallback(() => {
    dispatch({ type: 'INSERT_SQRT' })
    textareaRef.current?.focus()
  }, [])

  const insertSumCmd = useCallback(() => {
    dispatch({ type: 'INSERT_SUM' })
    textareaRef.current?.focus()
  }, [])

  const insertPowerCmd = useCallback(() => {
    dispatch({ type: 'INSERT_POWER' })
    textareaRef.current?.focus()
  }, [])

  const insertLimitCmd = useCallback(() => {
    dispatch({ type: 'INSERT_LIMIT' })
    textareaRef.current?.focus()
  }, [])

  const insertEvalCmd = useCallback(() => {
    dispatch({ type: 'INSERT_EVAL' })
    textareaRef.current?.focus()
  }, [])

  const insertTextCmd = useCallback((text: string) => {
    dispatch({ type: 'INSERT_TEXT', text })
    textareaRef.current?.focus()
  }, [])

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' })
    textareaRef.current?.focus()
  }, [])

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' })
    textareaRef.current?.focus()
  }, [])

  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0

  return {
    state,
    textareaRef,
    focusEditor,
    handleKeyDown,
    setCursor,
    insertIntegralCmd,
    insertFractionCmd,
    insertSqrtCmd,
    insertSumCmd,
    insertPowerCmd,
    insertLimitCmd,
    insertEvalCmd,
    insertTextCmd,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
