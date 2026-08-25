import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { Handover, HandoverParticipant, InterviewQuestion } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { AnalysisProgress, HandoverProgress, InterviewWizard, FileUploader, MemberPicker, WorkScopeEditor, useCreateHandover } from '@/features/create-handover'
import { useAuth } from '@/features/auth'
import { mergeDocumentChanges } from '@/features/edit-handover'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { useToast } from '@/shared/ui/toast'
import { AppHeader } from '@/widgets/app-header'

import styles from './HandoverCreatePage.module.css'
import { CompletionStep } from './CompletionStep'
import { DocumentStep } from './DocumentStep'

interface HandoverCreatePageProps { step: 'setup' | 'upload' | 'analyzing' | 'interview' | 'document' | 'complete' }

export function HandoverCreatePage({ step }: HandoverCreatePageProps) {
  const navigate = useNavigate()
  const repository = useHandoverRepository()
  const { showToast } = useToast()
  const { dispatch, state } = useCreateHandover()
  const { user } = useAuth()
  const [members, setMembers] = useState<HandoverParticipant[]>([])
  const [recipientQuery, setRecipientQuery] = useState('')
  const [reviewerQuery, setReviewerQuery] = useState('')
  const [pending, setPending] = useState(false)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [draft, setDraft] = useState<Handover | null>(null)
  const params = useParams()

  useEffect(() => {
    if (step !== 'setup') return
    let ignore = false
    repository.listMembers()
      .then((nextMembers) => { if (!ignore) setMembers(nextMembers) })
      .catch(() => { if (!ignore) showToast('구성원 목록을 불러오지 못했어요') })
    return () => { ignore = true }
  }, [repository, showToast, step])

  const draftId = state.draftId
  const refreshFiles = useCallback(async () => {
    if (!draftId) return
    try {
      dispatch({ type: 'attachments/loaded', attachments: await repository.listFiles(draftId) })
    } catch {
      showToast('파일 목록을 불러오지 못했어요')
    }
  }, [dispatch, draftId, repository, showToast])

  useEffect(() => {
    if (step !== 'upload') return
    void refreshFiles()
  }, [refreshFiles, step])

  // 업로드 직후에는 서버가 텍스트를 추출하는 중이라, 완료될 때까지만 목록을 다시 읽는다.
  useEffect(() => {
    if (step !== 'upload' || !state.attachments.some((file) => file.status === 'processing')) return
    const timer = setInterval(() => { void refreshFiles() }, 2000)
    return () => clearInterval(timer)
  }, [refreshFiles, state.attachments, step])

  useEffect(() => {
    if (step !== 'interview') return
    let ignore = false
    repository.getHandover(state.draftId ?? 'handover-moastore-operations').then((handover) => {
      if (!ignore) setQuestions(handover.interviewQuestions)
    })
    return () => { ignore = true }
  }, [repository, state.draftId, step])

  useEffect(() => {
    if (step !== 'document' || !state.draftId) return
    let ignore = false
    repository.getHandover(state.draftId).then((handover) => { if (!ignore) setDraft(handover) })
    return () => { ignore = true }
  }, [repository, state.draftId, step])

  useEffect(() => {
    if (step !== 'setup' && !state.draftId) {
      showToast('먼저 누구에게 어떤 업무를 넘길지 알려주세요')
      navigate('/handovers/new/setup', { replace: true })
    }
  }, [navigate, showToast, state.draftId, step])

  const uploadFiles = async (files: File[]) => {
    if (!draftId) return
    setPending(true)
    try {
      for (const file of files) {
        try {
          dispatch({ type: 'attachment/added', attachment: await repository.uploadFile(draftId, file) })
        } catch {
          showToast(`${file.name} 업로드에 실패했어요`)
        }
      }
      await refreshFiles()
    } finally { setPending(false) }
  }

  const removeFile = async (attachmentId: string) => {
    if (!draftId) return
    try {
      await repository.deleteFile(draftId, attachmentId)
      dispatch({ type: 'attachment/removed', attachmentId })
    } catch {
      showToast('파일을 삭제하지 못했어요. 처리 중인 파일은 잠시 후 지울 수 있어요')
    }
  }

  const analysisComplete = useCallback(() => navigate('/handovers/new/interview/1'), [navigate])

  const createDraft = async () => {
    const workItems = state.workItems.map((item) => item.trim()).filter(Boolean)
    if (state.recipientIds.length === 0 || workItems.length === 0) return showToast('받는 사람과 업무를 한 개 이상 입력해 주세요')
    setPending(true)
    try {
      const draft = await repository.createDraft({ recipientIds: state.recipientIds, reviewerIds: state.reviewerIds, workItems })
      dispatch({ type: 'draft/created', draft: { ...draft, attachments: state.attachments } })
      navigate('/handovers/new/upload')
      showToast(`${draft.owner.name}님의 ${workItems[0]} 업무로 시작했어요`)
    } finally { setPending(false) }
  }

  const visibleDocument = draft ? mergeDocumentChanges(draft, state.documentEdits, state.confirmations) : null

  const submitDocument = async () => {
    if (!visibleDocument || !state.draftId) return
    setPending(true)
    try {
      const updated = await repository.updateDraft(state.draftId, { attachments: state.attachments, document: visibleDocument.document })
      const completed = state.submittedHandover ? updated : await repository.submitHandover(state.draftId)
      setDraft(completed)
      dispatch({ type: 'submission/completed', handover: completed })
      navigate('/handovers/new/complete')
      showToast(state.submittedHandover ? '변경사항을 저장했어요' : `${completed.recipient.name}님에게 인수인계를 전달했어요`)
    } finally { setPending(false) }
  }

  return (
    <>
      {(step === 'setup' || step === 'upload' || step === 'document') ? <button className={styles.homeBack} type="button" onClick={() => navigate('/')}><Icon name="back" /> 홈으로</button> : step !== 'complete' ? <AppHeader /> : null}
      {step !== 'analyzing' && step !== 'complete' && <HandoverProgress compact={step === 'setup' || step === 'upload' || step === 'document'} current={step === 'setup' ? 1 : step === 'upload' ? 2 : step === 'interview' ? 3 : 4} />}
      {step === 'analyzing' && <main className={styles.analysisMain}><AnalysisProgress attachments={state.attachments} onComplete={analysisComplete} /></main>}
      {step === 'interview' && (() => {
        const currentStep = Number(params.step)
        const validStep = Number.isInteger(currentStep) && currentStep >= 1 && currentStep <= questions.length
        if (questions.length && !validStep) { navigate('/handovers/new/interview/1', { replace: true }); return null }
        const question = questions[currentStep - 1]
        return question ? <InterviewWizard key={currentStep} answer={state.interviewAnswers[currentStep] ?? ''} currentStep={currentStep} question={question} total={questions.length} onBack={() => navigate(`/handovers/new/interview/${currentStep - 1}`)} onSkip={() => navigate('/handovers/new/document')} onSubmit={(answer) => { dispatch({ type: 'interview/answered', step: currentStep, answer }); navigate(currentStep === questions.length ? '/handovers/new/document' : `/handovers/new/interview/${currentStep + 1}`) }} /> : null
      })()}
      {step === 'document' && visibleDocument && <DocumentStep handover={visibleDocument} confirmations={state.confirmations} pending={pending} returningFromComplete={Boolean(state.submittedHandover)} onConfirm={(criterionId, value) => dispatch({ type: 'criterion/confirmed', criterionId, value })} onFeedback={showToast} onFieldChange={(field, value) => dispatch({ type: 'document/changed', field, value })} onSubmit={submitDocument} />}
      {step === 'complete' && state.submittedHandover && <CompletionStep handover={state.submittedHandover} onEdit={() => navigate('/handovers/new/document')} onHome={() => navigate('/')} />}
      {(step === 'setup' || step === 'upload') && (
      <main className={step === 'setup' ? styles.setupMain : styles.uploadMain}>
        {step === 'setup' ? (
          <section>
            <header className={styles.heading}><div className={styles.kicker}><Icon name="users" /> 인수인계 하기 · 시작</div><h1>누구에게 어떤 업무를 넘기나요?</h1><p>받는 사람과 대표 업무를 알려주면 AI가 필요한 자료를 더 정확히 찾아요.</p></header>
            <div aria-label="인수인계 기본 정보" className={styles.card} role="region">
              <MemberPicker description="이름이나 팀으로 검색하세요." members={members} query={recipientQuery} selectedIds={state.recipientIds} title="업무를 받는 사람" onQueryChange={setRecipientQuery} onToggle={(recipientId) => dispatch({ type: 'recipient/toggled', recipientId })} />
              <MemberPicker separated description="인수인계 문서를 검토하고 승인할 사람이에요." members={members} query={reviewerQuery} selectedIds={state.reviewerIds} title="검토하는 사람" onQueryChange={setReviewerQuery} onToggle={(reviewerId) => dispatch({ type: 'reviewer/toggled', reviewerId })} />
              <WorkScopeEditor items={state.workItems} onAdd={() => dispatch({ type: 'work/added' })} onChange={(index, value) => dispatch({ type: 'work/changed', index, value })} onRemove={(index) => dispatch({ type: 'work/removed', index })} />
            </div>
            <footer className={styles.actions}><Button variant="ghost" onClick={() => navigate('/')}>이전으로</Button><Button disabled={pending} onClick={createDraft}>업무 자료 올리기 <Icon name="arrow" /></Button></footer>
          </section>
        ) : (
          <section>
            <header className={styles.heading}><div className={styles.kicker}><Icon name="upload" /> 인수인계 하기 · 파일 모으기</div><h1>{user?.name ?? '내'}님의 업무 파일을 올려주세요</h1><p>업무에 사용하던 자료를 올리면 AI가 인수인계 초안을 만들어드려요.</p></header>
            <FileUploader attachments={state.attachments} uploading={pending} onReject={showToast} onRemove={(attachmentId) => void removeFile(attachmentId)} onSelect={(files) => void uploadFiles(files)} />
            <footer className={styles.actions}><Button variant="ghost" onClick={() => navigate('/handovers/new/setup')}>이전으로</Button><Button disabled={state.attachments.length === 0} onClick={() => navigate('/handovers/new/analyzing')}>인수인계 초안 만들기</Button></footer>
          </section>
        )}
      </main>
      )}
    </>
  )
}
