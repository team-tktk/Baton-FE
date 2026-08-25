import { MockHandoverRepository } from '@/entities/handover'

export function getPrimaryHandover() {
  return new MockHandoverRepository().getHandover('handover-moastore-operations')
}

export function getReceivedHandovers() {
  return new MockHandoverRepository().listReceivedHandovers()
}
