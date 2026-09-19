import { useCallback, useEffect, useRef, useState } from 'react'

import type { HandoverAttachment, MaskingCandidate, MaskingRangeInput, MaskingReview } from '@/entities/handover'
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

function withCandidates(review: MaskingReview, candidates: MaskingCandidate[]): MaskingReview {
  const ordered = [...candidates].sort((left, right) => left.start - right.start)
  return { ...review, candidates: ordered, summary: summarizeMasking(ordered) }
}

function withCandidate(review: MaskingReview, candidate: MaskingCandidate): MaskingReview {
  return withCandidates(review, review.candidates.map((item) => item.id === candidate.id ? candidate : item))
}

export function useMaskingReview({ attachments, handoverId, onAttachmentsChange, onFeedback }: UseMaskingReviewOptions) {
  const repository = useHandoverRepository()
  const [reviews, setReviews] = useState<Record<string, MaskingReview>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<string[]>([])
  const [progress, setProgress] = useState<ConfirmProgress | null>(null)
  // 웹 링크·Slack 메시지. 마스킹이 켜진 서버에서는 파일처럼 검수 대기로 멈추고, 남아 있으면 분석이 막힌다.
  const [external, setExternal] = useState<HandoverAttachment[]>([])
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const refreshExternal = useCallback(async () => {
    if (!handoverId) return
    const sources = await repository.listExternalSources(handoverId)
    if (alive.current) setExternal(sources)
  }, [handoverId, repository])

  useEffect(() => {
    if (!handoverId) return
    let ignore = false
    repository.listExternalSources(handoverId)
      .then((sources) => { if (!ignore) setExternal(sources) })
      .catch((caught: unknown) => { if (!ignore) setLoadError(messageOf(caught, '웹 링크·Slack 자료를 불러오지 못했어요')) })
    return () => { ignore = true }
  }, [handoverId, reloadToken, repository])

  // 외부 자료는 업로드 목록과 따로 읽는다. 아직 읽는 중이면 끝날 때까지 다시 확인한다.
  const externalReading = external.some((source) => source.status === 'processing')
  useEffect(() => {
    if (!externalReading) return
    const timer = setInterval(() => { refreshExternal().catch(() => { /* 다음 주기에 다시 읽는다 */ }) }, WAIT_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [externalReading, refreshExternal])

  const sources = [...attachments, ...external]
  // 이 화면에서 확정한 자료는 상태가 바뀌어도 목록에 남겨 "확정됨"을 보여 준다.
  const allReviewSources = sources.filter((file) => file.status === 'review' || reviews[file.id])
  // 찾은 민감정보가 없는 웹 링크·Slack 메시지는 한 건씩 보여 주지 않고 묶는다. Slack은 메시지마다 자료라 수백 건이 될 수 있다.
  const isClean = (file: HandoverAttachment) => Boolean(file.origin && file.origin !== 'file' && reviews[file.id] && !reviews[file.id]!.confirmed && reviews[file.id]!.candidates.length === 0)
  const cleanSources = allReviewSources.filter(isClean)
  const reviewFiles = allReviewSources.filter((file) => !isClean(file))
  const unloadedKey = sources.filter((file) => file.status === 'review' && !reviews[file.id]).map((file) => file.id).join(',')

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

  const openReviews = allReviewSources.map((file) => reviews[file.id]).filter((review): review is MaskingReview => Boolean(review && !review.confirmed))
  const remaining = openReviews.reduce((sum, review) => sum + review.summary.remaining, 0)
  const applied = openReviews.reduce((sum, review) => sum + review.summary.applied, 0)
  const loading = Boolean(unloadedKey) && !loadError

  const refreshFiles = useCallback(async () => {
    if (!handoverId) return
    try {
      const [files] = await Promise.all([repository.listFiles(handoverId), refreshExternal()])
      if (alive.current) onAttachmentsChange(files)
    } catch { /* 목록 갱신 실패는 다음 조회에서 다시 맞춘다 */ }
  }, [handoverId, onAttachmentsChange, refreshExternal, repository])

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

  /** 사용자가 원문에서 고른 구간을 직접 가릴 항목으로 추가한다. 성공하면 추가된 항목을 돌려준다. */
  const addRange = useCallback(async (fileId: string, range: MaskingRangeInput) => {
    if (!handoverId) return null
    try {
      const added = await repository.addMaskingCandidate(handoverId, fileId, range)
      if (!alive.current) return null
      setReviews((current) => current[fileId]
        ? { ...current, [fileId]: withCandidates(current[fileId], [...current[fileId].candidates, added]) }
        : current)
      return added
    } catch (caught) {
      if (alive.current) onFeedback(messageOf(caught, '구간을 추가하지 못했어요. 잠시 후 다시 시도해 주세요'))
      return null
    }
  }, [handoverId, onFeedback, repository])

  /** 직접 추가한 항목만 지울 수 있다. 자동으로 찾은 항목은 체크를 해제한다. */
  const removeCandidate = useCallback(async (fileId: string, candidateId: string) => {
    if (!handoverId) return
    setSavingIds((ids) => [...ids, candidateId])
    try {
      await repository.removeMaskingCandidate(handoverId, fileId, candidateId)
      if (!alive.current) return
      setReviews((current) => current[fileId]
        ? { ...current, [fileId]: withCandidates(current[fileId], current[fileId].candidates.filter((item) => item.id !== candidateId)) }
        : current)
    } catch (caught) {
      if (alive.current) onFeedback(messageOf(caught, '항목을 지우지 못했어요. 잠시 후 다시 시도해 주세요'))
    } finally {
      if (alive.current) setSavingIds((ids) => ids.filter((id) => id !== candidateId))
    }
  }, [handoverId, onFeedback, repository])

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
        const [files, sources] = await Promise.all([repository.listFiles(handoverId), repository.listExternalSources(handoverId)])
        if (!alive.current) return false
        failures = 0
        onAttachmentsChange(files)
        setExternal(sources)
        const all = [...files, ...sources]
        if (!all.some((file) => file.status === 'processing' || file.status === 'review')) {
          const failed = all.filter((file) => file.status === 'failed').length
          // 실패한 자료는 서버도 분석을 막지 않는다. 멈추지 않고 빠진다는 사실만 알린다.
          if (failed > 0) onFeedback(`처리하지 못한 자료 ${failed}개는 분석에서 빠져요`)
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
    const targets = [...attachments, ...external].filter((file) => file.status === 'review').map((file) => file.id)
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
  }, [attachments, external, handoverId, onFeedback, refreshFiles, reloadReview, repository, waitUntilIndexed])

  return {
    activeFileId,
    addRange,
    applied,
    /** 찾은 민감정보가 없어 묶어 보여 주는 웹 링크·Slack 자료. 확정할 때 함께 확정된다. */
    cleanSources,
    canConfirm: !loading && !loadError && openReviews.length > 0 && remaining === 0 && !progress && savingIds.length === 0,
    confirmAll,
    loadError,
    loading,
    openFileCount: openReviews.length,
    progress,
    /** 아직 내용을 읽는 파일이나 외부 자료가 있다. */
    reading: sources.some((file) => file.status === 'processing'),
    reload,
    remaining,
    removeCandidate,
    reviewFiles,
    reviews,
    savingIds,
    selectFile: setSelectedFileId,
    toggle,
  }
}
