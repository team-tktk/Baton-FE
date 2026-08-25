import { useEffect, useRef } from 'react'

import { ChatComposer, useHandoverChat } from '@/features/ask-handover-ai'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'

import styles from './HandoverWorkspacePages.module.css'

const suggestions = ['첫날 가장 먼저 할 일은?', '배송 답변이 늦으면 누구에게 물어봐요?']

export function HandoverAiPanel({ attachmentCount, handoverId, open, onClose }: { attachmentCount: number; handoverId: string; open: boolean; onClose: () => void }) {
  const { messages, send, status } = useHandoverChat(handoverId)
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, status])
  return <>
    {open && <button aria-label="AI 패널 배경 닫기" className={styles.aiScrim} type="button" onClick={onClose} />}
    <aside aria-hidden={!open} aria-labelledby="handover-ai-title" className={`${styles.aiPanel} ${open ? styles.aiPanelOpen : ''}`} inert={!open ? true : undefined} role="dialog">
      <header><div><small>인수인계 AI</small><h2 id="handover-ai-title">문서에 대해 물어보세요</h2></div><button aria-label="AI 질문 패널 닫기" type="button" onClick={onClose}>×</button></header>
      <div className={styles.aiSource}><Badge tone="green">자료 기반</Badge><span>인수인계서와 첨부 문서 {attachmentCount}개를 함께 찾아봐요.</span></div>
      <div aria-live="polite" className={styles.aiMessages}>{messages.map((message) => <article className={message.role === 'user' ? styles.aiMessageUser : styles.aiMessageAssistant} key={message.id}><p>{message.text}</p>{message.source && <small><Icon name="link" /> {message.source}</small>}</article>)}{status === 'sending' && <article className={styles.aiMessageAssistant}><p>자료에서 답을 찾고 있어요…</p></article>}{status === 'error' && <p className={styles.aiError}>답변을 불러오지 못했어요. 잠시 후 다시 질문해 주세요.</p>}<div ref={endRef} /></div>
      <div className={styles.aiQuestions}>{suggestions.map((suggestion) => <button disabled={status === 'sending'} key={suggestion} type="button" onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>
      <div className={styles.aiComposer}><ChatComposer pending={status === 'sending'} onSubmit={send} /></div>
    </aside>
  </>
}
