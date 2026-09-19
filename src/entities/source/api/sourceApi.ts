import { apiRequest } from '@/shared/api'

import type { CreateWebLinkInput, SlackChannel, SlackConnection, SlackSubscription, SourceEvidence } from '../model/types'

const handoverPath = (handoverId: string) => `/api/v1/handovers/${handoverId}`

export const sourceApi = {
  listSources: (handoverId: string) => apiRequest<SourceEvidence[]>(`${handoverPath(handoverId)}/sources`),

  createWebLink: (handoverId: string, input: CreateWebLinkInput) => apiRequest<SourceEvidence>(
    `${handoverPath(handoverId)}/sources/web-links`,
    { method: 'POST', body: JSON.stringify(input) },
  ),

  deleteSource: (handoverId: string, sourceId: string) => apiRequest<void>(
    `${handoverPath(handoverId)}/sources/${sourceId}`,
    { method: 'DELETE' },
  ),

  retrySource: (handoverId: string, sourceId: string) => apiRequest<SourceEvidence>(
    `${handoverPath(handoverId)}/sources/${sourceId}/retry`,
    { method: 'POST' },
  ),

  getSlackInstallUrl: () => apiRequest<{ url: string }>('/api/v1/integrations/slack/install-url'),
  listSlackConnections: () => apiRequest<SlackConnection[]>('/api/v1/integrations/slack/connections'),
  listSlackChannels: (connectionId: string) => apiRequest<SlackChannel[]>(`/api/v1/integrations/slack/${connectionId}/channels`),
  listSlackSubscriptions: (handoverId: string) => apiRequest<SlackSubscription[]>(`/api/v1/integrations/slack/subscriptions?handoverId=${encodeURIComponent(handoverId)}`),
  subscribeSlackChannel: (connectionId: string, handoverId: string, channel: SlackChannel) => apiRequest<SlackSubscription>(
    `/api/v1/integrations/slack/${connectionId}/subscriptions`,
    { method: 'POST', body: JSON.stringify({ handoverId, channelId: channel.id, channelName: channel.name }) },
  ),
  unsubscribeSlackChannel: (subscription: SlackSubscription) => apiRequest<void>(
    `/api/v1/integrations/slack/${subscription.connectionId}/subscriptions/${subscription.subscriptionId}?handoverId=${encodeURIComponent(subscription.handoverId)}`,
    { method: 'DELETE' },
  ),
}
