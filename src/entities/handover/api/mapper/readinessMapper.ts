import type {
  DocumentSection,
  DocumentSectionFields,
  DocumentSectionValue,
  HandoverDocument,
  HandoverReadiness,
  ReadinessAreaResult,
  ReadinessEvidence,
  ReadinessFix,
  ReadinessFixStatus,
  ReadinessGrade,
  ReadinessItemStatus,
  ReadinessRubric,
} from '../../model/types'
import type {
  HandoverDraftContent,
  ReadinessAreaResponse,
  ReadinessEvidenceDto,
  ReadinessFixResponse,
  ReadinessFixStatusDto,
  ReadinessGradeDto,
  ReadinessResponse,
  ReadinessRubricResponse,
  ReadinessStatusDto,
} from '../dto/types'
import { toDraftContent, toHandoverDocument } from './documentMapper'

/** 섹션 → 서버 content 키. 응답의 sectionField 대신 이 표를 믿는다. */
const CONTENT_KEYS = {
  PURPOSE: 'purpose',
  COMPLETION_CRITERIA: 'completionCriteria',
  ONGOING_TASKS: 'ongoingTasks',
  RECURRING_TASKS: 'recurringTasks',
  RULES_AND_EXCEPTIONS: 'rulesAndExceptions',
  STAKEHOLDERS: 'stakeholders',
  TOOLS: 'tools',
  SCHEDULE: 'schedule',
  ACCESS_ACCOUNTS: 'accessAccounts',
  FIRST_WEEK_CHECKLIST: 'firstWeekChecklist',
  CONFIRMED_CRITERIA: 'confirmedCriteria',
} as const satisfies Record<DocumentSection, keyof HandoverDraftContent>

/** 섹션 → 화면 문서 필드 */
export const DOCUMENT_SECTION_FIELDS: DocumentSectionFields = {
  PURPOSE: 'purpose',
  COMPLETION_CRITERIA: 'completionStandard',
  ONGOING_TASKS: 'activeTasks',
  RECURRING_TASKS: 'recurringTasks',
  RULES_AND_EXCEPTIONS: 'criteria',
  STAKEHOLDERS: 'people',
  TOOLS: 'tools',
  SCHEDULE: 'schedule',
  ACCESS_ACCOUNTS: 'accessAccounts',
  FIRST_WEEK_CHECKLIST: 'checklist',
  CONFIRMED_CRITERIA: 'confirmedCriteria',
}

const TEXT_SECTIONS = new Set<DocumentSection>(['PURPOSE', 'COMPLETION_CRITERIA'])
const STRING_LIST_SECTIONS = new Set<DocumentSection>(['RULES_AND_EXCEPTIONS', 'FIRST_WEEK_CHECKLIST'])

const EMPTY_META = { title: '', intro: '', scope: '', statusLabel: '', updatedAtLabel: '' }

// 형식이 섹션과 맞지 않으면 빈 섹션으로 본다. 문서 매퍼가 잘못된 값에서 터지지 않게 하기 위해서다.
function sanitize(section: DocumentSection, raw: unknown): unknown {
  if (TEXT_SECTIONS.has(section)) return typeof raw === 'string' ? raw : undefined
  if (!Array.isArray(raw)) return undefined
  return STRING_LIST_SECTIONS.has(section)
    ? raw.filter((item): item is string => typeof item === 'string')
    : raw.filter((item) => item !== null && typeof item === 'object' && !Array.isArray(item))
}

/** 보완안 before/after(content.{sectionField} 형식)를 화면 문서 모델의 섹션 값으로 바꾼다. */
export function toDocumentSectionValue(section: DocumentSection, raw: unknown): DocumentSectionValue {
  const content = { [CONTENT_KEYS[section]]: sanitize(section, raw) } as HandoverDraftContent
  return readSectionValue(toHandoverDocument(content, EMPTY_META), section)
}

export function readSectionValue(document: HandoverDocument, section: DocumentSection): DocumentSectionValue {
  return { section, value: document[DOCUMENT_SECTION_FIELDS[section]] } as DocumentSectionValue
}

/** 섹션 하나만 바꾼 새 문서를 돌려준다. */
export function applySectionValue(document: HandoverDocument, next: DocumentSectionValue): HandoverDocument {
  return { ...document, [DOCUMENT_SECTION_FIELDS[next.section]]: next.value }
}

