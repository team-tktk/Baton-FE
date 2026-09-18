import { useCallback, useEffect, useRef, useState } from 'react'

import type { HandoverReadiness } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { ApiError } from '@/shared/api'

export type ReadinessPhase = 'loading' | 'evaluating' | 'ready' | 'error'

interface ReadinessState {
  readiness: HandoverReadiness | null
  phase: ReadinessPhase
  error: string | null
}

interface UseDocumentReadinessOptions {
  handoverId: string | null
  /** 화면에서 고친 내용을 먼저 서버에 저장한다. 실패하면 false(안내는 호출한 쪽이 한다). */
  saveDraft: () => Promise<boolean>
}

const messageOf = (caught: unknown) => caught instanceof ApiError ? caught.message : '준비도를 확인하지 못했어요. 잠시 후 다시 시도해 주세요'

/**
 * 초안 확인 단계의 준비도. 들어오면 저장된 평가를 읽고, 평가한 적이 없을 때만 바로 평가한다.
 * 평가가 낡아도 자동으로 다시 평가하지 않는다(AI 호출이 수십 초 걸린다). 사용자가 reevaluate를 부른다.
 */
export function useDocumentReadiness({ handoverId, saveDraft }: UseDocumentReadinessOptions) {
  const repository = useHandoverRepository()
  const [state, setState] = useState<ReadinessState>({ readiness: null, phase: 'loading', error: null })
  const busy = useRef(false)
  const alive = useRef(true)
  // 페이지가 매번 새 함수를 넘겨도 조회 이펙트가 다시 돌지 않게 최신 함수만 들고 있는다.
  const saveDraftRef = useRef(saveDraft)

  useEffect(() => { saveDraftRef.current = saveDraft }, [saveDraft])

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const evaluate = useCallback(async (saveFirst: boolean) => {
    if (!handoverId || busy.current) return
    busy.current = true
    setState((current) => ({ ...current, phase: 'evaluating', error: null }))
    const fallback = (error: string | null) => setState((current) => ({ ...current, phase: current.readiness ? 'ready' : 'error', error }))
    try {
      if (saveFirst && !(await saveDraftRef.current())) {
        if (alive.current) fallback(null)
        return
      }
      const readiness = await repository.evaluateReadiness(handoverId)
      if (alive.current) setState({ readiness, phase: 'ready', error: null })
    } catch (caught) {
      if (alive.current) fallback(messageOf(caught))
    } finally {
      busy.current = false
    }
  }, [handoverId, repository])

  useEffect(() => {
    if (!handoverId) return
    let ignore = false
    repository.getReadiness(handoverId)
      .then((readiness) => {
        if (ignore) return
        if (readiness) setState({ readiness, phase: 'ready', error: null })
        else void evaluate(false)
      })
      .catch((caught: unknown) => { if (!ignore) setState({ readiness: null, phase: 'error', error: messageOf(caught) }) })
    return () => { ignore = true }
  }, [evaluate, handoverId, repository])

  /** 저장하고 다시 평가한다. 내용이 같으면 서버가 같은 점수를 돌려준다. */
  const reevaluate = useCallback(() => evaluate(true), [evaluate])

  /** 보완 적용처럼 다른 곳에서 새 평가를 받았을 때 바꿔 끼운다. */
  const replaceReadiness = useCallback((readiness: HandoverReadiness) => {
    setState({ readiness, phase: 'ready', error: null })
  }, [])

  return { ...state, reevaluate, replaceReadiness }
}
