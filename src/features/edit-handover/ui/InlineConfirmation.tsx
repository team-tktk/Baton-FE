import { useState } from 'react'

import type { HandoverCriterion } from '@/entities/handover'

import styles from './InlineConfirmation.module.css'

interface InlineConfirmationProps {
  criterion: HandoverCriterion
  value?: string
  onConfirm: (criterionId: string, value: string) => void
}

export function InlineConfirmation({ criterion, value, onConfirm }: InlineConfirmationProps) {
  const [open, setOpen] = useState(false)
  const [directAnswer, setDirectAnswer] = useState('')

  const confirm = (answer: string) => {
    const trimmedAnswer = answer.trim()
    if (!trimmedAnswer) return

    onConfirm(criterion.id, trimmedAnswer)
    setDirectAnswer('')
    setOpen(false)
  }

  return (
    <span className={styles.inline}>
      <button
        type="button"
        className={`${styles.marker} ${value ? styles.resolved : ''}`}
        aria-label={`${criterion.title} ${value ? '확인 완료' : '확인 필요'}`}
        onClick={() => setOpen((current) => !current)}
      >
        {value ? '확인 완료' : '확인 필요'}
      </button>

      {open ? (
        <aside className={styles.dialog} role="dialog" aria-label={criterion.title}>
          <header className={styles.header}>
            <div>
              <span>확인 필요한 내용</span>
              <strong>{criterion.title}</strong>
            </div>
            <button type="button" aria-label="닫기" onClick={() => setOpen(false)}>
              ×
            </button>
          </header>
          <p>{criterion.question ?? criterion.defaultText}</p>
          <div className={styles.options} role="radiogroup" aria-label={`${criterion.title} 선택지`}>
            {criterion.options.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={value === option}
                onClick={() => confirm(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className={styles.direct}>
            <label>
              <span>직접 입력</span>
              <input
                aria-label="직접 입력"
                placeholder="직접 답변을 입력하세요"
                value={directAnswer}
                onChange={(event) => setDirectAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') confirm(directAnswer)
                }}
              />
            </label>
            <button
              type="button"
              aria-label="직접 입력 확정"
              disabled={!directAnswer.trim()}
              onClick={() => confirm(directAnswer)}
            >
              확정
            </button>
          </div>
        </aside>
      ) : null}
    </span>
  )
}
