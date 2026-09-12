import { useEffect, useRef } from 'react'

import { AnswerText, ChatComposer, useHandoverChat } from '@/features/ask-handover-ai'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'

import styles from './HandoverWorkspacePages.module.css'


/** 문서 옆에 늘 붙어 있는 AI 패널. 여닫는 장치가 없어 dialog가 아니라 일반 보조 영역이다. */
export function HandoverAiPanel({ handoverId }: { handoverId: string }) {
  const { messages, send, status, suggestions } = useHandoverChat(handoverId)
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, status])

  return <aside aria-labelledby="handover-ai-title" className={styles.aiPanel}>
    <header><div><small>인수인계 AI</small><h2 id="handover-ai-title">문서에 대해 물어보세요</h2></div><Badge tone="green">자료 기반</Badge></header>
    <div aria-live="polite" className={styles.aiMessages}>{messages.map((message) => <article className={message.role === 'user' ? styles.aiMessageUser : styles.aiMessageAssistant} key={message.id}><p><AnswerText text={message.text} /></p>{message.citations?.map((citation) => <small key={citation.sourceId}><Icon name="link" /> {[citation.title, citation.locator].filter(Boolean).join(' · ')}</small>)}</article>)}{status === 'sending' && <article className={styles.aiMessageAssistant}><p>자료에서 답을 찾고 있어요…</p></article>}{status === 'error' && <p className={styles.aiError}>답변을 불러오지 못했어요. 잠시 후 다시 질문해 주세요.</p>}<div ref={endRef} /></div>
    <div className={styles.aiQuestions}>{suggestions.map((suggestion) => <button disabled={status === 'sending'} key={suggestion} type="button" onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>
    <div className={styles.aiComposer}><ChatComposer pending={status === 'sending'} onSubmit={send} /></div>
  </aside>
}
