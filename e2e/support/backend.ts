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

export const test = base.extend<{ stubbedBackend: void }>({
  stubbedBackend: [async ({ page }, use) => {
    // 테스트마다 초기화되는 첨부 목록. 업로드 화면이 빈 상태로 시작하지 않도록 하나를 미리 넣어 둔다.
    let files = [{
      id: 'file-autumn-sale',
      fileName: '가을_할인전_준비_메모.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 2_400_000,
      status: 'INDEXED',
      createdAt: '2026-08-25T00:00:00Z',
    }]

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
          files.push({ id, fileName, mimeType: 'application/pdf', size: 4, status: 'INDEXED', createdAt: '2026-08-25T00:00:00Z' })
          return json({ sourceDocumentId: id, fileName, status: 'INDEXED' }, 201)
        }
      }
      if (method === 'DELETE' && /\/files\/[^/]+$/.test(pathname)) {
        files = files.filter((file) => !pathname.endsWith(file.id))
        return route.fulfill({ status: 204, body: '' })
      }
      if (pathname.endsWith('/questions/complete')) return json({ content: {}, updatedAt: '2026-08-25T00:00:00Z' })
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
          return json({ jobId: 'job-1', status: 'GENERATING_DRAFT', progress: 80, currentStep: '초안을 만드는 중', error: null, updatedAt: '2026-08-25T00:00:00Z' }, 202)
        }
        return json({ jobId: 'job-1', status: 'COMPLETED', progress: 100, currentStep: '초안 준비 완료', error: null, updatedAt: '2026-08-25T00:00:00Z' })
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
