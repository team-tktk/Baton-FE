import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpHandoverRepository } from './HttpHandoverRepository'

function respondNoContent() {
  const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

afterEach(() => { vi.unstubAllGlobals() })

describe('HttpHandoverRepository question answers', () => {
  const repository = new HttpHandoverRepository()

  it('sends an ANSWERED status with the selected answer', async () => {
    const fetchSpy = respondNoContent()

    await repository.answerQuestion('handover-1', 'question-1', '김 과장')

    const [path, init] = fetchSpy.mock.calls[0]
    expect(path).toBe('/api/v1/handovers/handover-1/questions/question-1/answer')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(String(init?.body))).toEqual({ status: 'ANSWERED', answer: '김 과장' })
  })

  it('stores a skipped question as DEFERRED without an answer', async () => {
    const fetchSpy = respondNoContent()

    await repository.skipQuestion('handover-1', 'question-1')

    const [, init] = fetchSpy.mock.calls[0]
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(String(init?.body))).toEqual({ status: 'DEFERRED' })
  })
})
