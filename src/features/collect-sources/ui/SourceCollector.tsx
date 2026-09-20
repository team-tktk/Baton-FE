import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { sourceApi } from '@/entities/source'
import type { SlackChannel, SlackConnection, SlackSubscription, SourceEvidence } from '@/entities/source'
import { ApiError } from '@/shared/api'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import slackLogo from '@/shared/assets/slack-logo.svg'

import styles from './SourceCollector.module.css'

interface SourceCollectorState {
  readyCount: number
  processing: boolean
}

interface SourceCollectorProps {
  handoverId: string
  onChange: (state: SourceCollectorState) => void
  onFeedback: (message: string) => void
}

const STATUS_LABEL = {
  EXTRACTING: '내용 읽는 중',
  MASKING_REVIEW: '민감정보 확인 필요',
  INDEXING: 'AI 자료 등록 중',
  INDEXED: '사용 준비 완료',
  FAILED: '처리 실패',
} as const

function message(caught: unknown, fallback: string) {
  return caught instanceof ApiError ? caught.message : fallback
}

export function SourceCollector({ handoverId, onChange, onFeedback }: SourceCollectorProps) {
  const [activePanel, setActivePanel] = useState<'web' | 'slack' | null>(null)
  const [sources, setSources] = useState<SourceEvidence[]>([])
  const [connections, setConnections] = useState<SlackConnection[]>([])
  const [connectionId, setConnectionId] = useState('')
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [subscriptions, setSubscriptions] = useState<SlackSubscription[]>([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const refreshSources = useCallback(async () => setSources(await sourceApi.listSources(handoverId)), [handoverId])
  const refreshSubscriptions = useCallback(async () => setSubscriptions(await sourceApi.listSlackSubscriptions(handoverId)), [handoverId])
  const refreshConnections = useCallback(async () => {
    const next = await sourceApi.listSlackConnections()
    setConnections(next)
    setConnectionId((current) => current && next.some((item) => item.connectionId === current)
      ? current
      : (next[0]?.connectionId ?? ''))
  }, [])

  useEffect(() => {
    const load = async () => Promise.all([refreshSources(), refreshConnections(), refreshSubscriptions()])
    void load().catch((caught) => onFeedback(message(caught, '연동 자료를 불러오지 못했어요')))
  }, [onFeedback, refreshConnections, refreshSources, refreshSubscriptions])

  useEffect(() => {
    if (!connectionId) return
    let ignore = false
    sourceApi.listSlackChannels(connectionId)
      .then((items) => { if (!ignore) setChannels(items) })
      .catch((caught) => { if (!ignore) onFeedback(message(caught, 'Slack 채널을 불러오지 못했어요')) })
    return () => { ignore = true }
  }, [connectionId, onFeedback])

  const externalSources = useMemo(() => sources.filter((source) => source.type !== 'FILE'), [sources])
  const processing = externalSources.some((source) => source.status === 'EXTRACTING' || source.status === 'INDEXING')
  const readyCount = externalSources.filter((source) => source.enabled && source.status === 'INDEXED').length

  useEffect(() => { onChange({ readyCount, processing }) }, [onChange, processing, readyCount])

  useEffect(() => {
    if (!processing) return
    const timer = window.setInterval(() => { void refreshSources() }, 2000)
    return () => window.clearInterval(timer)
  }, [processing, refreshSources])

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'BATON_SLACK_CONNECTED') return
      void refreshConnections().then(refreshSubscriptions).catch((caught) => onFeedback(message(caught, 'Slack 연결 정보를 갱신하지 못했어요')))
      onFeedback('Slack 워크스페이스를 연결했어요')
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [onFeedback, refreshConnections, refreshSubscriptions])

  const connectSlack = async () => {
    setBusy('connect')
    try {
      const { url: installUrl } = await sourceApi.getSlackInstallUrl()
      const popup = window.open(installUrl, 'baton-slack-oauth', 'popup=yes,width=720,height=760')
      if (!popup) onFeedback('팝업이 차단됐어요. 이 사이트의 팝업을 허용한 뒤 다시 시도해 주세요')
    } catch (caught) {
      onFeedback(message(caught, 'Slack 연결을 시작하지 못했어요'))
    } finally { setBusy(null) }
  }

  const addWebLink = async (event: FormEvent) => {
    event.preventDefault()
    if (!url.trim()) return
    setBusy('web')
    try {
      await sourceApi.createWebLink(handoverId, {
        url: url.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      })
      setUrl('')
      setTitle('')
      setDescription('')
      await refreshSources()
      onFeedback('웹 링크를 AI 자료에 추가했어요')
    } catch (caught) {
      onFeedback(message(caught, '웹 링크를 추가하지 못했어요'))
    } finally { setBusy(null) }
  }

  const removeSource = async (source: SourceEvidence) => {
    setBusy(source.sourceId)
    try {
      await sourceApi.deleteSource(handoverId, source.sourceId)
      await refreshSources()
    } catch (caught) {
      onFeedback(message(caught, '자료를 삭제하지 못했어요'))
    } finally { setBusy(null) }
  }

  const retrySource = async (source: SourceEvidence) => {
    setBusy(source.sourceId)
    try {
      await sourceApi.retrySource(handoverId, source.sourceId)
      await refreshSources()
    } catch (caught) {
      onFeedback(message(caught, '자료를 다시 처리하지 못했어요'))
    } finally { setBusy(null) }
  }

  const activeSubscriptions = subscriptions.filter((item) => item.enabled)
  const webLinkCount = externalSources.filter((source) => source.type === 'WEB_LINK').length
  const toggleChannel = async (channel: SlackChannel) => {
    const existing = activeSubscriptions.find((item) => item.connectionId === connectionId && item.channelId === channel.id)
    setBusy(`channel-${channel.id}`)
    try {
      if (existing) await sourceApi.unsubscribeSlackChannel(existing)
      else await sourceApi.subscribeSlackChannel(connectionId, handoverId, channel)
      await Promise.all([refreshSubscriptions(), refreshSources()])
      onFeedback(existing ? `#${channel.name} 자동 수집을 중지했어요` : `#${channel.name}의 이전 대화와 새 메시지를 수집해요`)
    } catch (caught) {
      onFeedback(message(caught, 'Slack 채널 설정을 바꾸지 못했어요'))
    } finally { setBusy(null) }
  }

  return (
    <section className={styles.collector} aria-label="외부 업무 자료">
      <header className={styles.collectorHeader}>
        <div><span className={styles.eyebrow}>선택 사항</span><h2>다른 자료도 연결할 수 있어요</h2><p>웹페이지나 Slack 대화가 업무 이해에 필요할 때 추가하세요.</p></div>
      </header>

      <div className={styles.tabs} aria-label="추가 자료 종류">
        <button aria-expanded={activePanel === 'web'} className={activePanel === 'web' ? styles.activeTab : ''} type="button" onClick={() => setActivePanel((current) => current === 'web' ? null : 'web')}>
          <span className={styles.icon}><Icon name="link" /></span>
          <span><strong>웹 링크</strong><small>문서·대시보드·가이드</small></span>
          {webLinkCount > 0 && <em>{webLinkCount}</em>}
        </button>
        <button aria-expanded={activePanel === 'slack'} className={activePanel === 'slack' ? styles.activeTab : ''} type="button" onClick={() => setActivePanel((current) => current === 'slack' ? null : 'slack')}>
          <span className={`${styles.icon} ${styles.slackIcon}`}><img alt="" src={slackLogo} /></span>
          <span><strong>Slack 대화</strong><small>채널의 이전·새 메시지</small></span>
          {activeSubscriptions.length > 0 && <em>{activeSubscriptions.length}</em>}
        </button>
      </div>

      {activePanel === 'web' && <div className={styles.panel}>
        <header><div><h3>웹 링크 추가</h3><p>공개 페이지는 자동으로 읽어요. 로그인 링크라면 설명도 함께 적어주세요.</p></div></header>
        <form className={styles.webForm} onSubmit={(event) => void addWebLink(event)}>
          <label><span>URL</span><input required type="url" value={url} placeholder="https://..." onChange={(event) => setUrl(event.target.value)} /></label>
          <label><span>제목 <small>선택</small></span><input value={title} placeholder="예: 운영 대시보드" onChange={(event) => setTitle(event.target.value)} /></label>
          <label className={styles.description}><span>설명 <small>로그인이 필요한 링크는 필수</small></span><textarea value={description} placeholder="AI가 참고할 핵심 내용을 적어주세요." onChange={(event) => setDescription(event.target.value)} /></label>
          <Button disabled={busy === 'web' || !url.trim()} type="submit">{busy === 'web' ? '추가하는 중…' : '링크 추가'}</Button>
        </form>
        {externalSources.filter((source) => source.type === 'WEB_LINK').length > 0 && (
          <div className={styles.sourceList}>
            {externalSources.filter((source) => source.type === 'WEB_LINK').map((source) => (
              <article key={source.sourceId}>
                <Icon name="link" />
                <p><strong>{source.title}</strong><small>{source.accessPath}</small></p>
                <Badge tone={source.status === 'INDEXED' ? 'green' : source.status === 'FAILED' ? 'neutral' : 'yellow'}>{STATUS_LABEL[source.status]}</Badge>
                {source.status === 'FAILED' && <button type="button" onClick={() => void retrySource(source)}>재시도</button>}
                <button aria-label={`${source.title} 삭제`} disabled={busy === source.sourceId} type="button" onClick={() => void removeSource(source)}>×</button>
              </article>
            ))}
          </div>
        )}
      </div>}

      {activePanel === 'slack' && <div className={styles.panel}>
        <header><div><h3>Slack 채널 연결</h3><p>내가 볼 수 있는 채널을 선택하면 이전 대화와 이후 메시지를 계속 가져와요.</p></div></header>
        {connections.length === 0 ? (
          <div className={styles.connect}><p>Slack에 로그인해 워크스페이스를 연결해 주세요. 봇을 채널에 초대할 필요가 없어요.</p><Button disabled={busy === 'connect'} onClick={() => void connectSlack()}>{busy === 'connect' ? '연결하는 중…' : 'Slack으로 연결'}</Button></div>
        ) : (
          <>
            <div className={styles.workspaceRow}>
              <label><span>워크스페이스</span><select value={connectionId} onChange={(event) => setConnectionId(event.target.value)}>{connections.map((item) => <option key={item.connectionId} value={item.connectionId}>{item.teamName}</option>)}</select></label>
              <button type="button" onClick={() => void connectSlack()}>다른 워크스페이스 연결</button>
            </div>
            <div className={styles.channels}>
              {channels.map((channel) => {
                const subscription = activeSubscriptions.find((item) => item.connectionId === connectionId && item.channelId === channel.id)
                return (
                  <label key={channel.id}>
                    <input checked={Boolean(subscription)} disabled={busy === `channel-${channel.id}`} type="checkbox" onChange={() => void toggleChannel(channel)} />
                    <span><strong>#{channel.name}</strong><small>{channel.privateChannel ? '비공개 채널' : '공개 채널'}{subscription ? ` · ${subscription.importedMessageCount}개 수집` : ''}</small></span>
                    {subscription && <Badge tone="green">자동 수집 중</Badge>}
                  </label>
                )
              })}
              {channels.length === 0 && <p className={styles.empty}>이 계정에서 볼 수 있는 채널이 없어요.</p>}
            </div>
          </>
        )}
      </div>}
    </section>
  )
}
