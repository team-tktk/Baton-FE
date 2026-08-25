import { useState, type KeyboardEvent } from 'react'

import { Icon } from '@/shared/ui/icon'

import styles from './ChatComposer.module.css'

interface ChatComposerProps {
  pending: boolean
  onSubmit: (question: string) => Promise<boolean> | boolean
}

export function ChatComposer({ pending, onSubmit }: ChatComposerProps) {
  const [value, setValue] = useState('')
  const submit = async () => {
    const question = value.trim()
    if (!question || pending) return
    setValue('')
    await onSubmit(question)
  }
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit() }
  }
  return <div className={styles.composer}><textarea aria-label="AI에게 질문" placeholder="궁금한 업무 내용을 물어보세요" rows={2} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={keyDown} /><button aria-label="질문 보내기" disabled={pending || !value.trim()} type="button" onClick={() => void submit()}><Icon name="send" /></button></div>
}
