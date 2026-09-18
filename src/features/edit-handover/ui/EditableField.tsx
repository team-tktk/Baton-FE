import type { FocusEvent } from 'react'

import styles from './EditableField.module.css'

interface EditableFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  seamless?: boolean
  /** 준비도 점검에서 짚은 문장이 들어 있어 눈에 띄게 표시한다. 모양은 감싸는 쪽이 정한다. */
  highlighted?: boolean
}

export function EditableField({ label, value, onChange, seamless = false, highlighted = false }: EditableFieldProps) {
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => onChange(event.currentTarget.textContent?.trim() ?? '')
  return (
    <div
      aria-label={`${label} 편집`}
      className={`${styles.field} ${seamless ? styles.seamless : ''}`}
      contentEditable
      data-highlighted={highlighted || undefined}
      onBlur={handleBlur}
      role="textbox"
      suppressContentEditableWarning
    >
      {value}
    </div>
  )
}
