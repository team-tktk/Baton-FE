import { afterEach, describe, expect, it } from 'vitest'

import type { MaskingCandidate } from '@/entities/handover'

import { TEXT_SEGMENT_ATTRIBUTE, overlapsCandidate, resolveSelectionRange } from './resolveSelectionRange'

// 원문: "연락처 min@example.com 첨부 목록"
const TEXT = '연락처 min@example.com 첨부 목록'
const MARK_START = TEXT.indexOf('min@')
const MARK_END = MARK_START + 'min@example.com'.length

function buildDocument() {
  const root = document.createElement('div')
  const segment = (start: number, end: number) => {
    const span = document.createElement('span')
    span.setAttribute(TEXT_SEGMENT_ATTRIBUTE, '')
    span.dataset.start = String(start)
    span.textContent = TEXT.slice(start, end)
    return span
  }
  const before = segment(0, MARK_START)
  const mark = document.createElement('button')
  mark.dataset.start = String(MARK_START)
  mark.textContent = 'min***@example.com'
  const after = segment(MARK_END, TEXT.length)
  root.append(before, mark, after)
  document.body.append(root)
  return { after, before, mark, root }
}

function select(startNode: Node, startOffset: number, endNode: Node, endOffset: number) {
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  return selection
}

const candidate = (start: number, end: number) => ({ start, end }) as MaskingCandidate

afterEach(() => {
  window.getSelection()?.removeAllRanges()
  document.body.innerHTML = ''
})

describe('resolveSelectionRange', () => {
  it('turns a selection inside a text segment into text offsets', () => {
    const { after, root } = buildDocument()
    const node = after.firstChild!
    // after 구간은 " 첨부 목록"이다. "첨부"만 고른다.
    const selection = select(node, 1, node, 3)

    expect(resolveSelectionRange(root, selection, TEXT)).toEqual({ start: MARK_END + 1, end: MARK_END + 3 })
    expect(TEXT.slice(MARK_END + 1, MARK_END + 3)).toBe('첨부')
  })

  it('trims surrounding spaces from the selection', () => {
    const { after, root } = buildDocument()
    const node = after.firstChild!
    const selection = select(node, 0, node, node.textContent!.length)

    expect(resolveSelectionRange(root, selection, TEXT)).toEqual({ start: MARK_END + 1, end: TEXT.length })
  })

  it('ignores a selection that ends inside a highlighted item', () => {
    const { before, mark, root } = buildDocument()

    expect(resolveSelectionRange(root, select(before.firstChild!, 0, mark.firstChild!, 3), TEXT)).toBeNull()
  })

  it('ignores empty, whitespace-only and outside selections', () => {
    const { after, root } = buildDocument()
    const node = after.firstChild!
    const outside = document.createElement('p')
    outside.textContent = '문서 밖'
    document.body.append(outside)

    expect(resolveSelectionRange(root, select(node, 1, node, 1), TEXT)).toBeNull()
    expect(resolveSelectionRange(root, select(node, 0, node, 1), TEXT)).toBeNull()
    expect(resolveSelectionRange(root, select(outside.firstChild!, 0, outside.firstChild!, 2), TEXT)).toBeNull()
    expect(resolveSelectionRange(root, null, TEXT)).toBeNull()
  })

  it('reads boundaries placed between the root children', () => {
    const { root } = buildDocument()

    // 루트 전체를 고르면 앞 구간 시작부터 원문 끝까지다.
    expect(resolveSelectionRange(root, select(root, 0, root, root.childNodes.length), TEXT)).toEqual({ start: 0, end: TEXT.length })
  })
})

describe('overlapsCandidate', () => {
  it('treats touching ranges as separate', () => {
    expect(overlapsCandidate({ start: 0, end: 4 }, [candidate(4, 8)])).toBe(false)
    expect(overlapsCandidate({ start: 0, end: 5 }, [candidate(4, 8)])).toBe(true)
    expect(overlapsCandidate({ start: 5, end: 6 }, [candidate(4, 8)])).toBe(true)
  })
})
