let _id = 0
function newDocId() { return `d${++_id}` }

export type TextBlock = { type: 'text'; id: string; content: string }
export type MathBlock = { type: 'math'; id: string }
export type DocumentBlock = TextBlock | MathBlock

export function makeTextBlock(content = ''): TextBlock {
  return { type: 'text', id: newDocId(), content }
}

export function makeMathBlock(): MathBlock {
  return { type: 'math', id: newDocId() }
}
