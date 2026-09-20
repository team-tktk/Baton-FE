import { type KeyboardEvent, useState } from 'react'

import type { InterviewQuestion } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'

import styles from './InterviewWizard.module.css'

interface InterviewWizardProps {
  answer: string
  currentStep: number
  pending?: boolean
  question: InterviewQuestion
  total: number
  onBack: () => void
  onSkip: () => void
  onSubmit: (answer: string) => void
}

function splitEvidence(evidence: string) {
  const separator = evidence.indexOf(': ')
  if (separator < 0) return { source: evidence, detail: '' }
  return { source: evidence.slice(0, separator), detail: evidence.slice(separator + 2) }
}

export function InterviewWizard({ answer, currentStep, onBack, onSkip, onSubmit, pending = false, question, total }: InterviewWizardProps) {
  const optionSelected = question.options.some((option) => option.label === answer)
  const [value, setValue] = useState(optionSelected ? answer : '')
  const [direct, setDirect] = useState(optionSelected ? '' : answer)
  const nextAnswer = direct.trim() || value
  const evidence = question.evidence ? splitEvidence(question.evidence) : null
  const submit = () => {
    if (nextAnswer && !pending) onSubmit(nextAnswer)
  }
  const onDirectKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() }
  }

  return (
    <section className={styles.wrapper}>
      <header><h1>인수인계 초안 준비</h1><strong>{currentStep} / {total}</strong></header>
      <article className={styles.card}>
        <span>질문 {currentStep}</span><h2>{question.question}</h2>
        <div className={styles.context}>
          <p className={styles.help}>{question.help}</p>
          {evidence && (
            <aside className={styles.evidence} aria-label="근거 자료" title={question.evidence}>
              <Icon name="file" />
              <strong>{evidence.source}</strong>
            </aside>
          )}
        </div>
        <div aria-label="답변 선택" className={styles.options} role="radiogroup">
          {question.options.map((option) => <button aria-checked={value === option.label} key={option.label} role="radio" type="button" onClick={() => { setValue(option.label); setDirect('') }}><i /><span><strong>{option.label}</strong><small>{option.description}</small></span></button>)}
        </div>
        <label className={styles.direct}><span>직접 답변</span><textarea aria-label="직접 답변" placeholder="선택지에 없다면 실제로 하던 방식을 적어주세요" rows={2} value={direct} onChange={(event) => { setDirect(event.target.value); setValue('') }} onKeyDown={onDirectKeyDown} /></label>
        {!nextAnswer && <p className={styles.answerHint}>답변을 선택하거나 입력하면 다음 단계로 넘어갈 수 있어요.</p>}
        <footer><button className={styles.back} disabled={currentStep === 1} type="button" onClick={onBack}><Icon name="back" /> 이전 질문</button><div><button className={styles.skip} disabled={pending} type="button" onClick={onSkip}>질문 건너뛰기</button><button className={styles.submit} disabled={pending || !nextAnswer} type="button" onClick={submit}>{currentStep === total ? '답변 반영하고 초안 보기' : '다음 질문'} <Icon name="arrow" /></button></div></footer>
      </article>
    </section>
  )
}
