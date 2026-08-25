import { useEffect, useRef } from 'react'

import { ChatComposer, useHandoverChat } from '@/features/ask-handover-ai'
import { Icon } from '@/shared/ui/icon'

import styles from './HandoverChat.module.css'

const suggestions = ['첫날 무엇부터 확인하면 되나요?', '12% 쿠폰을 제안한 이유가 뭔가요?', '배송이 늦어지면 누구에게 알려야 하나요?']

export function HandoverChat({ handoverId }: { handoverId: string }) {
  const { messages, send, status } = useHandoverChat(handoverId)
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, status])
  return <section className={styles.chat}>
    <header><span><Icon name="spark" /></span><div><strong>인수인계 AI</strong><small>업로드된 자료를 바탕으로 답해요</small></div></header>
    <div className={styles.messages} aria-live="polite">{messages.map((message) => <article className={message.role === 'user' ? styles.user : styles.assistant} key={message.id}><p>{message.text}</p>{message.source && <span><Icon name="link" /> {message.source}</span>}</article>)}{status === 'sending' && <article className={styles.assistant}><p className={styles.typing}>자료에서 답을 찾고 있어요…</p></article>}{status === 'error' && <p className={styles.error}>답변을 불러오지 못했어요. 잠시 후 다시 질문해 주세요.</p>}<div ref={endRef} /></div>
    <div className={styles.suggestions}>{suggestions.map((suggestion) => <button disabled={status === 'sending'} key={suggestion} type="button" onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>
    <ChatComposer pending={status === 'sending'} onSubmit={send} />
  </section>
}
