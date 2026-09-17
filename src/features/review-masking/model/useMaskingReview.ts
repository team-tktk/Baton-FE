import { useCallback, useEffect, useRef, useState } from 'react'

import type { HandoverAttachment, MaskingCandidate, MaskingReview } from '@/entities/handover'
import { summarizeMasking, useHandoverRepository } from '@/entities/handover'
import { ApiError } from '@/shared/api'

/** 확정 뒤 임베딩이 끝나기를 기다리는 주기와 한도. 연속 실패가 이어지면 무한 대기 대신 빠져나온다. */
const WAIT_INTERVAL_MS = 2000
const WAIT_FAILURE_LIMIT = 5
const WAIT_MAX_ROUNDS = 90

export type ConfirmProgress =
  | { phase: 'confirming'; done: number; total: number }
  | { phase: 'indexing' }

interface UseMaskingReviewOptions {
  handoverId: string | null
  attachments: HandoverAttachment[]
  onAttachmentsChange: (attachments: HandoverAttachment[]) => void
  onFeedback: (message: string) => void
}

const delay = (ms: number) => new Promise((resolve) => { setTimeout(resolve, ms) })
const messageOf = (caught: unknown, fallback: string) => caught instanceof ApiError ? caught.message : fallback

function withCandidate(review: MaskingReview, candidate: MaskingCandidate): MaskingReview {
  const candidates = review.candidates.map((item) => item.id === candidate.id ? candidate : item)
  return { ...review, candidates, summary: summarizeMasking(candidates) }
}

