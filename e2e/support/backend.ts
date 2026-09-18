import { test as base } from '@playwright/test'

/**
 * e2e는 실제 백엔드 대신 이 스텁을 쓴다.
 * 아직 목업 저장소가 담당하는 화면이 많아, 실제로 나가는 요청은 인증·구성원·초안 생성뿐이다.
 */
const USER = {
  id: '00000000-0000-0000-0000-0000000000aa',
  email: 'seoyun@moastore.dev',
  name: '최서윤',
  team: '운영팀',
  position: '매니저',
  createdAt: '2026-08-01T00:00:00Z',
}

const MEMBERS = [
  { id: 'user-choi-seoyun', name: '최서윤', position: '매니저', team: '운영팀' },
  { id: 'user-jung-haneul', name: '정하늘', position: '주임', team: '운영팀' },
  { id: 'user-lee-dohyeon', name: '이도현', position: '팀장', team: '운영팀' },
  { id: 'user-kim-minjun', name: '김민준', position: '매니저', team: '상품팀' },
  { id: 'user-yoon-yerin', name: '윤예린', position: '매니저', team: '마케팅팀' },
  { id: 'user-oh-sejin', name: '오세진', position: '주임', team: '물류팀' },
  { id: 'user-park-jimin', name: '박지민', position: '매니저', team: 'CS팀' },
  { id: 'user-lee-seojin', name: '이서진', position: '주임', team: '운영지원팀' },
]

const HANDOVER_ID = '00000000-0000-0000-0000-0000000000bb'
const OWNER = { id: '00000000-0000-0000-0000-0000000000aa', name: '최서윤', team: '운영팀', position: '매니저' }
const PARTICIPANTS = [{ userId: 'user-jung-haneul', name: '정하늘', team: '운영팀', position: '주임', role: 'RECIPIENT' }]
const WORK_SCOPES = [{ id: 'scope-1', title: '프로모션 운영' }]

const DRAFT = {
  purpose: '프로모션과 주문 운영이 담당자 변경 후에도 멈추지 않도록 합니다.',
  completionCriteria: '정하늘님이 행사 일정, 주문 현황, 배송 이슈를 독립적으로 처리할 수 있습니다.',
  ongoingTasks: [
    { title: '가을 정기 할인전 준비', status: '진행 중', description: '행사 상품과 쿠폰 범위를 정하고 있습니다.', nextAction: '상품팀·마케팅팀과 쿠폰 범위 확정', schedule: '9월 12일' },
    { title: '새 배송업체 연결', status: '답변 대기', description: '물류팀의 반품 기간 답변을 기다리고 있습니다.', nextAction: '답변 후 배송업체 신청 화면에 등록', schedule: '오세진 · 물류팀' },
  ],
  recurringTasks: [
    { title: '주간 주문 현황 정리', status: '매주 반복', description: '주문 수, 반품, 문의를 모아 팀에 공유합니다.', nextAction: '월요일 확인 → 화요일 팀 검토', schedule: '매주 월요일' },
  ],
  rulesAndExceptions: ['쿠폰 할인율이 10%를 넘으면 예산과 승인 순서를 확인합니다.'],
  stakeholders: [{ name: '윤예린', team: '마케팅팀', helpWith: '쿠폰 예산 · 행사 노출' }],
  tools: [{ name: '주간 주문 현황 양식.xlsx', description: '매주 주문과 반품 기록' }],
  schedule: [{ cycle: '매일', task: '주문·배송 이상 확인', detail: '오전 10시 전 확인' }],
  accessAccounts: [{ tool: '운영 어드민', permission: '주문 조회·행사 설정', status: '사용 가능' }],
  firstWeekChecklist: ['진행 중인 행사 일정과 남은 요청 확인'],
  confirmedCriteria: [],
}