/** 화면 문서의 섹션을 서버 content 형식으로 되돌린다. */
export function toSectionContent(document: HandoverDocument, section: DocumentSection): unknown {
  return toDraftContent(document)[CONTENT_KEYS[section]]
}

const GRADES: Record<ReadinessGradeDto, ReadinessGrade> = {
  READY: 'ready',
  NEEDS_IMPROVEMENT: 'needs-improvement',
  NOT_READY: 'not-ready',
}

const ITEM_STATUSES: Record<ReadinessStatusDto, ReadinessItemStatus> = {
  SUFFICIENT: 'sufficient',
  PARTIAL: 'partial',
  CONFLICT: 'conflict',
  MISSING: 'missing',
}

const FIX_STATUSES: Record<ReadinessFixStatusDto, ReadinessFixStatus> = {
  NEEDS_INPUT: 'needs-input',
  PROPOSED: 'proposed',
  APPLIED: 'applied',
  DISCARDED: 'discarded',
}

function toEvidence(items: ReadinessEvidenceDto[] | undefined): ReadinessEvidence[] {
  // 파일 id가 없으면 열 수 없으므로 뺀다(이름이 매칭되지 않은 근거).
  return (items ?? []).flatMap((item) => item.sourceId
    ? [{ fileId: item.sourceId, fileName: item.fileName?.trim() || '첨부 파일', locator: item.locator?.trim() || '' }]
    : [])
}

function toAreaResult(area: ReadinessAreaResponse): ReadinessAreaResult {
  return {
    area: area.area,
    label: area.label,
    criteria: area.criteria?.trim() || '',
    weight: area.weight,
    status: ITEM_STATUSES[area.status] ?? 'missing',
    statusLabel: area.statusLabel,
    percent: area.percent,
    keyIssue: area.keyIssue,
    section: area.section,
    sectionLabel: area.sectionLabel,
    anchorText: area.anchorText?.trim() || null,
    summary: area.summary?.trim() || '',
    resolution: area.resolution?.trim() || '',
    evidence: toEvidence(area.evidence),
  }
}

export function toHandoverReadiness(readiness: ReadinessResponse): HandoverReadiness {
  return {
    evaluationId: readiness.evaluationId,
    rubricVersion: readiness.rubricVersion,
    score: readiness.score,
    potentialScore: readiness.potentialScore,
    grade: GRADES[readiness.grade] ?? 'not-ready',
    gradeLabel: readiness.gradeLabel,
    keyIssueCount: readiness.keyIssueCount,
    stale: readiness.stale,
    draftRevision: readiness.draftRevision,
    evaluatedAt: readiness.evaluatedAt,
    areas: (readiness.areas ?? []).map(toAreaResult),
  }
}

export function toReadinessRubric(rubric: ReadinessRubricResponse): ReadinessRubric {
  const percent = rubric.statusPercent ?? {}
  return {
    version: rubric.version,
    areas: (rubric.areas ?? []).map((area) => ({
      area: area.area,
      label: area.label,
      criteria: area.criteria?.trim() || '',
      weight: area.weight,
      sections: area.sections ?? [],
    })),
    statusPercent: {
      sufficient: percent.SUFFICIENT ?? 100,
      partial: percent.PARTIAL ?? 50,
      conflict: percent.CONFLICT ?? 25,
      missing: percent.MISSING ?? 0,
    },
    readyScore: rubric.readyScore,
    minimumScore: rubric.minimumScore,
    keyIssueCount: rubric.keyIssueCount,
  }
}

export function toReadinessFix(fix: ReadinessFixResponse): ReadinessFix {
  const hasProposal = fix.after !== undefined && fix.after !== null
  return {
    id: fix.fixId,
    area: fix.area,
    areaLabel: fix.areaLabel,
    section: fix.section,
    sectionLabel: fix.sectionLabel,
    status: FIX_STATUSES[fix.status] ?? 'discarded',
    baseRevision: fix.baseRevision,
    stale: fix.stale,
    appliedRevision: fix.appliedRevision ?? null,
    before: toDocumentSectionValue(fix.section, fix.before),
    after: hasProposal ? toDocumentSectionValue(fix.section, fix.after) : null,
    changeSummary: fix.changeSummary?.trim() || '',
    questions: (fix.questions ?? []).map((question) => ({
      id: question.id,
      question: question.question,
      reason: question.reason?.trim() || '',
      answer: question.answer ?? null,
    })),
    evidence: toEvidence(fix.evidence),
  }
}
