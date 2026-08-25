import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { HandoverParticipant, InterviewQuestion } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { AnalysisProgress, HandoverProgress, InterviewWizard, MockFileUploader, RecipientPicker, WorkScopeEditor, useCreateHandover } from '@/features/create-handover'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { useToast } from '@/shared/ui/toast'
import { AppHeader } from '@/widgets/app-header'

import styles from './HandoverCreatePage.module.css'

interface HandoverCreatePageProps { step: 'setup' | 'upload' | 'analyzing' | 'interview' }

export function HandoverCreatePage({ step }: HandoverCreatePageProps) {
  const navigate = useNavigate()
  const repository = useHandoverRepository()
  const { showToast } = useToast()
  const { dispatch, state } = useCreateHandover()
  const [members, setMembers] = useState<HandoverParticipant[]>([])
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(false)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const params = useParams()

  useEffect(() => {
    if (step !== 'setup') return
    let ignore = false
    Promise.all([repository.listMembers(), repository.getHandover('handover-moastore-operations')]).then(([nextMembers, handover]) => {
      if (ignore) return
      setMembers(nextMembers)
      if (state.attachments.length === 0) dispatch({ type: 'attachments/loaded', attachments: handover.attachments })
    })
    return () => { ignore = true }
  }, [dispatch, repository, state.attachments.length, step])

  useEffect(() => {
    if (step !== 'interview') return
    let ignore = false
    repository.getHandover(state.draftId ?? 'handover-moastore-operations').then((handover) => {
      if (!ignore) setQuestions(handover.interviewQuestions)
    })
    return () => { ignore = true }
  }, [repository, state.draftId, step])

  useEffect(() => {
    if (step !== 'setup' && !state.draftId) {
      showToast('먼저 누구에게 어떤 업무를 넘길지 알려주세요')
      navigate('/handovers/new/setup', { replace: true })
    }
  }, [navigate, showToast, state.draftId, step])

  const analysisComplete = useCallback(() => navigate('/handovers/new/interview/1'), [navigate])

  const createDraft = async () => {
    const workItems = state.workItems.map((item) => item.trim()).filter(Boolean)
    if (state.recipientIds.length === 0 || workItems.length === 0) return showToast('받는 사람과 업무를 한 개 이상 입력해 주세요')
    setPending(true)
    try {
      const draft = await repository.createDraft({ recipientIds: state.recipientIds, workItems })
      dispatch({ type: 'draft/created', draft: { ...draft, attachments: state.attachments } })
      navigate('/handovers/new/upload')
      showToast(`${draft.owner.name}님의 ${workItems[0]} 업무로 시작했어요`)
    } finally { setPending(false) }
  }

  return (
    <>
      <AppHeader />
      {step !== 'analyzing' && <HandoverProgress current={step === 'setup' ? 1 : step === 'upload' ? 2 : 3} />}
      {step === 'analyzing' && <main className={styles.main}><AnalysisProgress fileCount={state.attachments.length} onComplete={analysisComplete} /></main>}
      {step === 'interview' && (() => {
        const currentStep = Number(params.step)
        const validStep = Number.isInteger(currentStep) && currentStep >= 1 && currentStep <= questions.length
        if (questions.length && !validStep) { navigate('/handovers/new/interview/1', { replace: true }); return null }
        const question = questions[currentStep - 1]
        return question ? <InterviewWizard key={currentStep} answer={state.interviewAnswers[currentStep] ?? ''} currentStep={currentStep} question={question} total={questions.length} onBack={() => navigate(`/handovers/new/interview/${currentStep - 1}`)} onSkip={() => navigate('/handovers/new/document')} onSubmit={(answer) => { dispatch({ type: 'interview/answered', step: currentStep, answer }); navigate(currentStep === questions.length ? '/handovers/new/document' : `/handovers/new/interview/${currentStep + 1}`) }} /> : null
      })()}
      {(step === 'setup' || step === 'upload') && (
      <main className={styles.main}>
        {step === 'setup' ? (
          <section>
            <header className={styles.heading}><div className={styles.kicker}><Icon name="users" /> 인수인계 하기 · 시작</div><h1>누구에게 어떤 업무를 넘기나요?</h1><p>받는 사람과 대표 업무를 알려주면 AI가 필요한 자료를 더 정확히 찾아요.</p></header>
            <div className={styles.card}>
              <RecipientPicker members={members} selectedIds={state.recipientIds} query={query} onQueryChange={setQuery} onToggle={(recipientId) => dispatch({ type: 'recipient/toggled', recipientId })} />
              <WorkScopeEditor items={state.workItems} onAdd={() => dispatch({ type: 'work/added' })} onChange={(index, value) => dispatch({ type: 'work/changed', index, value })} onRemove={(index) => dispatch({ type: 'work/removed', index })} />
            </div>
            <footer className={styles.actions}><Button variant="ghost" onClick={() => navigate('/')}>이전으로</Button><Button disabled={pending} onClick={createDraft}>업무 자료 올리기 <Icon name="arrow" /></Button></footer>
          </section>
        ) : (
          <section>
            <header className={styles.heading}><div className={styles.kicker}><Icon name="upload" /> 인수인계 하기 · 파일 모으기</div><h1>최서윤님의 업무 파일을 올려주세요</h1><p>업무에 사용하던 자료를 올리면 AI가 인수인계 초안을 만들어드려요.</p></header>
            <MockFileUploader attachments={state.attachments} onAdd={(attachment) => dispatch({ type: 'attachment/added', attachment })} onReject={showToast} onRemove={(attachmentId) => dispatch({ type: 'attachment/removed', attachmentId })} />
            <footer className={styles.actions}><Button variant="ghost" onClick={() => navigate('/handovers/new/setup')}>이전으로</Button><Button disabled={state.attachments.length === 0} onClick={() => navigate('/handovers/new/analyzing')}>인수인계 초안 만들기 <Icon name="arrow" /></Button></footer>
          </section>
        )}
      </main>
      )}
    </>
  )
}
