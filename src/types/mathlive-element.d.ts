// Registers <math-field> as a valid JSX element for React 18 + react-jsx transform
import 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'math-virtual-keyboard-policy'?: 'auto' | 'manual' | 'sandboxed'
          'default-mode'?: 'math' | 'text' | 'latex'
          placeholder?: string
          value?: string
        },
        HTMLElement
      >
    }
  }
}
