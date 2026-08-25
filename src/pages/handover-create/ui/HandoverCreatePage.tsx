import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { AnalysisJob, Handover, HandoverParticipant, InterviewQuestion } from '@/entities/handover'
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
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null)
  const [draft, setDraft] = useState<Handover | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisJob | null>(null)
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
  // 목록 자체가 아니라 처리 중 여부만 의존해야 갱신할 때마다 주기가 리셋되지 않는다.
  const hasProcessingFile = state.attachments.some((file) => file.status === 'processing')
  useEffect(() => {
    if (step !== 'upload' || !hasProcessingFile) return
    const timer = setInterval(() => { void refreshFiles() }, 2000)
    return () => clearInterval(timer)
  }, [hasProcessingFile, refreshFiles, step])

  useEffect(() => {
    if (step !== 'interview' || !draftId) return
    let ignore = false
    repository.listQuestions(draftId)
      .then((items) => { if (!ignore) setQuestions(items) })
      .catch(() => { if (!ignore) showToast('확인 질문을 불러오지 못했어요') })
    return () => { ignore = true }
  }, [draftId, repository, showToast, step])

  // 질문이 하나도 없으면 답변 단계를 건너뛰고 초안으로 간다. 조용히 넘어가면 오동작처럼 보여 안내를 남긴다.
  useEffect(() => {
    if (step !== 'interview' || questions === null || questions.length > 0) return
    showToast('자료만으로 초안을 만들 수 있어 확인 질문은 건너뛰었어요')
    navigate('/handovers/new/document', { replace: true })
  }, [navigate, questions, showToast, step])

  useEffect(() => {
    if (step !== 'document' || !draftId) return
    let ignore = false
    Promise.all([repository.getHandover(draftId), repository.getDocument(draftId)])
      .then(([handover, document]) => { if (!ignore) setDraft({ ...handover, document }) })
      .catch(() => { if (!ignore) showToast('인수인계 초안을 불러오지 못했어요') })
    return () => { ignore = true }
  }, [draftId, repository, showToast, step])

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

  const failAnalysis = useCallback(() => {
    showToast('분석을 시작하지 못했어요. 파일을 먼저 확인해 주세요')
    navigate('/handovers/new/upload')
  }, [navigate, showToast])

  useEffect(() => {
    if (step !== 'analyzing' || !draftId) return
    let ignore = false
    repository.startAnalysis(draftId)
      .then((job) => { if (!ignore) setAnalysis(job) })
      .catch(() => { if (!ignore) failAnalysis() })
    return () => { ignore = true }
  }, [draftId, failAnalysis, repository, step])

  // 서버 권장 주기는 2~3초다. 완료·실패면 폴링을 멈춘다.
  useEffect(() => {
    if (step !== 'analyzing' || !draftId || analysis?.status !== 'running') return
    let stopped = false
    const timer = setInterval(() => {
      repository.getAnalysis(draftId)
        .then((job) => { if (!stopped) setAnalysis(job) })
        .catch(() => { /* 일시적인 오류는 다음 폴링에서 회복한다 */ })
    }, 2500)
    return () => { stopped = true; clearInterval(timer) }
  }, [analysis?.status, draftId, repository, step])

  // 실패한 분석은 retry 엔드포인트로만 다시 돌릴 수 있다.
  const retryAnalysis = () => {
    if (!draftId) return
    setAnalysis(null)
    repository.retryAnalysis(draftId).then(setAnalysis).catch(failAnalysis)
  }

  useEffect(() => {
    if (step !== 'analyzing' || analysis?.status !== 'completed') return
    navigate('/handovers/new/interview/1')
  }, [analysis?.status, navigate, step])

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

  // 남은 미응답 질문을 건너뛰기로 정리해야 완료 호출이 통과한다(서버가 409로 막는다).
  const completeInterview = async () => {
    if (!draftId) return
    // 로컬 상태가 서버보다 낡아 있으면 미응답 질문을 놓쳐 완료가 409로 막힌다. 서버 기준으로 다시 확인한다.
    const latest = await repository.listQuestions(draftId)
    for (const question of latest) {
      if (question.status === 'pending') await repository.skipQuestion(draftId, question.id)
    }
    await repository.completeQuestions(draftId)
    navigate('/handovers/new/document')
  }

  const answerQuestion = async (questionId: string, currentStep: number, answer: string) => {
    if (!draftId || pending) return
    setPending(true)
    try {
      await repository.answerQuestion(draftId, questionId, answer)
      setQuestions((current) => current?.map((item) => item.id === questionId ? { ...item, status: 'answered', answer } : item) ?? current)
      dispatch({ type: 'interview/answered', step: currentStep, answer })
      if (currentStep === (questions?.length ?? 0)) await completeInterview()
      else navigate(`/handovers/new/interview/${currentStep + 1}`)
    } catch {
      showToast('답변을 저장하지 못했어요. 잠시 후 다시 시도해 주세요')
    } finally { setPending(false) }
  }

  const skipRemainingQuestions = async () => {
    if (!draftId || pending) return
    setPending(true)
    try {
      await completeInterview()
    } catch {
      showToast('건너뛰기를 반영하지 못했어요. 잠시 후 다시 시도해 주세요')
    } finally { setPending(false) }
  }

  const visibleDocument = draft
    ? mergeDocumentChanges({ ...draft, attachments: state.attachments }, state.documentEdits, state.confirmations)
    : null

  const submitDocument = async () => {
    if (!visibleDocument || !state.draftId) return
    setPending(true)
    try {
      await repository.saveDocument(state.draftId, visibleDocument.document)
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
      {step === 'analyzing' && <main className={styles.analysisMain}><AnalysisProgress attachments={state.attachments} job={analysis} onRetry={retryAnalysis} /></main>}
      {step === 'interview' && questions !== null && questions.length > 0 && (() => {
        const currentStep = Number(params.step)
        const validStep = Number.isInteger(currentStep) && currentStep >= 1 && currentStep <= questions.length
        if (!validStep) { navigate('/handovers/new/interview/1', { replace: true }); return null }
        const question = questions[currentStep - 1]
        return <InterviewWizard
          key={currentStep}
          answer={state.interviewAnswers[currentStep] ?? question.answer ?? ''}
          currentStep={currentStep}
          pending={pending}
          question={question}
          total={questions.length}
          onBack={() => navigate(`/handovers/new/interview/${currentStep - 1}`)}
          onSkip={() => { void skipRemainingQuestions() }}
          onSubmit={(answer) => { void answerQuestion(question.id, currentStep, answer) }}
        />
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
