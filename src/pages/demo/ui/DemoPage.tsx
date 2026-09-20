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
import { DemoContext, DemoDocumentActivityContext, type DemoDocumentActivity } from '@/shared/lib/demo'
import { Modal } from '@/shared/ui/modal'
import { DEMO_ID, DemoRepository, type DemoMilestone } from '../model/DemoRepository'
import { DemoGuidance } from './DemoGuidance'
import styles from './DemoPage.module.css'

const initialState = {
  ...createInitialCreateHandoverState(),
  recipientIds: ['user-jung-haneul'], reviewerIds: ['user-lee-dohyeon'],
  workItems: ['프로모션 운영 · 주문 관리 · 배송업체 협업'],
}

function stageGuideKey(pathname: string) {
  if (pathname.endsWith('/new/setup')) return 'setup'
  if (pathname.endsWith('/new/upload')) return 'upload'
  if (pathname.endsWith('/new/masking')) return 'masking'
  if (pathname.includes('/new/interview/')) return 'interview'
  if (pathname.endsWith('/new/document')) return 'document'
  return null
}

function DemoSession({ onRestart }: { onRestart: () => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [milestone, setMilestone] = useState<DemoMilestone>('writing')
  const [repository] = useState(() => new DemoRepository(next => setMilestone(current => {
    const order: DemoMilestone[] = ['writing', 'submitted', 'asked', 'approved']
    return order.indexOf(next) > order.indexOf(current) ? next : current
  })))
  const [welcomeSeen, setWelcomeSeen] = useState(false)
  const [seenRoles, setSeenRoles] = useState<number[]>([])
  const [seenGuides, setSeenGuides] = useState<string[]>([])
  const [showHelp, setShowHelp] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [documentActivity, setDocumentActivity] = useState<DemoDocumentActivity>('idle')
  const persona = pathname.includes('/reviews') ? 2 : pathname.includes('/new/') || pathname === '/demo' ? 0 : 1
  const phase = pathname.includes('/reviews') ? 2 : pathname.includes('/new/') || pathname === '/demo' ? 0 : 1
  const currentGuide = stageGuideKey(pathname)
  const dialog = !welcomeSeen ? 'welcome' : persona > 0 && !seenRoles.includes(persona) ? 'role' : showHelp ? 'help' : currentGuide && !seenGuides.includes(currentGuide) ? 'stage' : null
  const open = dialog !== null
  const identities = [
    { id: 'user-choi-seoyun', name: '최서윤', position: '매니저' },
    { id: 'user-jung-haneul', name: '정하늘', position: '주임' },
    { id: 'user-lee-dohyeon', name: '이도현', position: '팀장' },
  ]
  const closeGuide = () => {
    if (dialog === 'welcome') {
      setWelcomeSeen(true)
      if (currentGuide) setSeenGuides(current => [...new Set([...current, currentGuide])])
    }
    if (dialog === 'role') setSeenRoles(current => [...new Set([...current, persona])])
    if (dialog === 'stage' && currentGuide) setSeenGuides(current => [...new Set([...current, currentGuide])])
    setShowHelp(false)
  }
  const rolePaths = ['/demo/handovers/new/setup', '/demo/handovers/received', '/demo/reviews']
  const labels = ['작성', '받은 문서 · AI 질문', '팀장 승인']

  // A refresh creates a fresh session; never display an unrelated fixture as a completed demo.
  if (milestone === 'writing' && !pathname.includes('/new/') && pathname !== '/demo') return <Navigate to="/demo/handovers/new/setup" replace />

  return <DemoContext value={true}><HandoverRepositoryProvider repository={repository}>
    <AuthContext value={{ status: 'authenticated', sessionCheckFailed: false, user: { ...identities[persona], team: '운영팀', email: 'demo@example.com', createdAt: '2026-09-01' }, login: async () => {}, logout: async () => {} }}>
      <CreateHandoverProvider initialState={initialState}>
        <DemoDocumentActivityContext value={setDocumentActivity}>
        <div className={styles.demo}>
          <header className={styles.bar}>
            <div className={styles.identity}><strong>BATON <span>DEMO</span></strong><small>{identities[persona].name} 역할</small></div>
            <nav aria-label="데모 체험 순서">{labels.map((label, index) => <button type="button" key={label} aria-current={phase === index ? 'step' : undefined} disabled={index === 0 ? phase !== 0 : index === 1 ? milestone === 'writing' : milestone !== 'asked' && milestone !== 'approved'} onClick={() => navigate(rolePaths[index])}><b>{index + 1}</b>{label}</button>)}</nav>
            <div className={styles.tools}><button type="button" onClick={() => setShowHelp(true)}>도움말</button><button type="button" onClick={() => setExitOpen(true)}>종료</button></div>
          </header>
          {pathname !== '/demo' && milestone !== 'approved' && <DemoGuidance documentActivity={documentActivity} milestone={milestone} pathname={pathname} />}
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
        <Modal open={open} variant="guide" title={dialog === 'welcome' ? 'BATON 데모' : dialog === 'role' ? '역할 전환' : '이 단계에서 할 일'} onClose={closeGuide}>
          <div className={styles.guideContent}>
            {dialog === 'welcome' ? <>
              <h3 className={styles.welcomeTitle}>업무가 이어지는 과정을<br />직접 확인해 보세요</h3>
              <p className={styles.guideText}>샘플 자료로 문서를 만들고, 후임자의 질문과 팀장의 승인까지 경험합니다.</p>
              <ol className={styles.journey}>
                <li><span>1</span><strong>문서 만들기</strong><small>자료 수집부터 AI 보완까지</small></li>
                <li><span>2</span><strong>후임자 질문</strong><small>문서 근거로 필요한 정보 확인</small></li>
                <li><span>3</span><strong>팀장 승인</strong><small>체크리스트로 최종 검토</small></li>
              </ol>
              <p className={styles.demoNote}>준비된 예시를 사용하며 변경사항은 이번 체험에서만 유지됩니다.</p>
            </> : dialog === 'role' ? <div className={styles.roleTask}>
              <strong>{persona === 1 ? '후임자 정하늘님의 화면입니다' : '팀장 이도현님의 화면입니다'}</strong>
              <p>{persona === 1 ? '최서윤님이 보낸 문서를 후임자의 시선으로 읽고, AI에게 첫날 할 일을 질문해 보세요.' : '후임자가 질문까지 마친 인수인계서를 체크리스트로 검토하고 승인해 보세요.'}</p>
            </div> : <DemoGuidance detailed documentActivity={documentActivity} milestone={milestone} pathname={pathname} />}
            <footer className={styles.guideActions}>
              <button className={styles.primary} autoFocus onClick={() => {
                closeGuide()
                if (dialog === 'role') navigate(persona === 1 ? `/demo/handovers/${DEMO_ID}` : `/demo/reviews/${DEMO_ID}`)
              }}>{dialog === 'welcome' ? '체험 시작하기' : dialog === 'role' ? persona === 1 ? '받은 문서 열기' : '검토 시작하기' : dialog === 'stage' ? '화면에서 진행하기' : '계속 체험하기'}</button>
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
        </DemoDocumentActivityContext>
      </CreateHandoverProvider>
    </AuthContext>
  </HandoverRepositoryProvider></DemoContext>
}

export function DemoPage() {
  const [session, setSession] = useState(0)
  const navigate = useNavigate()
  return <DemoSession key={session} onRestart={() => { setSession(value => value + 1); navigate('/demo') }} />
}
