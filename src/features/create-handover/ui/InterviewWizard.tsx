import { type KeyboardEvent, useState } from 'react'

import type { InterviewQuestion } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'

import styles from './InterviewWizard.module.css'

interface InterviewWizardProps {
  answer: string
  currentStep: number
  question: InterviewQuestion
  total: number
  onBack: () => void
  onSkip: () => void
  onSubmit: (answer: string) => void
}

export function InterviewWizard({ answer, currentStep, onBack, onSkip, onSubmit, question, total }: InterviewWizardProps) {
  const optionSelected = question.options.some((option) => option.label === answer)
  const [value, setValue] = useState(optionSelected ? answer : '')
  const [direct, setDirect] = useState(optionSelected ? '' : answer)
  const submit = () => {
    const nextAnswer = direct.trim() || value
    if (nextAnswer) onSubmit(nextAnswer)
  }
  const onDirectKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() }
  }

  return (
    <section className={styles.wrapper}>
      <header><h1>인수인계 초안 준비</h1><strong>{currentStep} / {total}</strong></header>
      <article className={styles.card}>
        <span>질문 {currentStep}</span><h2>{question.question}</h2><p>{question.help}</p>
        <div aria-label="답변 선택" className={styles.options} role="radiogroup">
          {question.options.map((option) => <button aria-checked={value === option.label} key={option.label} role="radio" type="button" onClick={() => { setValue(option.label); setDirect('') }}><i /><span><strong>{option.label}</strong><small>{option.description}</small></span></button>)}
        </div>
        <label className={styles.direct}>직접 답변<textarea aria-label="직접 답변" placeholder="선택지에 없다면 실제로 하던 방식을 적어주세요" rows={2} value={direct} onChange={(event) => { setDirect(event.target.value); setValue('') }} onKeyDown={onDirectKeyDown} /></label>
        <footer><button disabled={currentStep === 1} type="button" onClick={onBack}><Icon name="back" /> 이전 질문</button><div><button type="button" onClick={onSkip}>질문 건너뛰기</button><button className={styles.submit} type="button" onClick={submit}>{currentStep === total ? '답변 반영하고 초안 보기' : '다음 질문'} <Icon name="arrow" /></button></div></footer>
      </article>
    </section>
  )
}
