import { type RefObject, useEffect, useRef } from 'react'

import { AnswerText, ChatComposer, useHandoverChat } from '@/features/ask-handover-ai'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'

import styles from './HandoverWorkspacePages.module.css'


/**
 * 문서 옆에 붙는 AI 패널. 접어도 화면에서 빠질 뿐 모달이 아니라서 dialog가 아니다.
 * 닫을 때 언마운트하지 않는 이유는 대화와 추천 질문을 그대로 두기 위해서다.
 */
export function HandoverAiPanel({ folded, handoverId, onClose, panelRef }: {
  folded?: boolean
  handoverId: string
  onClose: () => void
  panelRef?: RefObject<HTMLElement | null>
}) {
  const { messages, send, status, suggestions } = useHandoverChat(handoverId)
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { if (!folded) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [folded, messages, status])

  // 접혀 있는 동안에도 DOM에는 남는다. 애니메이션을 위해서이고, inert로 접근성 트리와 포커스에서 뺀다.
  return <aside aria-labelledby="handover-ai-title" className={`${styles.aiPanel} ${folded ? styles.aiPanelFolded : ''}`.trim()} inert={folded ? true : undefined} ref={panelRef} tabIndex={-1}>
    <header><div><small>인수인계 AI</small><h2 id="handover-ai-title">문서에 대해 물어보세요</h2></div><div className={styles.aiHeaderTools}><Badge tone="green">자료 기반</Badge><button aria-label="AI 질문 패널 접기" type="button" onClick={onClose}>×</button></div></header>
    <div aria-live="polite" className={styles.aiMessages}>{messages.map((message) => <article className={message.role === 'user' ? styles.aiMessageUser : styles.aiMessageAssistant} key={message.id}><p><AnswerText text={message.text} /></p>{message.citations?.map((citation) => <small key={citation.sourceId}><Icon name="link" /> {[citation.title, citation.locator].filter(Boolean).join(' · ')}</small>)}</article>)}{status === 'sending' && <article className={styles.aiMessageAssistant}><p>자료에서 답을 찾고 있어요…</p></article>}{status === 'error' && <p className={styles.aiError}>답변을 불러오지 못했어요. 잠시 후 다시 질문해 주세요.</p>}<div ref={endRef} /></div>
    <div className={styles.aiQuestions}>{suggestions.map((suggestion) => <button disabled={status === 'sending'} key={suggestion} type="button" onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>
    <div className={styles.aiComposer}><ChatComposer pending={status === 'sending'} onSubmit={send} /></div>
  </aside>
}
