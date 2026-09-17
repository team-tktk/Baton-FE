import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react'

import type { MaskingCandidate, MaskingRangeInput } from '@/entities/handover'

import { buildMaskedSegments } from '../model/buildMaskedSegments'
import { markElementId } from '../model/elementIds'
import { TEXT_SEGMENT_ATTRIBUTE, overlapsCandidate, resolveSelectionRange } from '../model/resolveSelectionRange'
import styles from './MaskedDocument.module.css'

interface MaskedDocumentProps {
  candidates: MaskingCandidate[]
  fileName: string
  selectedId: string | null
  text: string
  /** 없으면 드래그로 추가할 수 없다(확정 중이거나 확정된 파일). */
  onAddRange?: (range: MaskingRangeInput) => Promise<unknown>
  onSelect: (candidateId: string) => void
}

interface PendingRange {
  range: MaskingRangeInput
  overlaps: boolean
  top: number
  left: number
}

const ACTION_ATTRIBUTE = 'data-selection-action'
/** 핸들을 끄는 동안 선택이 계속 바뀐다. 멈춘 뒤에 한 번만 읽는다. */
const SELECTION_SETTLE_MS = 250

/** 선택 영역을 읽어 버튼을 띄울 위치까지 계산한다. 원문 구간이 아니면 null. */
function readPendingRange(root: HTMLElement, text: string, candidates: MaskingCandidate[]): PendingRange | null {
  const selection = window.getSelection()
  const range = resolveSelectionRange(root, selection, text)
  if (!range || !selection) return null
  // jsdom 등 레이아웃이 없는 환경에서는 위치를 계산하지 않고 왼쪽 위에 둔다.
  const selected = selection.getRangeAt(0)
  const box = typeof selected.getBoundingClientRect === 'function' ? selected.getBoundingClientRect() : null
  const frame = root.getBoundingClientRect()
  return {
    range,
    overlaps: overlapsCandidate(range, candidates),
    top: box ? box.bottom - frame.top + root.scrollTop + 8 : 0,
    left: box ? Math.max(0, box.left - frame.left + root.scrollLeft) : 0,
  }
}

/**
 * 서버가 추출한 원문 위에 마스킹 후보를 표시한다. 원본 PDF가 아니라 추출 텍스트다.
 * 가릴 항목은 확정 뒤 보일 가림 값으로, 가리지 않을 항목은 원문 그대로 보여 준다.
 * 자동으로 못 찾은 이름·주소 등은 드래그해서 직접 가릴 수 있다.
 */
export function MaskedDocument({ candidates, fileName, onAddRange, onSelect, selectedId, text }: MaskedDocumentProps) {
  const segments = useMemo(() => buildMaskedSegments(text.length, candidates), [candidates, text.length])
  const rootRef = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState<PendingRange | null>(null)
  const [adding, setAdding] = useState(false)

  const canAdd = Boolean(onAddRange)

  // 마우스로 고르면 손을 떼는 순간 바로 띄우고, 다른 곳을 누르면 닫는다.
  const readSelection = (event: { target: EventTarget | null }) => {
    const root = rootRef.current
    // 떠 있는 버튼을 누를 때도 이벤트가 올라온다. 이때 선택을 다시 읽으면 버튼이 사라져 클릭이 먹히지 않는다.
    if (!root || !canAdd || (event.target instanceof Element && event.target.closest(`[${ACTION_ATTRIBUTE}]`))) return
    setPending(readPendingRange(root, text, candidates))
  }

  // 휴대폰은 길게 눌러 고르고 핸들로 범위를 조정한다. 이때는 mouseup이 오지 않아 선택 변경을 따로 듣는다.
  // 버튼을 누르는 순간 선택이 풀릴 수 있으므로, 여기서는 띄우기만 하고 닫지는 않는다.
  useEffect(() => {
    if (!canAdd) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const onSelectionChange = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const root = rootRef.current
        const next = root ? readPendingRange(root, text, candidates) : null
        if (next) setPending(next)
      }, SELECTION_SETTLE_MS)
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      clearTimeout(timer)
    }
  }, [canAdd, candidates, text])

  const add = async () => {
    if (!pending || pending.overlaps || !onAddRange) return
    setAdding(true)
    try {
      await onAddRange(pending.range)
      window.getSelection()?.removeAllRanges()
      setPending(null)
    } finally {
      setAdding(false)
    }
  }

  // 버튼을 누르는 순간 선택이 풀리지 않게 한다.
  const keepSelection = (event: ReactMouseEvent) => event.preventDefault()

  return (
    <div
      aria-label={`${fileName} 추출 텍스트`}
      className={styles.document}
      ref={rootRef}
      role="region"
      onKeyUp={readSelection}
      onMouseUp={readSelection}
      onTouchEnd={readSelection}
    >
      {segments.map((segment) => {
        if (segment.kind === 'text') {
          return <span {...{ [TEXT_SEGMENT_ATTRIBUTE]: '' }} data-start={segment.start} key={`text-${segment.start}`}>{text.slice(segment.start, segment.end)}</span>
        }
        const { candidate } = segment
        const tone = candidate.pendingReview ? styles.pending : !candidate.applied ? styles.kept : candidate.origin === 'manual' ? styles.manual : styles.applied
        return (
          <button
            aria-label={`${candidate.typeLabel} ${candidate.applied ? candidate.preview : text.slice(segment.start, segment.end)}, ${candidate.pendingReview ? '확인 필요' : candidate.applied ? '가림' : '가리지 않음'}`}
            aria-pressed={selectedId === candidate.id}
            className={`${styles.mark} ${tone} ${selectedId === candidate.id ? styles.selected : ''}`.trim()}
            data-start={segment.start}
            id={markElementId(candidate.id)}
            key={candidate.id}
            type="button"
            onClick={() => onSelect(candidate.id)}
          >
            <span aria-hidden="true">{candidate.applied ? candidate.preview : text.slice(segment.start, segment.end)}</span>
            <small aria-hidden="true">{candidate.typeLabel}</small>
          </button>
        )
      })}
      {pending && (
        <div {...{ [ACTION_ATTRIBUTE]: '' }} className={styles.selectionAction} style={{ top: pending.top, left: pending.left }}>
          {pending.overlaps ? (
            <p role="status">이미 표시된 항목과 겹쳐요. 목록에서 체크해 주세요.</p>
          ) : (
            <button disabled={adding} type="button" onClick={() => { void add() }} onMouseDown={keepSelection}>
              {adding ? '추가하는 중…' : '이 부분 가리기'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
