import { GroupId, GROUP_META, ToolGroups } from '../types/toolConfig'

interface Props {
  groups: ToolGroups
  onChange: (groups: ToolGroups) => void
}

export function ToolGroupPicker({ groups, onChange }: Props) {
  function toggle(id: GroupId) {
    onChange({ ...groups, [id]: !groups[id] })
  }

  return (
    <div className="tool-group-picker">
      <span className="tool-group-label">Active tool groups:</span>
      {(Object.keys(GROUP_META) as GroupId[]).map(id => {
        const { label, preview } = GROUP_META[id]
        const active = groups[id]
        return (
          <button
            key={id}
            className={`tool-group-pill ${active ? 'active' : ''}`}
            onClick={() => toggle(id)}
            title={`${active ? 'Hide' : 'Show'} ${label} tools`}
          >
            <span className="pill-label">{label}</span>
            <span className="pill-preview">{preview}</span>
          </button>
        )
      })}
    </div>
  )
}
