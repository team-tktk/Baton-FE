export type SourceType = 'FILE' | 'WEB_LINK' | 'SLACK_MESSAGE'
export type SourceStatus = 'EXTRACTING' | 'MASKING_REVIEW' | 'INDEXING' | 'INDEXED' | 'FAILED'

export interface SourceEvidence {
  sourceId: string
  type: SourceType
  title: string
  locator: string | null
  updatedAt: string
  accessPath: string | null
  description: string | null
  conversationName: string | null
  occurredAt: string | null
  enabled: boolean
  status: SourceStatus
}

export interface SlackConnection {
  connectionId: string
  teamId: string
  teamName: string
  slackUserId: string
  scopes: string[]
  connectedAt: string
}

export interface SlackChannel {
  id: string
  name: string
  privateChannel: boolean
  member: boolean
}

export interface SlackSubscription {
  subscriptionId: string
  handoverId: string
  connectionId: string
  channelId: string
  channelName: string
  enabled: boolean
  backfillComplete: boolean
  importedMessageCount: number
  lastSyncedAt: string
}

export interface CreateWebLinkInput {
  url: string
  title?: string
  description?: string
  enabled?: boolean
}
