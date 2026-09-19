import { useEffect } from 'react'

import styles from './SlackOAuthCallbackPage.module.css'

export function SlackOAuthCallbackPage() {
  const params = new URLSearchParams(window.location.search)
  const connected = params.get('connected') === 'true'

  useEffect(() => {
    if (!connected || !window.opener) return
    window.opener.postMessage({ type: 'BATON_SLACK_CONNECTED' }, window.location.origin)
    window.close()
  }, [connected])

  return (
    <main className={styles.main}>
      <section>
        <span aria-hidden="true">{connected ? '✓' : '!'}</span>
        <h1>{connected ? 'Slack 연결이 완료됐어요' : 'Slack 연결을 완료하지 못했어요'}</h1>
        <p>{connected ? '이 창은 자동으로 닫힙니다. 기존 화면에서 채널을 선택해 주세요.' : '창을 닫고 다시 연결해 주세요.'}</p>
        <button type="button" onClick={() => window.close()}>창 닫기</button>
      </section>
    </main>
  )
}
