import pantoneColors from 'pantone-colors'
import { Select } from '@mantine/core'

const PANTONE_OPTIONS = Object.entries(pantoneColors)
  .reduce<{ value: string; label: string }[]>((acc, [id, value]) => {
    const hex = String(value)
    if (!acc.some((opt) => opt.value === hex)) {
      acc.push({ value: hex, label: `Pantone ${id}` })
    }
    return acc
  }, [])

type Props = {
  label?: string
  onChange: (color: string) => void
}

export function PantoneSelect({ label, onChange }: Props) {
  return (
    <Select
      label={label}
      placeholder="Pantone…"
      data={PANTONE_OPTIONS}
      searchable
      clearable
      renderOption={({ option }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              borderRadius: 2,
              background: option.value,
              border: '1px solid rgba(0,0,0,0.15)',
              flexShrink: 0,
            }}
          />
          {option.label}
        </div>
      )}
      onChange={(val) => {
        if (val) onChange(val)
      }}
    />
  )
}
