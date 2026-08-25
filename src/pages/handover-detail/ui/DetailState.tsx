import { Button } from '@/shared/ui/button'
import styles from './HandoverEntryPages.module.css'

export function DetailState({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return <main className={styles.state}>{error ? <><strong>{error}</strong><Button onClick={onRetry}>다시 시도</Button></> : <span>인수인계를 불러오고 있어요…</span>}</main>
}
