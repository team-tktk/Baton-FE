import type { MaskingCandidate, MaskingRangeInput } from '@/entities/handover'

/** 원문을 그대로 담은 구간에만 붙는 표식. 가린 값을 보여 주는 강조 구간은 원문과 글자가 달라 위치를 셀 수 없다. */
export const TEXT_SEGMENT_ATTRIBUTE = 'data-text-segment'

/**
 * 선택 경계 한 점을 원문 위치로 바꾼다.
 * 각 일반 텍스트 구간은 data-start를 갖고 텍스트 노드 하나만 담으므로, 구간 시작 + 노드 안 위치가 곧 원문 위치다.
 * 강조 구간 안이나 문서 밖이면 셀 수 없으므로 null.
 */
function pointToOffset(root: HTMLElement, node: Node, offset: number, textLength: number): number | null {
  if (!root.contains(node)) return null
  // 문서 전체를 잡는 선택(세 번 클릭 등)은 경계가 루트의 자식 사이로 온다.
  if (node === root) {
    const child = root.childNodes[offset]
    if (!child) return textLength
    return child instanceof HTMLElement && child.hasAttribute(TEXT_SEGMENT_ATTRIBUTE) ? Number(child.dataset.start) : null
  }
  const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement
  const segment = element?.closest<HTMLElement>(`[${TEXT_SEGMENT_ATTRIBUTE}]`)
  if (!segment || !root.contains(segment)) return null
  const start = Number(segment.dataset.start)
  // 경계가 구간 요소 자체에 걸리면 offset은 자식 순번(0 또는 1)이다.
  if (node === segment) return offset === 0 ? start : start + (segment.textContent?.length ?? 0)
  return start + offset
}

/** 문서 안에서 드래그한 영역을 원문 [start, end) 구간으로 바꾼다. 앞뒤 공백은 뺀다. */
export function resolveSelectionRange(root: HTMLElement, selection: Selection | null, text: string): MaskingRangeInput | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null
  const range = selection.getRangeAt(0)
  const from = pointToOffset(root, range.startContainer, range.startOffset, text.length)
  const to = pointToOffset(root, range.endContainer, range.endOffset, text.length)
  if (from === null || to === null) return null

  let start = Math.min(from, to)
  let end = Math.max(from, to)
  while (start < end && /\s/.test(text[start])) start += 1
  while (end > start && /\s/.test(text[end - 1])) end -= 1
  return start < end ? { start, end } : null
}

/** 서버는 기존 항목과 겹치는 구간을 거절한다. 보내기 전에 걸러 이유를 바로 알려 준다. */
export function overlapsCandidate(range: MaskingRangeInput, candidates: MaskingCandidate[]) {
  return candidates.some((candidate) => candidate.start < range.end && range.start < candidate.end)
}
