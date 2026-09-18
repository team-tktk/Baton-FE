import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { AnalysisJob, Handover, HandoverAttachment, HandoverDraft, HandoverParticipant, InterviewQuestion } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { AnalysisProgress, DraftFinalizing, FileUploader, HandoverProgress, InterviewWizard, MemberPicker, WorkScopeEditor, useCreateHandover } from '@/features/create-handover'
import { useAuth } from '@/features/auth'
import { ApiError } from '@/shared/api'
import { mergeDocumentChanges } from '@/features/edit-handover'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { useToast } from '@/shared/ui/toast'
import { AppHeader } from '@/widgets/app-header'

import styles from './HandoverCreatePage.module.css'
import { CompletionStep } from './CompletionStep'
import { DocumentStep } from './DocumentStep'
import { MaskingStep } from './MaskingStep'

/** 폴링이 연속으로 이만큼 실패하면 서버 장애로 보고 실패 화면으로 전환한다(약 12초). */
const ANALYSIS_POLL_FAILURE_LIMIT = 5

type CreateStep = 'setup' | 'upload' | 'masking' | 'analyzing' | 'interview' | 'document' | 'complete'
interface HandoverCreatePageProps { step: CreateStep }

/** 스테퍼에 보여 줄 단계 번호. 완료 화면은 스테퍼를 숨긴다. */
const STEP_NUMBER: Record<Exclude<CreateStep, 'complete'>, number> = {
  setup: 1,
  upload: 2,
  masking: 3,
  analyzing: 4,
  interview: 5,
  document: 6,
}

