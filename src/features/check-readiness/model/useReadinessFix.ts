import { useCallback, useEffect, useRef, useState } from 'react'

import type { ReadinessAreaResult, ReadinessFix, ReadinessFixAnswer, ReadinessFixApplied } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { ApiError } from '@/shared/api'

export type FixPhase = 'creating' | 'answering' | 'applying' | 'ready' | 'error'

export interface FixSession {
  area: ReadinessAreaResult
  phase: FixPhase
  fix: ReadinessFix | null
  error: string | null
}

interface UseReadinessFixOptions {
  handoverId: string | null
  /** 사용자가 보고 있는 문서 버전. 적용할 때 그대로 보내 그사이 바뀐 문서를 덮어쓰지 않게 한다. */
  revision: number | null
  onApplied: (result: ReadinessFixApplied) => void
  /** 그사이 문서가 바뀌어 적용이 거절됐을 때. 최신 문서와 평가 상태를 다시 읽는다. */
  onConflict: () => void
}

const messageOf = (caught: unknown, fallback: string) => caught instanceof ApiError ? caught.message : fallback

/**
 * 부족한 영역 하나의 AI 보완 흐름: 보완안 생성 → (추가 질문 답변) → 수정 전/후 확인 → 적용 또는 취소.
 * 생성·답변·적용 모두 동기 AI 호출이라 수십 초 걸린다. 창을 닫은 뒤 도착한 생성·답변 결과는 버린다.
 */
export function useReadinessFix({ handoverId, onApplied, onConflict, revision }: UseReadinessFixOptions) {
  const repository = useHandoverRepository()
  const [session, setSession] = useState<FixSession | null>(null)
  // 창을 열 때마다 바뀌는 번호. 이전 창의 늦은 응답이 새 창을 덮지 않게 한다.
  const sessionId = useRef(0)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const update = useCallback((id: number, next: Partial<FixSession>) => {
    if (!alive.current || id !== sessionId.current) return
    setSession((current) => current ? { ...current, ...next } : current)
  }, [])

  const start = useCallback(async (area: ReadinessAreaResult) => {
    if (!handoverId) return
    const id = ++sessionId.current
    setSession({ area, phase: 'creating', fix: null, error: null })
    try {
      update(id, { phase: 'ready', fix: await repository.createReadinessFix(handoverId, area.area) })
    } catch (caught) {
      update(id, { phase: 'error', error: messageOf(caught, '보완안을 만들지 못했어요. 잠시 후 다시 시도해 주세요') })
    }
  }, [handoverId, repository, update])

  const answer = useCallback(async (answers: ReadinessFixAnswer[]) => {
    const fix = session?.fix
    if (!handoverId || !fix) return
    const id = sessionId.current
    update(id, { phase: 'answering', error: null })
    try {
      update(id, { phase: 'ready', fix: await repository.answerReadinessFix(handoverId, fix.id, answers) })
    } catch (caught) {
      // 답변 화면을 유지해 다시 보낼 수 있게 한다.
      update(id, { phase: 'ready', error: messageOf(caught, '답변을 반영하지 못했어요. 잠시 후 다시 시도해 주세요') })
    }
  }, [handoverId, repository, session?.fix, update])

  const apply = useCallback(async () => {
    const fix = session?.fix
    if (!handoverId || !fix || revision === null) return
    const id = sessionId.current
    update(id, { phase: 'applying', error: null })
    try {
      const result = await repository.applyReadinessFix(handoverId, fix.id, revision)
      // 서버 문서는 이미 바뀌었으므로 창 상태와 상관없이 화면에 반영한다.
      if (!alive.current) return
      onApplied(result)
      if (id === sessionId.current) setSession(null)
    } catch (caught) {
      const conflict = caught instanceof ApiError && caught.serverCode === 'AI_DRAFT_REVISION_CONFLICT'
      update(id, {
        phase: 'error',
        error: conflict
          ? '보완안을 만든 뒤 문서가 바뀌어 적용하지 않았어요. 최신 문서를 다시 불러왔으니 다시 평가한 뒤 새로 보완해 주세요.'
          : messageOf(caught, '문서에 적용하지 못했어요. 잠시 후 다시 시도해 주세요'),
      })
      if (conflict && alive.current) onConflict()
    }
  }, [handoverId, onApplied, onConflict, repository, revision, session?.fix, update])

  /** 창을 닫는다. 아직 열린 보완안은 서버에서도 닫아 둔다(실패해도 문서에는 영향이 없다). */
  const close = useCallback(() => {
    const fix = session?.fix
    sessionId.current += 1
    setSession(null)
    if (handoverId && fix && (fix.status === 'needs-input' || fix.status === 'proposed')) {
      repository.discardReadinessFix(handoverId, fix.id).catch(() => { /* 닫기만 실패한 보완안은 적용되지 않으므로 무시한다 */ })
    }
  }, [handoverId, repository, session?.fix])

  return { session, start, answer, apply, close }
}
