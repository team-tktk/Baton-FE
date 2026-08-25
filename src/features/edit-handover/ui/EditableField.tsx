import type { FocusEvent } from 'react'

import styles from './EditableField.module.css'

interface EditableFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  seamless?: boolean
}

export function EditableField({ label, value, onChange, seamless = false }: EditableFieldProps) {
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => onChange(event.currentTarget.textContent?.trim() ?? '')
  return (
    <div
      aria-label={`${label} 편집`}
      className={`${styles.field} ${seamless ? styles.seamless : ''}`}
      contentEditable
      onBlur={handleBlur}
      role="textbox"
      suppressContentEditableWarning
    >
      {value}
    </div>
  )
}