export function useMaskingReview({ attachments, handoverId, onAttachmentsChange, onFeedback }: UseMaskingReviewOptions) {
  const repository = useHandoverRepository()
  const [reviews, setReviews] = useState<Record<string, MaskingReview>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<string[]>([])
  const [progress, setProgress] = useState<ConfirmProgress | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  // 이 화면에서 확정한 파일은 상태가 바뀌어도 목록에 남겨 "확정됨"을 보여 준다.
  const reviewFiles = attachments.filter((file) => file.status === 'review' || reviews[file.id])
  const unloadedKey = attachments.filter((file) => file.status === 'review' && !reviews[file.id]).map((file) => file.id).join(',')

  useEffect(() => {
    if (!handoverId || !unloadedKey) return
    let ignore = false
    Promise.all(unloadedKey.split(',').map((fileId) => repository.getMaskingReview(handoverId, fileId)))
      .then((loaded) => {
        if (ignore) return
        setLoadError(null)
        setReviews((current) => ({ ...current, ...Object.fromEntries(loaded.map((review) => [review.fileId, review])) }))
      })
      .catch((caught: unknown) => { if (!ignore) setLoadError(messageOf(caught, '민감정보 검수 내용을 불러오지 못했어요')) })
    return () => { ignore = true }
  }, [handoverId, reloadToken, repository, unloadedKey])

  const reload = useCallback(() => {
    setLoadError(null)
    setReloadToken((token) => token + 1)
  }, [])

  const activeFileId = selectedFileId && reviewFiles.some((file) => file.id === selectedFileId)
    ? selectedFileId
    : reviewFiles[0]?.id ?? null

  const openReviews = reviewFiles.map((file) => reviews[file.id]).filter((review): review is MaskingReview => Boolean(review && !review.confirmed))
  const remaining = openReviews.reduce((sum, review) => sum + review.summary.remaining, 0)
  const applied = openReviews.reduce((sum, review) => sum + review.summary.applied, 0)
  const loading = Boolean(unloadedKey) && !loadError

  const refreshFiles = useCallback(async () => {
    if (!handoverId) return
    try {
      const files = await repository.listFiles(handoverId)
      if (alive.current) onAttachmentsChange(files)
    } catch { /* 목록 갱신 실패는 다음 조회에서 다시 맞춘다 */ }
  }, [handoverId, onAttachmentsChange, repository])

  const toggle = useCallback(async (fileId: string, candidateId: string, nextApplied: boolean) => {
    if (!handoverId) return
    const previous = reviews[fileId]?.candidates.find((item) => item.id === candidateId)
    if (!previous) return
    const patch = (candidate: MaskingCandidate) => setReviews((current) => current[fileId]
      ? { ...current, [fileId]: withCandidate(current[fileId], candidate) }
      : current)

    setSavingIds((ids) => [...ids, candidateId])
    patch({ ...previous, applied: nextApplied, pendingReview: false })
    try {
      const saved = await repository.decideMaskingCandidate(handoverId, fileId, candidateId, nextApplied)
      if (alive.current) patch(saved)
    } catch (caught) {
      if (!alive.current) return
      // 되돌리지 않으면 화면은 확인 완료인데 서버는 미확인으로 남아, 확정이 이유 없이 막힌다.
      patch(previous)
      onFeedback(messageOf(caught, '선택을 저장하지 못했어요. 잠시 후 다시 시도해 주세요'))
    } finally {
      if (alive.current) setSavingIds((ids) => ids.filter((id) => id !== candidateId))
    }
  }, [handoverId, onFeedback, repository, reviews])

  const reloadReview = useCallback(async (fileId: string) => {
    if (!handoverId) return null
    try {
      const fresh = await repository.getMaskingReview(handoverId, fileId)
      if (alive.current) setReviews((current) => ({ ...current, [fileId]: fresh }))
      return fresh
    } catch {
      return null
    }
  }, [handoverId, repository])

  const waitUntilIndexed = useCallback(async () => {
    if (!handoverId) return false
    let failures = 0
    for (let round = 0; round < WAIT_MAX_ROUNDS; round += 1) {
      try {
        const files = await repository.listFiles(handoverId)
        if (!alive.current) return false
        failures = 0
        onAttachmentsChange(files)
        if (!files.some((file) => file.status === 'processing' || file.status === 'review')) {
          const failed = files.filter((file) => file.status === 'failed').length
          // 실패한 파일은 서버도 분석을 막지 않는다. 멈추지 않고 빠진다는 사실만 알린다.
          if (failed > 0) onFeedback(`처리하지 못한 파일 ${failed}개는 분석에서 빠져요`)
          return true
        }
      } catch {
        failures += 1
        if (failures >= WAIT_FAILURE_LIMIT) {
          onFeedback('파일 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요')
          return false
        }
      }
      await delay(WAIT_INTERVAL_MS)
      if (!alive.current) return false
    }
    onFeedback('파일 정리가 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요')
    return false
  }, [handoverId, onAttachmentsChange, onFeedback, repository])

  /** 검수 대기 파일을 모두 확정하고 임베딩까지 기다린다. 분석으로 넘어가도 되면 true. */
  const confirmAll = useCallback(async () => {
    if (!handoverId) return false
    const targets = attachments.filter((file) => file.status === 'review').map((file) => file.id)
    setProgress({ phase: 'confirming', done: 0, total: targets.length })
    try {
      for (const [index, fileId] of targets.entries()) {
        try {
          const confirmed = await repository.confirmMasking(handoverId, fileId)
          if (!alive.current) return false
          setReviews((current) => ({ ...current, [fileId]: confirmed }))
        } catch (caught) {
          if (!alive.current) return false
          const code = caught instanceof ApiError ? caught.serverCode : null
          // 다른 창에서 먼저 확정한 파일이다. 서버 상태로 맞추고 다음 파일로 넘어간다.
          if (code === 'MASKING_NOT_IN_REVIEW') {
            await reloadReview(fileId)
            continue
          }
          // 화면의 목록이 낡아 서버에는 아직 확인할 항목이 남아 있다. 서버 기준으로 다시 보여 준다.
          if (code === 'MASKING_REVIEW_INCOMPLETE') {
            await reloadReview(fileId)
            setSelectedFileId(fileId)
          }
          onFeedback(messageOf(caught, '검수를 확정하지 못했어요. 잠시 후 다시 시도해 주세요'))
          await refreshFiles()
          return false
        }
        setProgress({ phase: 'confirming', done: index + 1, total: targets.length })
      }
      setProgress({ phase: 'indexing' })
      return await waitUntilIndexed()
    } finally {
      if (alive.current) setProgress(null)
    }
  }, [attachments, handoverId, onFeedback, refreshFiles, reloadReview, repository, waitUntilIndexed])

  return {
    activeFileId,
    applied,
    canConfirm: !loading && !loadError && openReviews.length > 0 && remaining === 0 && !progress && savingIds.length === 0,
    confirmAll,
    loadError,
    loading,
    openFileCount: openReviews.length,
    progress,
    reload,
    remaining,
    reviewFiles,
    reviews,
    savingIds,
    selectFile: setSelectedFileId,
    toggle,
  }
}
