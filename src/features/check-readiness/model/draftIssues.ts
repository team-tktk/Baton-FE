import type { DocumentSection, HandoverDocument, HandoverReadiness, ReadinessArea, ReadinessItemStatus } from '@/entities/handover'
import { readSectionValue } from '@/entities/handover'

/** 편집기에서 준비도 문제를 표시할 때 쓰는 정보. 한 섹션에 여러 영역이 걸릴 수 있다. */
export interface DraftIssue {
  area: ReadinessArea
  label: string
  status: ReadinessItemStatus
  statusLabel: string
  anchorText: string | null
  evidenceName: string | null
}

export type DraftIssueMap = Partial<Record<DocumentSection, DraftIssue[]>>

/** 스크롤·포커스 대상이 되는 섹션 요소 id */
export const sectionElementId = (section: DocumentSection) => `draft-section-${section.toLowerCase().replaceAll('_', '-')}`

/** 편집기에서 직접 고칠 수 있는 섹션. 일정·권한·확인된 기준은 읽기 전용 표다. */
const EDITABLE_SECTIONS = new Set<DocumentSection>([
  'PURPOSE',
  'COMPLETION_CRITERIA',
  'ONGOING_TASKS',
  'RECURRING_TASKS',
  'RULES_AND_EXCEPTIONS',
  'STAKEHOLDERS',
  'TOOLS',
  'FIRST_WEEK_CHECKLIST',
])

export function isSectionEmpty(document: HandoverDocument, section: DocumentSection) {
  const { value } = readSectionValue(document, section)
  return typeof value === 'string' ? !value.trim() : value.length === 0
}

/** "문서에서 수정하기"는 내용이 있고 편집기에서 고칠 수 있는 섹션에만 보여 준다. */
export function canEditInDocument(document: HandoverDocument, section: DocumentSection) {
  return EDITABLE_SECTIONS.has(section) && !isSectionEmpty(document, section)
}

export function toDraftIssues(readiness: HandoverReadiness | null): DraftIssueMap {
  const issues: DraftIssueMap = {}
  for (const area of readiness?.areas ?? []) {
    if (area.status === 'sufficient') continue
    const evidence = area.evidence[0]
    issues[area.section] = [...(issues[area.section] ?? []), {
      area: area.area,
      label: area.label,
      status: area.status,
      statusLabel: area.statusLabel,
      anchorText: area.anchorText,
      evidenceName: evidence ? `${evidence.fileName}${area.evidence.length > 1 ? ` 외 ${area.evidence.length - 1}개` : ''}` : null,
    }]
  }
  return issues
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

/** 섹션의 강조 문장이 이 값 안에 들어 있는지. 공백 차이는 무시한다. */
export function containsAnchor(value: string, issues: DraftIssue[] | undefined) {
  if (!issues) return false
  const target = normalize(value)
  return issues.some((issue) => {
    const anchor = issue.anchorText ? normalize(issue.anchorText) : ''
    return anchor.length > 1 && target.includes(anchor)
  })
}
