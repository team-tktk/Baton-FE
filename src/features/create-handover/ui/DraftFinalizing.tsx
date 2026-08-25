import styles from './DraftFinalizing.module.css'

/** 답변을 반영해 서버가 초안을 다시 만드는 동안 보여 준다. 몇 초 걸린다. */
export function DraftFinalizing({ answered }: { answered: number }) {
  return (
    <section aria-live="polite" className={styles.finalizing} role="status">
      <span className={styles.badge}><i />답변 {answered}개 반영 중</span>
      <h1>답변을 담아<br />초안을 다시 만들고 있어요</h1>
      <p>확인해 주신 내용을 문서에 반영하고 있어요. 잠시만 기다려 주세요.</p>
      <div className={styles.bar}><i /></div>
    </section>
  )
}