/** 홈으로 버튼을 띄우는 단계. 나머지는 앱 헤더를 쓴다. */
const HOME_BUTTON_STEPS: CreateStep[] = ['setup', 'upload', 'masking', 'document']

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
  /** 서버 문서 버전. 저장할 때 돌려보내 그사이 바뀐 문서를 덮어쓰지 않게 한다. */
  const [revision, setRevision] = useState<number | null>(null)
  const savingRef = useRef<Promise<boolean> | null>(null)
  /** 저장 중에는 제출을 막는다. 제출이 저장 전 화면 내용으로 나가지 않게 하기 위해서다. */
  const [saving, setSaving] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisJob | null>(null)
  const [finalizing, setFinalizing] = useState(false)
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

  // 검수 단계에서도 최신 파일 상태가 필요하다. 업로드 직후 바로 넘어오면 아직 읽는 중일 수 있다.
  const tracksFiles = step === 'upload' || step === 'masking'
  useEffect(() => {
    if (!tracksFiles) return
    void refreshFiles()
  }, [refreshFiles, tracksFiles])

  // 업로드 직후에는 서버가 텍스트를 추출하는 중이라, 완료될 때까지만 목록을 다시 읽는다.
  // 목록 자체가 아니라 처리 중 여부만 의존해야 갱신할 때마다 주기가 리셋되지 않는다.
  const hasProcessingFile = state.attachments.some((file) => file.status === 'processing')
  useEffect(() => {
    if (!tracksFiles || !hasProcessingFile) return
    const timer = setInterval(() => { void refreshFiles() }, 2000)
    return () => clearInterval(timer)
  }, [hasProcessingFile, refreshFiles, tracksFiles])

  const replaceAttachments = useCallback((attachments: HandoverAttachment[]) => {
    dispatch({ type: 'attachments/loaded', attachments })
  }, [dispatch])

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
      .then(([handover, loaded]) => {
        if (ignore) return
        setDraft({ ...handover, document: loaded.document })
        setRevision(loaded.revision)
      })
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

  // 서버가 사유를 주면 그대로 보여 준다. 파일이 없을 때와 서버 장애를 구분해야 한다.
  // 검수를 확정하지 않은 파일이 남아 있으면 업로드가 아니라 검수 단계로 돌려보낸다.
  const failAnalysis = useCallback((reason: unknown) => {
    showToast(reason instanceof ApiError ? reason.message : '분석을 시작하지 못했어요. 잠시 후 다시 시도해 주세요')
    const maskingPending = reason instanceof ApiError && reason.serverCode === 'MASKING_NOT_CONFIRMED'
    navigate(maskingPending ? '/handovers/new/masking' : '/handovers/new/upload')
  }, [navigate, showToast])

  useEffect(() => {
    if (step !== 'analyzing' || !draftId) return
    let ignore = false
    repository.startAnalysis(draftId)
      .then((job) => { if (!ignore) setAnalysis(job) })
      .catch((reason: unknown) => { if (!ignore) failAnalysis(reason) })
    return () => { ignore = true }
  }, [draftId, failAnalysis, repository, step])

  // 서버 권장 주기는 2~3초다. 완료·실패면 폴링을 멈춘다.
  useEffect(() => {
    if (step !== 'analyzing' || !draftId || analysis?.status !== 'running') return
    let stopped = false
    let failures = 0
    const timer = setInterval(() => {
      repository.getAnalysis(draftId)
        .then((job) => { if (!stopped) { failures = 0; setAnalysis(job) } })
        .catch(() => {
          if (stopped) return
          failures += 1
          // 한두 번은 일시적일 수 있지만 계속 실패하면 무한 로딩에 갇힌다. 실패로 전환해 빠져나갈 길을 준다.
          if (failures < ANALYSIS_POLL_FAILURE_LIMIT) return
          setAnalysis((current) => current
            ? { ...current, status: 'failed', error: '분석 상태를 확인하지 못했어요. 서버가 응답하지 않습니다.' }
            : current)
        })
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
    setFinalizing(true)
    // 로컬 상태가 서버보다 낡아 있으면 미응답 질문을 놓쳐 완료가 409로 막힌다. 서버 기준으로 다시 확인한다.
    const latest = await repository.listQuestions(draftId)
    for (const question of latest) {
      if (question.status === 'pending') await repository.skipQuestion(draftId, question.id)
    }
    await repository.completeQuestions(draftId)
    navigate('/handovers/new/document')
  }

  const answeredCount = questions?.filter((item) => item.status === 'answered').length ?? 0

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
      setFinalizing(false)
      showToast('답변을 저장하지 못했어요. 잠시 후 다시 시도해 주세요')
    } finally { setPending(false) }
  }

  // 이 문항만 건너뛰고 다음으로 넘어간다. 마지막이면 남은 미응답을 정리하고 완료한다.
  const skipQuestion = async (questionId: string, currentStep: number) => {
    if (!draftId || pending) return
    setPending(true)
    try {
      await repository.skipQuestion(draftId, questionId)
      setQuestions((current) => current?.map((item) => item.id === questionId ? { ...item, status: 'skipped', answer: null } : item) ?? current)
      if (currentStep === (questions?.length ?? 0)) await completeInterview()
      else navigate(`/handovers/new/interview/${currentStep + 1}`)
    } catch {
      setFinalizing(false)
      showToast('건너뛰기를 반영하지 못했어요. 잠시 후 다시 시도해 주세요')
    } finally { setPending(false) }
  }

  const visibleDocument = draft
    ? mergeDocumentChanges({ ...draft, attachments: state.attachments }, state.documentEdits)
    : null

  // 순번 기반 수정 기록을 반영한 결과가 서버 문서와 다를 때만 저장할 것이 있다.
  const dirty = Boolean(draft && visibleDocument) && JSON.stringify(visibleDocument?.document) !== JSON.stringify(draft?.document)

  /** 보완 적용처럼 서버가 준 최신 문서로 바꾼다. 순번 기반 수정 기록은 새 문서에 맞지 않으므로 비운다. */
  const replaceDraft = (next: HandoverDraft) => {
    setDraft((current) => current ? { ...current, document: next.document } : current)
    setRevision(next.revision)
    dispatch({ type: 'document/reset' })
  }

  const reloadDocument = async () => {
    if (!draftId) return
    try {
      const latest = await repository.getDocument(draftId)
      setDraft((current) => current ? { ...current, document: latest.document } : current)
      setRevision(latest.revision)
      dispatch({ type: 'document/reset' })
    } catch {
      showToast('최신 문서를 불러오지 못했어요. 새로고침해 주세요')
    }
  }

  /**
   * 화면에서 고친 내용을 서버에 저장하고 수정 기록을 비운다. 준비도는 서버 문서를 채점하므로 평가 전에 부른다.
   * 그사이 다른 곳에서 문서가 바뀌었으면 덮어쓰지 않고 최신 문서를 다시 불러온다.
   */
  const saveDraft = (): Promise<boolean> => {
    // 저장이 진행 중이면 같은 결과를 기다린다. 같은 revision으로 두 번 보내면 뒤의 것이 충돌로 거절된다.
    if (savingRef.current) return savingRef.current
    if (!draftId || !draft || !visibleDocument) return Promise.resolve(false)
    if (!dirty) return Promise.resolve(true)
    const savedDocument = visibleDocument.document
    const savedEdits = state.documentEdits
    const request = (async () => {
      try {
        const saved = await repository.saveDocument(draftId, savedDocument, revision ?? undefined)
        setDraft((current) => current ? { ...current, document: savedDocument } : current)
        setRevision(saved)
        // 저장하는 사이 새로 고친 칸은 남긴다. 저장한 문서 위에 그대로 다시 얹힌다.
        dispatch({ type: 'document/saved', edits: savedEdits })
        return true
      } catch (caught) {
        if (caught instanceof ApiError && caught.serverCode === 'AI_DRAFT_REVISION_CONFLICT') {
          showToast('다른 곳에서 문서가 바뀌어 최신 문서를 다시 불러왔어요. 방금 고친 내용은 다시 입력해 주세요')
          await reloadDocument()
        } else {
          showToast(caught instanceof ApiError ? caught.message : '문서를 저장하지 못했어요. 잠시 후 다시 시도해 주세요')
        }
        return false
      } finally {
        savingRef.current = null
        setSaving(false)
      }
    })()
    savingRef.current = request
    setSaving(true)
    return request
  }

  const submitDocument = async () => {
    if (!visibleDocument || !state.draftId) return
    setPending(true)
    try {
      if (!(await saveDraft())) return
      const completed = await repository.submitHandover(state.draftId)
      setDraft(completed)
      dispatch({ type: 'submission/completed', handover: completed })
      navigate('/handovers/new/complete')
      showToast(state.submittedHandover
        ? '변경사항을 저장했어요'
        : `${completed.recipients.map((person) => person.name).join(', ')}님에게 인수인계를 전달했어요`)
    } catch {
      showToast('인수인계를 전달하지 못했어요. 잠시 후 다시 시도해 주세요')
    } finally { setPending(false) }
  }

  return (
    <>
      {HOME_BUTTON_STEPS.includes(step) ? <button className={styles.homeBack} type="button" onClick={() => navigate('/')}><Icon name="back" /> 홈으로</button> : step !== 'complete' ? <AppHeader /> : null}
      {step !== 'complete' && <HandoverProgress besideHomeButton={HOME_BUTTON_STEPS.includes(step)} current={STEP_NUMBER[step]} />}
      {step === 'masking' && <MaskingStep attachments={state.attachments} handoverId={draftId} onAttachmentsChange={replaceAttachments} onBack={() => navigate('/handovers/new/upload')} onFeedback={showToast} onProceed={() => navigate('/handovers/new/analyzing')} />}
      {step === 'analyzing' && <main className={styles.analysisMain}><AnalysisProgress attachments={state.attachments} job={analysis} onRetry={retryAnalysis} /></main>}
      {step === 'interview' && finalizing && <main className={styles.analysisMain}><DraftFinalizing answered={answeredCount} /></main>}
      {step === 'interview' && !finalizing && questions !== null && questions.length > 0 && (() => {
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
          onSkip={() => { void skipQuestion(question.id, currentStep) }}
          onSubmit={(answer) => { void answerQuestion(question.id, currentStep, answer) }}
        />
      })()}
      {step === 'document' && visibleDocument && <DocumentStep dirty={dirty} handover={visibleDocument} handoverId={draftId} pending={pending || saving} revision={revision} saveDraft={saveDraft} onDraftReplaced={replaceDraft} onReloadDocument={reloadDocument} returningFromComplete={Boolean(state.submittedHandover)} onFeedback={showToast} onFieldChange={(field, value) => dispatch({ type: 'document/changed', field, value })} onSubmit={submitDocument} />}
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
            <footer className={styles.actions}><Button variant="ghost" onClick={() => navigate('/handovers/new/setup')}>이전으로</Button><Button disabled={state.attachments.length === 0 || hasProcessingFile} onClick={() => navigate('/handovers/new/masking')}>{hasProcessingFile ? '파일을 읽는 중…' : '민감정보 확인하기'} <Icon name="arrow" /></Button></footer>
          </section>
        )}
      </main>
      )}
    </>
  )
}
