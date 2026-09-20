import { useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { HandoverRepositoryProvider } from '@/entities/handover'
import { AuthContext } from '@/features/auth/model/AuthContext'
import { CreateHandoverProvider, createInitialCreateHandoverState } from '@/features/create-handover'
import { HandoverCreatePage } from '@/pages/handover-create'
import { HandoverInboxPage } from '@/pages/handover-inbox'
import { HandoverWorkspacePage, HandoverArrivalPage, HandoverOverviewPage, HandoverChatPage } from '@/pages/handover-detail'
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
  upload: ['준비된 자료를 추가해 주세요', '“준비된 샘플 파일 3개 추가”를 누르세요. 파일이 목록에 나타나면 “민감정보 확인하기”로 이동하세요. 샘플에는 실제 개인정보가 없어요.'],
  masking: ['자료를 확인하고 분석을 시작해요', '실제 서비스와 같은 민감정보 검수 화면이에요. 이번 샘플은 개인정보가 없는 자료이므로 아래 버튼으로 바로 분석을 시작할 수 있어요.'],
  interview: ['자료에 없는 판단 기준을 알려주세요', '질문마다 선택지를 고르고 다음으로 넘어가세요. 건너뛰기도 가능해요. 데모의 분석 결과는 준비된 예시이며 실제 AI를 호출하지 않아요.'],
  document: ['초안을 살펴보고 전달해 주세요', '작성된 문서를 수정하고 준비도 항목을 열어보세요. AI 보완도 체험할 수 있어요. 확인을 마치면 문서 하단에서 “제출하기”를 눌러주세요.'],
  complete: ['전달했어요. 이제 후임자가 되어볼까요?', '상단의 “② 받은 인수인계 · 질문”을 누르세요. 방금 전달한 문서가 받은 목록에 나타나요.'],
  received: ['정하늘님에게 도착한 인수인계예요', '목록에서 최서윤님의 인수인계를 열어보세요. 다음 화면에서 문서를 읽고 AI에게 궁금한 내용을 질문할 수 있어요.'],
  workspace: ['문서를 읽고 AI에게 질문해 보세요', '오른쪽 AI 패널에서 “첫날 가장 먼저 할 일은?”을 눌러보세요. 직접 질문을 입력할 수도 있어요. 답변을 확인한 후 상단의 “③ 팀장 승인”으로 넘어가세요.'],
  reviews: ['이도현 팀장님의 검토 차례예요', '검토할 인수인계를 열고 문서와 체크리스트를 확인하세요. 방금 작성하고 전달한 문서를 그대로 검토합니다.'],
  review: ['체크리스트를 확인하고 승인해 주세요', '오른쪽 체크리스트를 모두 체크하면 “인수인계 승인” 버튼이 활성화돼요. 검토 코멘트도 남길 수 있어요. 승인하면 모든 체험이 완료됩니다.'],
}

function guideKey(path: string) {
  if (path.includes('/new/')) return path.split('/new/')[1].split('/')[0]
  if (path.endsWith('/received')) return 'received'
  if (path.endsWith('/reviews')) return 'reviews'
  if (path.includes('/reviews/')) return 'review'
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
  const guide = pathname === '/demo' ? undefined : guides[key]
  const open = Boolean(guide && (!seen.includes(key) || showHelp))
  const role = pathname.includes('/reviews') ? 2 : pathname.includes('/new/') || pathname === '/demo' ? 0 : 1
  const identities = [
    { id: 'user-choi-seoyun', name: '최서윤', position: '매니저' },
    { id: 'user-jung-haneul', name: '정하늘', position: '주임' },
    { id: 'user-lee-dohyeon', name: '이도현', position: '팀장' },
  ]
  const closeGuide = () => { setSeen(current => [...new Set([...current, key])]); setShowHelp(false) }
  const rolePaths = ['/demo/handovers/new/setup', '/demo/handovers/received', '/demo/reviews']
  const labels = ['① 인수인계 하기', '② 받은 인수인계 · 질문', '③ 팀장 승인']

  // A refresh creates a fresh session; never display an unrelated fixture as a completed demo.
  if (milestone === 'writing' && !pathname.includes('/new/') && pathname !== '/demo') return <Navigate to="/demo/handovers/new/setup" replace />

  return <DemoContext value={true}><HandoverRepositoryProvider repository={repository}>
    <AuthContext value={{ status: 'authenticated', sessionCheckFailed: false, user: { ...identities[role], team: '운영팀', email: 'demo@example.com', createdAt: '2026-09-01' }, login: async () => {}, logout: async () => {} }}>
      <CreateHandoverProvider initialState={initialState}>
        <div className={styles.demo} inert={open || exitOpen}>
          <header className={styles.bar}>
            <div><strong>BATON <span>DEMO</span></strong><small>{identities[role].name} · {identities[role].position} 역할 체험 중</small></div>
            <nav aria-label="데모 체험 순서">{labels.map((label, index) => <button key={label} aria-current={role === index ? 'step' : undefined} disabled={index === 0 ? role !== 0 : index === 1 ? milestone === 'writing' : milestone !== 'asked' && milestone !== 'approved'} onClick={() => navigate(rolePaths[index])}>{label}</button>)}</nav>
            <div className={styles.tools}><button disabled={!guide} onClick={() => setShowHelp(true)}>안내 보기</button><button onClick={() => setExitOpen(true)}>체험 종료</button></div>
          </header>
          <p className={styles.notice}>가상 운영팀의 자료로 체험합니다. 변경사항은 이번 체험에서만 유지되며, 분석과 답변은 준비된 예시입니다.</p>
          {milestone === 'approved' && <section className={styles.success} role="status"><strong>작성부터 질문, 팀장 승인까지 모두 완료했어요!</strong><span>실제 서비스에서는 나의 자료와 팀원으로 시작할 수 있어요.</span><button onClick={onRestart}>처음부터 다시 체험</button><button onClick={() => navigate('/')}>홈으로</button></section>}
          <Routes>
            <Route index element={<Navigate to={milestone === 'writing' ? 'handovers/new/setup' : milestone === 'submitted' ? 'handovers/received' : 'reviews'} replace />} />
            <Route path="handovers/new/setup" element={<HandoverCreatePage step="setup" />} />
            <Route path="handovers/new/upload" element={<HandoverCreatePage step="upload" />} />
            <Route path="handovers/new/masking" element={<HandoverCreatePage step="masking" />} />
            <Route path="handovers/new/analyzing" element={<HandoverCreatePage step="analyzing" />} />
            <Route path="handovers/new/interview/:step" element={<HandoverCreatePage step="interview" />} />
            <Route path="handovers/new/document" element={<HandoverCreatePage step="document" />} />
            <Route path="handovers/new/complete" element={<HandoverCreatePage step="complete" />} />
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
