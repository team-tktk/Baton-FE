import { useCallback, useEffect, useRef, useState } from 'react'

import type { ReadinessAreaResult, ReadinessFix, ReadinessFixAnswer, ReadinessFixApplied } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { ApiError } from '@/shared/api'

/**
 * starting: 질문을 모으는 중(AI 없음) · generating: 수정안을 만드는 중(AI 1회) · applying: 문서에 적용하는 중
 * ready: 사용자가 답하거나 결과를 볼 차례 · error: 보완안 없이 실패
 */
export type FixPhase = 'starting' | 'generating' | 'applying' | 'ready' | 'error'

export interface FixSession {
  /** 보완하기로 고른 영역(요청 순서) */
  areas: ReadinessAreaResult[]
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

/** 수정안을 한 번이라도 만들었는지. 만들기 전에는 질문 화면, 만든 뒤에는 결과 화면을 보여 준다. */
export const hasGenerated = (fix: ReadinessFix) => fix.areas.some((area) => area.proposed) || fix.sections.some((change) => change.after !== null)

const isOpen = (fix: ReadinessFix) => fix.status === 'needs-input' || fix.status === 'proposed'

/**
 * 여러 영역을 한 번에 보완한다: 보완 시작(질문 모으기) → 답변 저장 → 수정안 만들기(AI 1회) → 적용.
 * 물을 질문이 하나도 없으면 바로 수정안을 만든다. 창을 닫은 뒤 도착한 응답은 버린다.
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

  const runGenerate = useCallback(async (id: number, fixId: string, answers: ReadinessFixAnswer[]) => {
    if (!handoverId) return
    update(id, { phase: 'generating', error: null })
    try {
      if (answers.length > 0) update(id, { fix: await repository.answerReadinessFix(handoverId, fixId, answers) })
      update(id, { phase: 'ready', fix: await repository.generateReadinessFix(handoverId, fixId) })
    } catch (caught) {
      // 보완안은 그대로 두고 화면을 유지해 다시 시도할 수 있게 한다.
      update(id, { phase: 'ready', error: messageOf(caught, '수정안을 만들지 못했어요. 잠시 후 다시 시도해 주세요') })
    }
  }, [handoverId, repository, update])

  const start = useCallback(async (areas: ReadinessAreaResult[]) => {
    if (!handoverId || areas.length === 0) return
    const id = ++sessionId.current
    setSession({ areas, phase: 'starting', fix: null, error: null })
    try {
      const fix = await repository.startReadinessFix(handoverId, areas.map((area) => area.area))
      update(id, { phase: 'ready', fix })
      // 물을 것이 없으면 자료만으로 채울 수 있다. 사용자가 이미 보완을 눌렀으니 바로 만든다.
      if (fix.areas.every((area) => area.questions.length === 0)) await runGenerate(id, fix.id, [])
    } catch (caught) {
      update(id, { phase: 'error', error: messageOf(caught, '보완을 시작하지 못했어요. 잠시 후 다시 시도해 주세요') })
    }
  }, [handoverId, repository, runGenerate, update])

  /** 새로 입력한 답을 저장하고 수정안을 (다시) 만든다. */
  const generate = useCallback(async (answers: ReadinessFixAnswer[]) => {
    const fix = session?.fix
    if (!fix) return
    await runGenerate(sessionId.current, fix.id, answers)
  }, [runGenerate, session?.fix])

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
        phase: 'ready',
        error: conflict
          ? '보완을 시작한 뒤 문서가 바뀌어 적용하지 않았어요. 최신 문서를 다시 불러왔으니 다시 점검한 뒤 새로 보완해 주세요.'
          : messageOf(caught, '문서에 적용하지 못했어요. 잠시 후 다시 시도해 주세요'),
        ...(conflict ? { fix: { ...fix, stale: true } } : {}),
      })
      if (conflict && alive.current) onConflict()
    }
  }, [handoverId, onApplied, onConflict, repository, revision, session?.fix, update])

  /** 창을 닫는다. 아직 열린 보완안은 서버에서도 닫아 둔다(실패해도 문서에는 영향이 없다). */
  const close = useCallback(() => {
    const fix = session?.fix
    sessionId.current += 1
    setSession(null)
    if (handoverId && fix && isOpen(fix)) {
      repository.discardReadinessFix(handoverId, fix.id).catch(() => { /* 닫기만 실패한 보완안은 적용되지 않으므로 무시한다 */ })
    }
  }, [handoverId, repository, session?.fix])

  return { session, start, generate, apply, close }
}
