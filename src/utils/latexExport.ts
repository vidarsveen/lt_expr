import { ASTNode, SequenceNode } from '../types/ast'

export function toLatex(nodes: ASTNode[]): string {
  return nodes.map(nodeToLatex).join('')
}

function nodeToLatex(node: ASTNode): string {
  switch (node.type) {
    case 'text':
      return node.value
    case 'sequence':
      return toLatex(node.children)
    case 'integral': {
      const lower = toLatex(node.lower)
      const upper = toLatex(node.upper)
      const integrand = toLatex(node.integrand)
      const variable = toLatex(node.variable)
      return `\\int_{${lower}}^{${upper}} ${integrand} \\, d${variable}`
    }
    case 'fraction': {
      const num = toLatex(node.numerator)
      const den = toLatex(node.denominator)
      return `\\frac{${num}}{${den}}`
    }
    case 'power': {
      const base = toLatex(node.base)
      const exp  = toLatex(node.exponent)
      return `${base}^{${exp}}`
    }
    case 'sqrt':
      return `\\sqrt{${toLatex(node.radicand)}}`
    case 'sum': {
      const lower   = toLatex(node.lower)
      const upper   = toLatex(node.upper)
      const summand = toLatex(node.summand)
      return `\\sum_{${lower}}^{${upper}} ${summand}`
    }
    case 'limit': {
      const limitVar = toLatex(node.limitVar)
      const approach = toLatex(node.approach)
      const body     = toLatex(node.body)
      return `\\lim_{${limitVar} \\to ${approach}} ${body}`
    }
    case 'eval': {
      const body  = toLatex(node.body)
      const lower = toLatex(node.lower)
      const upper = toLatex(node.upper)
      return `\\left[${body}\\right]_{${lower}}^{${upper}}`
    }
  }
}

export function rootToLatex(root: SequenceNode): string {
  return toLatex(root.children)
}
