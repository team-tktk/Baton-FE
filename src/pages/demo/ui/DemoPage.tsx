import { useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { HandoverRepositoryProvider } from '@/entities/handover'
import { AuthContext } from '@/features/auth/model/AuthContext'
import { CreateHandoverProvider, createInitialCreateHandoverState } from '@/features/create-handover'
import { HandoverCreatePage } from '@/pages/handover-create'
import { HandoverInboxPage } from '@/pages/handover-inbox'
import { HandoverWorkspacePage, HandoverArrivalPage, HandoverOverviewPage, HandoverChatPage } from '@/pages/handover-detail'
import { SentHandoverDetailPage, SentHandoverPage } from '@/pages/handover-sent'
import { ReviewInboxPage } from '@/pages/review-inbox'
import { ReviewDetailPage } from '@/pages/review-detail'
import { DemoContext } from '@/shared/lib/demo'
import { Modal } from '@/shared/ui/modal'
import { DemoRepository, type DemoMilestone } from '../model/DemoRepository'
import styles from './DemoPage.module.css'

const initialState = {
  ...createInitialCreateHandoverState(),
  recipientIds: ['user-jung-haneul'], reviewerIds: ['user-lee-dohyeon'],
  workItems: ['프로모션 운영 · 주문 관리 · 배송업체 협업'],
}

const guides: Record<string, [string, string]> = {
  setup: ['최서윤님의 업무를 넘겨볼까요?', '운영팀 최서윤님이 정하늘님에게 가을 할인전과 주문 관리 업무를 넘기는 상황이에요. 받는 사람과 팀장은 미리 선택해 두었어요. 아래의 “업무 자료 올리기”를 눌러 시작하세요.'],
  upload: ['업무 자료를 모아볼까요?', '“준비된 샘플 파일 3개 추가”를 눌러 주세요. 실제 화면처럼 웹 링크를 추가하거나 데모 Slack 채널을 선택해 볼 수도 있어요. 체험을 계속하려면 파일을 추가한 뒤 “민감정보 확인하기”로 이동하세요.'],
  masking: ['민감정보를 직접 검수해 보세요', '샘플에서 찾은 체험용 이메일을 “가리기”로 선택해 주세요. 확인이 끝나면 “확정하고 AI 분석 시작”을 눌러 가린 내용만 분석에 쓰는 흐름을 체험할 수 있어요.'],
  interview: ['자료에 없는 판단 기준을 알려주세요', '질문마다 선택지를 고르고 다음으로 넘어가세요. 건너뛰기도 가능해요. 데모의 분석 결과는 준비된 예시이며 실제 AI를 호출하지 않아요.'],
  document: ['AI 초안을 검토하고 보완해 보세요', '오른쪽 준비도에서 부족한 항목을 열고 “AI로 보완하기”를 눌러 보세요. 자료에 없는 기준을 질문으로 확인한 뒤 수정안을 만들고, 문서에 녹색으로 표시된 추가 내용을 골라 적용할 수 있어요. 확인을 마치면 문서 하단의 “제출하기”로 전달합니다.'],
  complete: ['전달이 끝났어요', '상단의 “② 전달 확인”으로 이동하면 인계자에게 보이는 실제 제출 목록과 최종 문서를 확인할 수 있어요.'],
  sent: ['내가 보낸 문서를 확인해 보세요', '방금 제출한 인수인계가 실제 “내가 만든 인수인계” 목록에 표시돼요. 항목을 눌러 수신자에게 전달된 최종 문서와 검토 상태를 확인하세요.'],
  sentDetail: ['전달된 최종 문서예요', '첨부 자료와 문서 내용을 확인한 뒤 상단의 “③ 받은 문서 · AI 질문”으로 역할을 바꿔 보세요. 이제 정하늘님의 화면을 체험합니다.'],
  received: ['정하늘님에게 도착한 인수인계예요', '목록에서 최서윤님의 인수인계를 열어보세요. 다음 화면에서 문서를 읽고 AI에게 궁금한 내용을 질문할 수 있어요.'],
  arrival: ['새 인수인계가 도착했어요', '첫 일정과 업무 맥락을 확인하고 “먼저 할 일 확인하기”로 들어가세요. 실제 수신자에게 보이는 도착 화면과 같습니다.'],
  overview: ['핵심부터 빠르게 파악해 보세요', '먼저 할 일과 업무 개요를 확인한 뒤 전체 문서 또는 AI 질문 화면으로 이동해 보세요.'],
  chat: ['문서를 근거로 AI에게 물어보세요', '추천 질문을 누르거나 직접 질문을 입력해 보세요. 답변에는 문서 근거가 함께 표시되고, 질문을 한 뒤 책임자 검토 단계가 열려요.'],
  workspace: ['문서를 읽고 AI에게 질문해 보세요', '오른쪽 AI 패널에서 “첫날 가장 먼저 할 일은?”을 눌러보세요. 직접 질문을 입력할 수도 있어요. 답변을 확인하면 상단의 “④ 팀장 승인”으로 넘어갈 수 있어요.'],
  reviews: ['이도현 팀장님의 검토 차례예요', '검토할 인수인계를 열고 문서와 체크리스트를 확인하세요. 방금 작성하고 전달한 문서를 그대로 검토합니다.'],
  review: ['체크리스트를 확인하고 승인해 주세요', '오른쪽 체크리스트를 모두 체크하면 “인수인계 승인” 버튼이 활성화돼요. 검토 코멘트도 남길 수 있어요. 승인하면 모든 체험이 완료됩니다.'],
}


function guideKey(path: string) {
  if (path.includes('/new/')) return path.split('/new/')[1].split('/')[0]
  if (path.endsWith('/handovers/sent')) return 'sent'
  if (path.includes('/handovers/sent/')) return 'sentDetail'
  if (path.endsWith('/received')) return 'received'
  if (path.endsWith('/reviews')) return 'reviews'
  if (path.includes('/reviews/')) return 'review'
  if (path.endsWith('/arrival')) return 'arrival'
  if (path.endsWith('/overview')) return 'overview'
  if (path.endsWith('/chat')) return 'chat'
  return 'workspace'
}

function DemoSession({ onRestart }: { onRestart: () => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [milestone, setMilestone] = useState<DemoMilestone>('writing')
  const [repository] = useState(() => new DemoRepository(next => setMilestone(current => {
    const order: DemoMilestone[] = ['writing', 'submitted', 'asked', 'approved']
    return order.indexOf(next) > order.indexOf(current) ? next : current
  })))
  const [seen, setSeen] = useState<string[]>([])
  const [showHelp, setShowHelp] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const key = guideKey(pathname)
  const persona = pathname.includes('/reviews') ? 2 : pathname.includes('/new/') || pathname.includes('/handovers/sent') || pathname === '/demo' ? 0 : 1
  const phase = pathname.includes('/reviews') ? 3 : pathname.includes('/handovers/sent') ? 1 : pathname.includes('/new/') || pathname === '/demo' ? 0 : 2
  const guide = pathname === '/demo' ? undefined : guides[key]
  const open = Boolean(guide && (!seen.includes(key) || showHelp))
  const identities = [
    { id: 'user-choi-seoyun', name: '최서윤', position: '매니저' },
    { id: 'user-jung-haneul', name: '정하늘', position: '주임' },
    { id: 'user-lee-dohyeon', name: '이도현', position: '팀장' },
  ]
  const closeGuide = () => { setSeen(current => [...new Set([...current, key])]); setShowHelp(false) }
  const rolePaths = ['/demo/handovers/new/setup', '/demo/handovers/sent', '/demo/handovers/received', '/demo/reviews']
  const labels = ['① 작성', '② 전달 확인', '③ 받은 문서 · AI 질문', '④ 팀장 승인']

  // A refresh creates a fresh session; never display an unrelated fixture as a completed demo.
  if (milestone === 'writing' && !pathname.includes('/new/') && pathname !== '/demo') return <Navigate to="/demo/handovers/new/setup" replace />

  return <DemoContext value={true}><HandoverRepositoryProvider repository={repository}>
    <AuthContext value={{ status: 'authenticated', sessionCheckFailed: false, user: { ...identities[persona], team: '운영팀', email: 'demo@example.com', createdAt: '2026-09-01' }, login: async () => {}, logout: async () => {} }}>
      <CreateHandoverProvider initialState={initialState}>
        <div className={styles.demo} inert={open || exitOpen}>
          <header className={styles.bar}>
            <div><strong>BATON <span>DEMO</span></strong><small>{identities[persona].name} · {identities[persona].position} 역할 체험 중</small></div>
            <nav aria-label="데모 체험 순서">{labels.map((label, index) => <button key={label} aria-current={phase === index ? 'step' : undefined} disabled={index === 0 ? phase !== 0 : index < 3 ? milestone === 'writing' : milestone !== 'asked' && milestone !== 'approved'} onClick={() => navigate(rolePaths[index])}>{label}</button>)}</nav>
            <div className={styles.tools}><button disabled={!guide} onClick={() => setShowHelp(true)}>안내 보기</button><button onClick={() => setExitOpen(true)}>체험 종료</button></div>
          </header>
          <p className={styles.notice}>가상 운영팀의 자료로 체험합니다. 변경사항은 이번 체험에서만 유지되며, 분석과 답변은 준비된 예시입니다.</p>
          {milestone === 'approved' && <section className={styles.success} role="status"><strong>작성부터 질문, 팀장 승인까지 모두 완료했어요!</strong><span>실제 서비스에서는 나의 자료와 팀원으로 시작할 수 있어요.</span><button onClick={onRestart}>처음부터 다시 체험</button><button onClick={() => navigate('/')}>홈으로</button></section>}
          <Routes>
            <Route index element={<Navigate to={milestone === 'writing' ? 'handovers/new/setup' : milestone === 'submitted' ? 'handovers/sent' : 'reviews'} replace />} />
            <Route path="handovers/new/setup" element={<HandoverCreatePage step="setup" />} />
            <Route path="handovers/new/upload" element={<HandoverCreatePage step="upload" />} />
            <Route path="handovers/new/masking" element={<HandoverCreatePage step="masking" />} />
            <Route path="handovers/new/analyzing" element={<HandoverCreatePage step="analyzing" />} />
            <Route path="handovers/new/interview/:step" element={<HandoverCreatePage step="interview" />} />
            <Route path="handovers/new/document" element={<HandoverCreatePage step="document" />} />
            <Route path="handovers/new/complete" element={<HandoverCreatePage step="complete" />} />
            <Route path="handovers/sent" element={<SentHandoverPage />} />
            <Route path="handovers/sent/:handoverId" element={<SentHandoverDetailPage />} />
            <Route path="handovers/received" element={<HandoverInboxPage />} />
            <Route path="handovers/:handoverId" element={<HandoverWorkspacePage />} />
            <Route path="handovers/:handoverId/arrival" element={<HandoverArrivalPage />} />
            <Route path="handovers/:handoverId/overview" element={<HandoverOverviewPage />} />
            <Route path="handovers/:handoverId/chat" element={<HandoverChatPage />} />
            <Route path="reviews" element={<ReviewInboxPage />} />
            <Route path="reviews/:handoverId" element={<ReviewDetailPage />} />
            <Route path="*" element={<Navigate to="/demo" replace />} />
          </Routes>
        </div>
        <Modal open={open} title={guide?.[0] ?? ''} onClose={closeGuide}>
          <div className={styles.guideContent}>
            <p className={styles.guideText}>{guide?.[1]}</p>
            <footer className={styles.guideActions}>
              <button className={styles.primary} autoFocus onClick={closeGuide}>직접 해보기</button>
            </footer>
          </div>
        </Modal>
        <Modal open={exitOpen} title="데모 체험을 종료할까요?" onClose={() => setExitOpen(false)}>
          <div className={styles.guideContent}>
            <p className={styles.guideText}>체험 중 작성한 내용은 사라져요. 실제 계정의 자료에는 영향을 주지 않아요.</p>
            <footer className={styles.guideActions}>
              <button className={styles.secondary} onClick={() => setExitOpen(false)}>계속 체험하기</button>
              <button className={styles.primary} onClick={() => navigate('/')}>홈으로 나가기</button>
            </footer>
          </div>
        </Modal>
      </CreateHandoverProvider>
    </AuthContext>
  </HandoverRepositoryProvider></DemoContext>
}

export function DemoPage() {
  const [session, setSession] = useState(0)
  const navigate = useNavigate()
  return <DemoSession key={session} onRestart={() => { setSession(value => value + 1); navigate('/demo') }} />
}
