import type { TeaPath } from '../content/types'

interface TeaPathSwitchProps {
  value: TeaPath
  onChange: (path: TeaPath) => void
}
const options: Array<{
  value: TeaPath
  name: string
  chinese: string
  note: string
}> = [
  {
    value: 'sheng',
    name: 'Шэн',
    chinese: '生',
    note: 'сырой · меняется медленно',
  },
  {
    value: 'shou',
    name: 'Шу',
    chinese: '熟',
    note: 'зрелый · влажное кучевание',
  },
]

export function TeaPathSwitch({ value, onChange }: TeaPathSwitchProps) {
  return (
    <div className="tea-switch" role="group" aria-label="Выберите путь пуэра">
      {options.map((option) => (
        <button
          className="tea-switch__option"
          type="button"
          key={option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          <span className="tea-switch__han" aria-hidden="true">
            {option.chinese}
          </span>
          <span>
            <strong>{option.name}</strong>
            <small>{option.note}</small>
          </span>
        </button>
      ))}
    </div>
  )
}
