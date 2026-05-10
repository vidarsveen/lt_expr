export type TextNode = {
  type: 'text'
  id: string
  value: string
}

export type IntegralNode = {
  type: 'integral'
  id: string
  lower: ASTNode[]
  upper: ASTNode[]
  integrand: ASTNode[]
  variable: ASTNode[]
}

export type FractionNode = {
  type: 'fraction'
  id: string
  numerator: ASTNode[]
  denominator: ASTNode[]
}

export type PowerNode = {
  type: 'power'
  id: string
  base: ASTNode[]
  exponent: ASTNode[]
}

export type SqrtNode = {
  type: 'sqrt'
  id: string
  radicand: ASTNode[]
}

export type SumNode = {
  type: 'sum'
  id: string
  lower: ASTNode[]
  upper: ASTNode[]
  summand: ASTNode[]
}

export type LimitNode = {
  type: 'limit'
  id: string
  limitVar: ASTNode[]
  approach: ASTNode[]
  body: ASTNode[]
}

export type EvalNode = {
  type: 'eval'
  id: string
  body: ASTNode[]   // expression inside the brackets
  lower: ASTNode[]  // lower evaluation point, e.g. 2
  upper: ASTNode[]  // upper evaluation point, e.g. 3
}

export type SequenceNode = {
  type: 'sequence'
  id: string
  children: ASTNode[]
}

export type ASTNode = TextNode | IntegralNode | FractionNode | PowerNode | SqrtNode | SumNode | LimitNode | EvalNode | SequenceNode

export type SlotKey =
  | 'lower' | 'upper' | 'integrand' | 'variable'  // integral / sum
  | 'numerator' | 'denominator'                     // fraction
  | 'base' | 'exponent'                             // power
  | 'radicand'                                       // sqrt
  | 'summand'                                        // sum body
  | 'limitVar' | 'approach' | 'body'                // limit

export type Cursor = {
  nodeId: string   // ID of the TextNode the cursor is in (works at any nesting depth)
  offset: number
}
