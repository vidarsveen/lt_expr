export type ToolGroups = {
  calculus: boolean   // ∫ integral, lim limit
  algebra:  boolean   // ½ fraction, √ sqrt, xⁿ power
  series:   boolean   // ∑ sum
  greek:    boolean   // α β γ … palette tab
  symbols:  boolean   // ∞ ± ≤ … palette tab
}

export const ALL_GROUPS: ToolGroups = {
  calculus: true,
  algebra:  true,
  series:   true,
  greek:    true,
  symbols:  true,
}

export const NO_GROUPS: ToolGroups = {
  calculus: false,
  algebra:  false,
  series:   false,
  greek:    false,
  symbols:  false,
}

export type GroupId = keyof ToolGroups

export const GROUP_META: Record<GroupId, { label: string; preview: string }> = {
  calculus: { label: 'Calculus',  preview: '∫  lim' },
  algebra:  { label: 'Algebra',   preview: '½  √  xⁿ' },
  series:   { label: 'Series',    preview: '∑' },
  greek:    { label: 'Greek',     preview: 'α β π θ' },
  symbols:  { label: 'Symbols',   preview: '∞ ± ≤ →' },
}