export const test = base.extend<{ stubbedBackend: void }>({
  stubbedBackend: [async ({ page }, use) => {
    // 테스트마다 초기화되는 첨부 목록. 업로드 화면이 빈 상태로 시작하지 않도록 하나를 미리 넣어 둔다.
    let reviewApproved = false
    const chatHistory: Array<{ id: string; question: string; answer: string | null; grounded: boolean; answerSource: string; citations: Array<{ sourceId: string; title: string; locator: string }>; createdAt: string }> = []
    const comments: Array<{ id: string; authorId: string; authorName: string; content: string; createdAt: string }> = []
    let files: Array<{ id: string; fileName: string; mimeType: string; size: number; status: string; remainingReviewCount?: number; createdAt: string }> = [{
      id: 'file-autumn-sale',
      fileName: '가을_할인전_준비_메모.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 2_400_000,
      status: 'INDEXED',
      createdAt: '2026-08-25T00:00:00Z',
    }]

    // 새로 올린 파일은 마스킹 검수 대기로 멈춘다. 이메일은 자동으로 가리고, 계좌번호는 사람이 확인해야 한다.
    const MASKING_TEXT = '담당자 이메일: min@example.com\n지급 계좌: 110-123-456789'
    type StubCandidate = { id: string; type: string; typeLabel: string; origin: string; startOffset: number; endOffset: number; confidencePercent: number; applied: boolean; needsReview: boolean; pendingReview: boolean; preview: string }
    const maskingReviews = new Map<string, { confirmed: boolean; candidates: StubCandidate[] }>()
    const newCandidates = (): StubCandidate[] => [
      { id: 'candidate-email', type: 'EMAIL', typeLabel: '이메일', origin: 'DETECTED', startOffset: MASKING_TEXT.indexOf('min@'), endOffset: MASKING_TEXT.indexOf('min@') + 'min@example.com'.length, confidencePercent: 98, applied: true, needsReview: false, pendingReview: false, preview: 'min***@example.com' },
      { id: 'candidate-account', type: 'ACCOUNT', typeLabel: '계좌번호', origin: 'DETECTED', startOffset: MASKING_TEXT.indexOf('110-'), endOffset: MASKING_TEXT.length, confidencePercent: 78, applied: false, needsReview: true, pendingReview: true, preview: '110-***-***789' },
    ]
    const summarize = (candidates: StubCandidate[]) => ({
      total: candidates.length,
      autoMasked: candidates.filter((item) => item.origin === 'DETECTED' && !item.needsReview).length,
      needsReview: candidates.filter((item) => item.needsReview).length,
      remaining: candidates.filter((item) => item.pendingReview).length,
      applied: candidates.filter((item) => item.applied).length,
    })

    // 초안은 저장할 때마다 revision이 오른다. baseRevision이 다르면 서버처럼 409로 거절한다.
    let draftContent: typeof DRAFT = structuredClone(DRAFT)
    let revision = 1
    const draftView = () => ({ content: draftContent, revision, updatedAt: '2026-09-11T00:00:00Z' })
    const revisionConflict = () => ({ status: 409, detail: '그사이 문서가 바뀌었습니다', code: 'AI_DRAFT_REVISION_CONFLICT' })

    // 준비도: 실행 절차·예외 대응·담당자가 부족한 75점 초안. 보완안을 적용한 영역은 충분이 된다.
    const READINESS_AREAS = [
      { area: 'SCOPE', label: '업무 범위', weight: 15, section: 'PURPOSE', sectionLabel: '업무 목적' },
      { area: 'PROCEDURE', label: '실행 절차', weight: 20, section: 'RECURRING_TASKS', sectionLabel: '반복 업무', status: 'PARTIAL', anchorText: '주간 주문 현황 정리' },
      { area: 'COMPLETION', label: '완료 기준', weight: 10, section: 'COMPLETION_CRITERIA', sectionLabel: '완료 기준' },
      { area: 'EXCEPTION', label: '예외 대응', weight: 15, section: 'RULES_AND_EXCEPTIONS', sectionLabel: '업무 기준과 예외', status: 'PARTIAL', anchorText: '쿠폰 할인율이 10%를 넘으면' },
      { area: 'SCHEDULE', label: '일정', weight: 10, section: 'SCHEDULE', sectionLabel: '업무 일정' },
      { area: 'CONTACTS', label: '담당자', weight: 10, section: 'STAKEHOLDERS', sectionLabel: '주요 관계자', status: 'CONFLICT' },
      { area: 'ACCESS', label: '접근 권한', weight: 10, section: 'ACCESS_ACCOUNTS', sectionLabel: '접근 권한과 계정' },
      { area: 'EVIDENCE', label: '근거와 최신성', weight: 10, section: 'TOOLS', sectionLabel: '사용 도구와 자료' },
    ]
    const STATUS = { SUFFICIENT: ['충분', 100], PARTIAL: ['일부 부족', 50], CONFLICT: ['충돌', 25], MISSING: ['누락', 0] } as const
    const SECTION_FIELDS: Record<string, keyof typeof DRAFT> = { PURPOSE: 'purpose', RECURRING_TASKS: 'recurringTasks', RULES_AND_EXCEPTIONS: 'rulesAndExceptions', STAKEHOLDERS: 'stakeholders' }
    const resolvedAreas = new Set<string>()
    let evaluatedRevision: number | null = null
    type StubFix = { fixId: string; area: string; status: string; baseRevision: number; appliedRevision: number | null; field: keyof typeof DRAFT; before: unknown; after: unknown }
    const fixes = new Map<string, StubFix>()
    const readinessView = () => {
      const areas = READINESS_AREAS.map((item) => {
        const status = (resolvedAreas.has(item.area) ? undefined : item.status) as keyof typeof STATUS | undefined ?? 'SUFFICIENT'
        const [statusLabel, percent] = STATUS[status]
        const view = {
          area: item.area, label: item.label, criteria: `${item.label}이 분명한가요?`, weight: item.weight, status, statusLabel, percent, keyIssue: false,
          section: item.section, sectionLabel: item.sectionLabel, anchorText: status === 'SUFFICIENT' ? null : item.anchorText ?? null,
          summary: status === 'SUFFICIENT' ? '' : `${item.label} 내용이 부족해요.`,
          resolution: status === 'SUFFICIENT' ? '' : `${item.sectionLabel}을 보완해 주세요.`,
          evidence: status === 'SUFFICIENT' ? [] : [{ sourceId: 'file-autumn-sale', fileName: '가을_할인전_준비_메모.docx', locator: '2쪽' }],
        }
        return { view, lost: item.weight * (100 - percent) / 100 }
      }).sort((left, right) => right.lost - left.lost)
      const keyIssues = areas.filter((item) => item.lost > 0).slice(0, 3)
      keyIssues.forEach((item) => { item.view.keyIssue = true })
      const score = Math.round(100 - areas.reduce((sum, item) => sum + item.lost, 0))
      return {
        evaluationId: `evaluation-${evaluatedRevision}`,
        rubricVersion: 'e2e-v1',
        score,
        potentialScore: Math.min(100, Math.round(score + keyIssues.reduce((sum, item) => sum + item.lost, 0))),
        grade: score >= 80 ? 'READY' : score >= 50 ? 'NEEDS_IMPROVEMENT' : 'NOT_READY',
        gradeLabel: score >= 80 ? '인수인계 가능' : score >= 50 ? '보완 필요' : '준비 부족',
        keyIssueCount: keyIssues.length,
        stale: evaluatedRevision !== revision,
        draftRevision: evaluatedRevision,
        evaluatedAt: '2026-09-17T00:00:00Z',
        areas: areas.map((item) => item.view),
      }
    }
    // 수정안은 대상 섹션 끝에 한 줄을 보탠다. 표에 없는 섹션은 예외 규칙으로 보완한다.
    const createFix = (area: string): StubFix => {
      const item = READINESS_AREAS.find((entry) => entry.area === area)!
      const field = SECTION_FIELDS[item.section] ?? 'rulesAndExceptions'
      const before = structuredClone(draftContent[field])
      const after = field === 'purpose' ? `${draftContent.purpose} 예외 상황도 함께 챙깁니다.`
        : field === 'rulesAndExceptions' ? [...draftContent.rulesAndExceptions, '환불 오류는 고객지원팀 윤예린님에게 넘깁니다.']
          : field === 'stakeholders' ? [...draftContent.stakeholders, { name: '윤예린', team: '고객지원팀', helpWith: '환불 오류' }]
            : [...draftContent.recurringTasks, { title: '주간 현황 공유', status: '매주 반복', description: '정리한 현황을 팀 채널에 올립니다.', nextAction: '화요일 오전 공유', schedule: '매주 화요일' }]
      return { fixId: `fix-${fixes.size + 1}`, area, status: 'PROPOSED', baseRevision: revision, appliedRevision: null, field, before, after }
    }
    const fixView = ({ field, ...fix }: StubFix) => {
      const item = READINESS_AREAS.find((entry) => entry.area === fix.area)!
      return {
        ...fix,
        areaLabel: item.label, section: item.section, sectionLabel: item.sectionLabel, sectionField: field,
        stale: fix.status === 'PROPOSED' && fix.baseRevision !== revision,
        changeSummary: `${item.sectionLabel}에 빠진 내용을 보탰어요.`,
        questions: [],
        evidence: [{ sourceId: 'file-autumn-sale', fileName: '가을_할인전_준비_메모.docx', locator: '2쪽' }],
        createdAt: '2026-09-17T00:00:00Z', updatedAt: '2026-09-17T00:00:00Z',
      }
    }

    const questions: Array<{ id: string; type: string; questionText: string; reason: string; options: Array<{ label: string; description: string }>; status: string; answer: string | null }> = [
      {
        id: 'question-priority',
        type: 'INTERVIEW',
        questionText: '가을 할인전에서 문제가 생기면 무엇을 가장 먼저 확인하나요?',
        reason: '자료에 여러 대응 방법이 있어 실제 기준을 확인하고 싶어요.',
        options: [
          { label: '주문·쿠폰 오류', description: '결제와 쿠폰 적용 상태부터 확인해요.' },
          { label: '재고·배송 지연', description: '판매 가능 수량과 배송 일정을 먼저 봐요.' },
        ],
        status: 'PENDING',
        answer: null,
      },
      {
        id: 'question-first-day',
        type: 'INTERVIEW',
        questionText: '업무를 받은 첫날 가장 먼저 해야 할 일은 무엇인가요?',
        reason: '첫날 할 일을 초안 맨 위에 배치할게요.',
        options: [
          { label: '전날 주문 확인', description: '주문 누락과 배송 지연 건을 먼저 확인해요.' },
          { label: '진행 중인 행사 확인', description: '행사 일정과 남은 요청을 먼저 살펴봐요.' },
        ],
        status: 'PENDING',
        answer: null,
      },
      {
        id: 'question-criteria',
        type: 'INTERVIEW',
        questionText: '자료에 적혀 있지 않은 중요한 판단 기준이 있나요?',
        reason: '본인만 알고 있던 기준을 남기면 다음 담당자가 추측하지 않아도 돼요.',
        options: [
          { label: '쿠폰 변경 전 팀장 확인', description: '할인율이나 예산을 바꾸기 전에 확인받아요.' },
        ],
        status: 'PENDING',
        answer: null,
      },
    ]

    await page.route('**/api/v1/**', async (route) => {
      const { pathname } = new URL(route.request().url())
      const method = route.request().method()
      const json = (body: unknown, status = 200) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

      if (pathname.endsWith('/auth/me')) {
        return route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json', 'set-cookie': 'XSRF-TOKEN=e2e-csrf-token; Path=/' },
          body: JSON.stringify(USER),
        })
      }
      if (pathname.endsWith('/auth/logout')) return route.fulfill({ status: 204, body: '' })
      if (pathname.endsWith('/members')) return json({ items: MEMBERS, hasNext: false })

      if (pathname.endsWith('/files')) {
        if (method === 'GET') return json(files)
        if (method === 'POST') {
          const fileName = /filename="([^"]+)"/.exec(route.request().postData() ?? '')?.[1] ?? '업로드파일.pdf'
          const id = `file-${files.length + 1}`
          files.push({ id, fileName, mimeType: 'application/pdf', size: 4, status: 'MASKING_REVIEW', remainingReviewCount: 1, createdAt: '2026-08-25T00:00:00Z' })
          maskingReviews.set(id, { confirmed: false, candidates: newCandidates() })
          return json({ sourceDocumentId: id, fileName, status: 'MASKING_REVIEW' }, 201)
        }
      }
      // 마스킹 검수. 검수 기록이 없는 파일(처음부터 있던 파일)은 빈 결과를 준다.
      const masking = /\/files\/([^/]+)\/masking(\/.*)?$/.exec(pathname)
      if (masking) {
        const file = files.find((item) => item.id === masking[1])
        if (!file) return json({ title: '파일을 찾을 수 없습니다', status: 404, detail: '파일을 찾을 수 없습니다', code: 'AI_SOURCE_DOCUMENT_NOT_FOUND' }, 404)
        const record = maskingReviews.get(file.id)
        const inReview = file.status === 'MASKING_REVIEW' && record && !record.confirmed
        const view = () => ({
          fileId: file.id,
          fileName: file.fileName,
          status: file.status,
          confirmed: record?.confirmed ?? false,
          text: inReview ? MASKING_TEXT : null,
          summary: summarize(record?.candidates ?? []),
          candidates: record?.candidates ?? [],
        })
        if (method === 'GET' && !masking[2]) return json(view())
        if (!inReview || !record) return json({ title: '검수 대기 상태가 아닙니다', status: 409, detail: '검수 대기 상태가 아닙니다', code: 'MASKING_NOT_IN_REVIEW' }, 409)
        const decided = /^\/candidates\/([^/]+)$/.exec(masking[2] ?? '')
        if (method === 'PATCH' && decided) {
          const candidate = record.candidates.find((item) => item.id === decided[1])
          if (!candidate) return json({ status: 404, detail: '없는 항목', code: 'MASKING_CANDIDATE_NOT_FOUND' }, 404)
          candidate.applied = (JSON.parse(route.request().postData() ?? '{}') as { applied?: boolean }).applied ?? candidate.applied
          candidate.pendingReview = false
          file.remainingReviewCount = summarize(record.candidates).remaining
          return json(candidate)
        }
        if (method === 'DELETE' && decided) {
          const candidate = record.candidates.find((item) => item.id === decided[1])
          if (!candidate) return json({ status: 404, detail: '없는 항목', code: 'MASKING_CANDIDATE_NOT_FOUND' }, 404)
          if (candidate.origin !== 'MANUAL') return json({ status: 409, detail: '자동으로 찾은 항목은 삭제할 수 없습니다', code: 'MASKING_CANDIDATE_NOT_DELETABLE' }, 409)
          record.candidates = record.candidates.filter((item) => item.id !== candidate.id)
          return route.fulfill({ status: 204, body: '' })
        }
        if (method === 'POST' && masking[2] === '/candidates') {
          const body = JSON.parse(route.request().postData() ?? '{}') as { startOffset: number; endOffset: number; type?: string }
          const picked = MASKING_TEXT.slice(body.startOffset, body.endOffset)
          if (body.startOffset >= body.endOffset || body.endOffset > MASKING_TEXT.length || !picked.trim()) {
            return json({ status: 400, detail: '문서 범위를 벗어났거나 빈 구간입니다', code: 'MASKING_INVALID_RANGE' }, 400)
          }
          if (record.candidates.some((item) => item.startOffset < body.endOffset && body.startOffset < item.endOffset)) {
            return json({ status: 409, detail: '이미 항목이 있는 구간과 겹칩니다', code: 'MASKING_RANGE_OVERLAP' }, 409)
          }
          const added: StubCandidate = { id: `candidate-manual-${record.candidates.length + 1}`, type: body.type ?? 'CUSTOM', typeLabel: '직접 마스킹', origin: 'MANUAL', startOffset: body.startOffset, endOffset: body.endOffset, confidencePercent: 100, applied: true, needsReview: false, pendingReview: false, preview: `${picked[0]}***` }
          record.candidates = [...record.candidates, added].sort((left, right) => left.startOffset - right.startOffset)
          return json(added, 201)
        }
        if (method === 'POST' && masking[2] === '/confirm') {
          const { remaining } = summarize(record.candidates)
          if (remaining > 0) return json({ status: 409, detail: `확인하지 않은 항목이 ${remaining}개 남아 있습니다`, code: 'MASKING_REVIEW_INCOMPLETE' }, 409)
          record.confirmed = true
          file.status = 'INDEXED'
          file.remainingReviewCount = 0
          return json(view())
        }
        return json({ status: 400, detail: '지원하지 않는 요청', code: 'BAD_REQUEST' }, 400)
      }
      // 준비도. 평가 전 조회는 404, 보완 적용은 baseRevision이 맞아야 한다.
      const readiness = /\/readiness(\/.*)?$/.exec(pathname)
      if (readiness) {
        const rest = readiness[1] ?? ''
        const notFound = (code: string) => json({ status: 404, detail: '찾을 수 없습니다', code }, 404)
        if (method === 'GET' && !rest) return evaluatedRevision === null ? notFound('READINESS_NOT_EVALUATED') : json(readinessView())
        if (method === 'POST' && rest === '/evaluate') {
          evaluatedRevision = revision
          return json(readinessView())
        }
        if (method === 'GET' && rest === '/rubric') {
          return json({
            version: 'e2e-v1',
            areas: READINESS_AREAS.map(({ area, label, weight, section }) => ({ area, label, criteria: `${label}이 분명한가요?`, weight, sections: [section] })),
            statusPercent: { SUFFICIENT: 100, PARTIAL: 50, CONFLICT: 25, MISSING: 0 },
            readyScore: 80,
            minimumScore: 50,
            keyIssueCount: 3,
          })
        }
        const created = /^\/items\/([^/]+)\/fixes$/.exec(rest)
        if (method === 'POST' && created) {
          if (evaluatedRevision === null) return notFound('READINESS_NOT_EVALUATED')
          if (evaluatedRevision !== revision) return json({ status: 409, detail: '평가 이후 문서가 바뀌었습니다', code: 'READINESS_STALE' }, 409)
          const area = readinessView().areas.find((item) => item.area === created[1])
          if (!area || area.status === 'SUFFICIENT') return json({ status: 409, detail: '이미 충분한 항목입니다', code: 'READINESS_ITEM_SUFFICIENT' }, 409)
          const fix = createFix(area.area)
          fixes.set(fix.fixId, fix)
          return json(fixView(fix), 201)
        }
        const action = /^\/fixes\/([^/]+)(\/answers|\/apply|\/discard)?$/.exec(rest)
        const fix = action ? fixes.get(action[1]) : undefined
        if (action && !fix) return notFound('READINESS_FIX_NOT_FOUND')
        if (fix && method === 'GET' && !action?.[2]) return json(fixView(fix))
        if (fix && fix.status !== 'PROPOSED') return json({ status: 409, detail: '이미 적용하거나 취소한 보완안입니다', code: 'READINESS_FIX_INVALID_STATE' }, 409)
        if (fix && action?.[2] === '/answers') return json(fixView(fix))
        if (fix && action?.[2] === '/discard') {
          fix.status = 'DISCARDED'
          return json(fixView(fix))
        }
        if (fix && action?.[2] === '/apply') {
          const body = JSON.parse(route.request().postData() ?? '{}') as { baseRevision?: number }
          if (body.baseRevision !== revision || fix.baseRevision !== revision) return json(revisionConflict(), 409)
          draftContent = { ...draftContent, [fix.field]: fix.after }
          revision += 1
          Object.assign(fix, { status: 'APPLIED', appliedRevision: revision })
          resolvedAreas.add(fix.area)
          evaluatedRevision = revision
          return json({ fix: fixView(fix), document: draftView(), readiness: readinessView() })
        }
        return json({ status: 400, detail: '지원하지 않는 요청', code: 'BAD_REQUEST' }, 400)
      }
      if (method === 'DELETE' && /\/files\/[^/]+$/.test(pathname)) {
        files = files.filter((file) => !pathname.endsWith(file.id))
        return route.fulfill({ status: 204, body: '' })
      }
      if (pathname.endsWith('/acknowledge') || pathname.endsWith('/complete')) {
        return json({ id: HANDOVER_ID, title: '프로모션 운영', status: 'COMPLETED', owner: OWNER, participants: PARTICIPANTS, workScopes: WORK_SCOPES, createdAt: '2026-08-25T00:00:00Z', updatedAt: '2026-09-11T00:00:00Z' })
      }
      if (pathname.endsWith('/chat/suggested-questions')) {
        return json(['첫날 가장 먼저 할 일은?', '배송 답변이 늦으면 누구에게 물어봐요?'])
      }
      if (pathname.endsWith('/chat/messages')) {
        if (method === 'GET') return json({ items: chatHistory, hasNext: false })
        const body = JSON.parse(route.request().postData() ?? '{}') as { question?: string }
        // 자료에 근거가 없으면 서버가 일반 지식으로 답한다. 답을 아예 못 만드는 NOT_FOUND는 드문 예외다.
        const grounded = /배송|늦/.test(body.question ?? '')
        const answerSource = grounded ? 'DOCUMENT' : (body.question ?? '').includes('오류') ? 'NOT_FOUND' : 'GENERAL_KNOWLEDGE'
        const answer = answerSource === 'DOCUMENT'
          ? '오늘 오후 3시까지 답이 없으면 물류팀에 공유하세요.'
          : answerSource === 'GENERAL_KNOWLEDGE'
            ? '자료에는 없지만, 보통은 담당 팀에 먼저 공유하고 기록을 남겨요.'
            : null
        const created = {
          id: `chat-${chatHistory.length + 1}`,
          question: body.question ?? '',
          answer,
          grounded,
          answerSource,
          citations: grounded ? [{ sourceId: 'source-1', title: '문제 상황 대응 방법', locator: '할 일 목록' }] : [],
          createdAt: '2026-09-11T06:10:00Z',
        }
        chatHistory.push(created)
        return json({ messageId: created.id, answer: created.answer, grounded, answerSource, citations: created.citations, fallbackContact: answerSource === 'NOT_FOUND' ? '이도현 팀장님께 문의해 주세요.' : undefined })
      }
      if (pathname.endsWith('/handovers/reviews')) {
        return json({
          items: [{
            id: HANDOVER_ID,
            title: '모아스토어 운영팀 업무 인수인계',
            status: reviewApproved ? 'APPROVED' : 'PENDING_REVIEW',
            owner: { id: 'user-choi-seoyun', name: '최서윤', team: '운영팀', position: '매니저' },
            workScopeSummary: '프로모션 운영',
            workScopeCount: 3,
            fileCount: 3,
            submittedAt: '2026-09-11T05:30:00Z',
            createdAt: '2026-08-25T00:00:00Z',
            updatedAt: '2026-09-11T00:00:00Z',
          }],
          hasNext: false,
        })
      }
      if (pathname.endsWith('/comments') && method === 'POST') {
        const body = JSON.parse(route.request().postData() ?? '{}') as { content?: string }
        const created = { id: `comment-${comments.length + 1}`, authorId: OWNER.id, authorName: '이도현', content: body.content ?? '', createdAt: '2026-09-11T06:00:00Z' }
        comments.push(created)
        return json(created, 201)
      }
      if (pathname.endsWith('/review/checklist')) return route.fulfill({ status: 200, body: '' })
      if (pathname.endsWith('/approve')) {
        reviewApproved = true
        return json({ id: HANDOVER_ID, title: '모아스토어 운영팀 업무 인수인계', status: 'APPROVED', owner: OWNER, participants: PARTICIPANTS, workScopes: WORK_SCOPES, createdAt: '2026-08-25T00:00:00Z', updatedAt: '2026-09-11T00:00:00Z' })
      }
      if (pathname.endsWith('/handovers/received')) {
        return json({
          items: [{
            id: HANDOVER_ID,
            title: '프로모션 운영',
            status: 'PENDING_REVIEW',
            owner: { id: 'user-choi-seoyun', name: '최서윤', team: '운영팀', position: '매니저' },
            workScopeSummary: '프로모션 운영 · 주문 관리 · 배송업체 협업',
            workScopeCount: 3,
            fileCount: 3,
            recipientCount: 1,
            receiptStatus: 'UNREAD',
            submittedAt: '2026-09-11T05:30:00Z',
            createdAt: '2026-08-25T00:00:00Z',
            updatedAt: '2026-09-11T00:00:00Z',
          }],
          hasNext: false,
          statusCounts: { UNREAD: 1, IN_PROGRESS: 0, COMPLETED: 0 },
        })
      }
      if (pathname.endsWith('/review')) {
        if (!pathname.includes(HANDOVER_ID)) return json({ detail: '없는 인수인계', status: 404 }, 404)
        return json({
          handoverId: HANDOVER_ID,
          status: reviewApproved ? 'APPROVED' : 'PENDING_REVIEW',
          document: draftView(),
          attachments: files,
          checklist: [{ id: 'check-1', label: '업무 목적과 완료 기준이 분명해요', checked: true }],
          comments,
        })
      }
      if (pathname.endsWith('/submit')) {
        return json({
          id: '00000000-0000-0000-0000-0000000000bb',
          title: '프로모션 운영',
          status: 'PENDING_REVIEW',
          owner: { id: USER.id, name: USER.name, team: USER.team, position: USER.position },
          participants: [{ userId: 'user-jung-haneul', name: '정하늘', team: '운영팀', position: '주임', role: 'RECIPIENT' }],
          workScopes: [{ id: 'scope-1', title: '프로모션 운영' }],
          createdAt: '2026-08-25T00:00:00Z',
          updatedAt: '2026-09-11T00:00:00Z',
        })
      }
      if (pathname.endsWith('/questions/complete')) return json({ content: DRAFT, updatedAt: '2026-09-11T00:00:00Z' })
      if (pathname.endsWith('/document')) {
        if (method === 'PATCH') {
          const body = JSON.parse(route.request().postData() ?? '{}') as { content?: typeof DRAFT; baseRevision?: number }
          if (body.baseRevision !== undefined && body.baseRevision !== revision) return json(revisionConflict(), 409)
          draftContent = { ...draftContent, ...body.content }
          revision += 1
        }
        return json(draftView())
      }
      if (/\/questions\/[^/]+\/answer$/.test(pathname)) {
        const questionId = pathname.split('/').at(-2)
        const body = JSON.parse(route.request().postData() ?? '{}') as { answer?: string; skipped?: boolean }
        const question = questions.find((item) => item.id === questionId)
        if (question) {
          question.status = body.skipped ? 'SKIPPED' : 'ANSWERED'
          question.answer = body.skipped ? null : body.answer ?? null
        }
        return route.fulfill({ status: 204, body: '' })
      }
      if (pathname.endsWith('/questions')) return json(questions)

      // 시작은 진행 중으로, 첫 폴링에서 완료로 넘긴다(폴링 경로까지 실제로 태우기 위함).
      if (pathname.endsWith('/analysis/retry')) {
        return json({ jobId: 'job-1', status: 'QUEUED', progress: 0, currentStep: '다시 분석하는 중', error: null, updatedAt: '2026-08-25T00:00:00Z' }, 202)
      }
      if (pathname.endsWith('/analysis')) {
        if (method === 'POST') {
          if (files.some((file) => file.status === 'MASKING_REVIEW')) {
            return json({ status: 409, detail: '마스킹 검수를 확정하지 않은 파일이 있습니다', code: 'MASKING_NOT_CONFIRMED' }, 409)
          }
          return json({ jobId: 'job-1', status: 'GENERATING_DRAFT', progress: 80, currentStep: '초안을 만드는 중', error: null, updatedAt: '2026-08-25T00:00:00Z' }, 202)
        }
        return json({ jobId: 'job-1', status: 'COMPLETED', progress: 100, currentStep: '초안 준비 완료', error: null, updatedAt: '2026-08-25T00:00:00Z' })
      }

      if (/\/handovers\/[^/]+$/.test(pathname) && method === 'GET') {
        if (!pathname.endsWith(HANDOVER_ID)) return json({ detail: '없는 인수인계', status: 404 }, 404)
        return json({
          id: HANDOVER_ID,
          title: '프로모션 운영',
          status: reviewApproved ? 'APPROVED' : 'EDITING',
          owner: { id: USER.id, name: USER.name, team: USER.team, position: USER.position },
          participants: [{ userId: 'user-jung-haneul', name: '정하늘', team: '운영팀', position: '주임', role: 'RECIPIENT' }],
          workScopes: [{ id: 'scope-1', title: '프로모션 운영' }],
          createdAt: '2026-08-25T00:00:00Z',
          updatedAt: '2026-09-11T00:00:00Z',
        })
      }
      if (pathname.endsWith('/handovers')) {
        return json({
          id: '00000000-0000-0000-0000-0000000000bb',
          title: '인수인계',
          status: 'DRAFT',
          owner: { id: USER.id, name: USER.name, team: USER.team, position: USER.position },
          participants: [{ userId: 'user-jung-haneul', name: '정하늘', team: '운영팀', position: '주임', role: 'RECIPIENT' }],
          workScopes: [],
          createdAt: '2026-08-25T00:00:00Z',
          updatedAt: '2026-08-25T00:00:00Z',
        }, 201)
      }
      return json({ detail: 'stub miss', status: 404 }, 404)
    })
    await use()
  }, { auto: true }],
})

export { expect } from '@playwright/test'
