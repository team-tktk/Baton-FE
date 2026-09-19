import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api'

import { HttpHandoverRepository } from './HttpHandoverRepository'

const BASE = '/api/v1/handovers/handover-1/files/file-1/masking'

const candidate = {
  id: 'candidate-1',
  type: 'PHONE',
  typeLabel: '전화번호',
  origin: 'DETECTED',
  startOffset: 4,
  endOffset: 17,
  confidencePercent: 78,
  applied: false,
  needsReview: true,
  pendingReview: false,
  preview: '010-****-1234',
}

const review = {
  fileId: 'file-1',
  fileName: '업무협약서.docx',
  status: 'MASKING_REVIEW',
  confirmed: false,
  text: '연락처 010-1234-1234',
  summary: { total: 1, autoMasked: 0, needsReview: 1, remaining: 1, applied: 0 },
  candidates: [{ ...candidate, pendingReview: true }],
}

function respond(body: unknown, status = 200) {
  const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(status === 204
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status }))
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

afterEach(() => { vi.unstubAllGlobals() })

describe('HttpHandoverRepository masking', () => {
  const repository = new HttpHandoverRepository()

  it('loads the review screen of a file', async () => {
    const fetchSpy = respond(review)

    await expect(repository.getMaskingReview('handover-1', 'file-1')).resolves.toMatchObject({
      status: 'review',
      text: '연락처 010-1234-1234',
      summary: { remaining: 1 },
      candidates: [{ id: 'candidate-1', start: 4, end: 17, pendingReview: true }],
    })
    expect(fetchSpy.mock.calls[0][0]).toBe(BASE)
  })

  it('sends only the applied flag when a candidate is toggled', async () => {
    const fetchSpy = respond(candidate)

    await expect(repository.decideMaskingCandidate('handover-1', 'file-1', 'candidate-1', false)).resolves.toMatchObject({ applied: false, pendingReview: false })
    const [path, init] = fetchSpy.mock.calls[0]
    expect(path).toBe(`${BASE}/candidates/candidate-1`)
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({ applied: false })
  })

  it('adds a manual range with server offsets', async () => {
    const fetchSpy = respond({ ...candidate, id: 'manual-1', origin: 'MANUAL', type: 'CUSTOM' }, 201)

    await expect(repository.addMaskingCandidate('handover-1', 'file-1', { start: 0, end: 3 })).resolves.toMatchObject({ id: 'manual-1', origin: 'manual' })
    const [path, init] = fetchSpy.mock.calls[0]
    expect(path).toBe(`${BASE}/candidates`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ startOffset: 0, endOffset: 3 })
  })

  it('removes a manual range', async () => {
    const fetchSpy = respond(null, 204)

    await expect(repository.removeMaskingCandidate('handover-1', 'file-1', 'manual-1')).resolves.toBeUndefined()
    expect(fetchSpy.mock.calls[0][0]).toBe(`${BASE}/candidates/manual-1`)
    expect(fetchSpy.mock.calls[0][1]?.method).toBe('DELETE')
  })

  it('lists enabled web links and Slack messages as reviewable sources', async () => {
    const fetchSpy = respond([
      { sourceId: 'file-1', type: 'FILE', title: '업무협약서.docx', status: 'MASKING_REVIEW', enabled: true },
      { sourceId: 'web-1', type: 'WEB_LINK', title: '정산 위키', accessPath: 'https://wiki.example.com', status: 'MASKING_REVIEW', enabled: true },
      { sourceId: 'slack-1', type: 'SLACK_MESSAGE', title: '', conversationName: '#운영팀', status: 'EXTRACTING', enabled: true },
      { sourceId: 'web-2', type: 'WEB_LINK', title: '끈 링크', status: 'MASKING_REVIEW', enabled: false },
    ])

    await expect(repository.listExternalSources('handover-1')).resolves.toEqual([
      { id: 'web-1', name: '정산 위키', mimeType: '', size: 0, status: 'review', origin: 'web-link', detail: 'https://wiki.example.com' },
      { id: 'slack-1', name: 'Slack 메시지', mimeType: '', size: 0, status: 'processing', origin: 'slack', detail: '#운영팀' },
    ])
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/v1/handovers/handover-1/sources')
  })

  it('follows a running analysis but does not mistake unconfirmed masking for it', async () => {
    const problem = (code: string) => new Response(JSON.stringify({ status: 409, detail: code, code }), { headers: { 'Content-Type': 'application/json' }, status: 409 })
    const job = new Response(JSON.stringify({ jobId: 'job-1', status: 'PARSING', progress: 20, currentStep: '자료 읽는 중', updatedAt: '2026-09-17T00:00:00Z' }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
    const running = vi.fn<typeof fetch>().mockResolvedValueOnce(problem('AI_ANALYSIS_ALREADY_RUNNING')).mockResolvedValueOnce(job)
    vi.stubGlobal('fetch', running)
    await expect(repository.startAnalysis('handover-1')).resolves.toMatchObject({ status: 'running', progress: 20 })

    const masking = vi.fn<typeof fetch>().mockResolvedValue(problem('MASKING_NOT_CONFIRMED'))
    vi.stubGlobal('fetch', masking)
    await expect(repository.startAnalysis('handover-1')).rejects.toMatchObject({ status: 409, serverCode: 'MASKING_NOT_CONFIRMED' })
    expect(masking).toHaveBeenCalledTimes(1)
  })

  it('confirms a file and surfaces the server reason when items remain', async () => {
    const confirmed = respond({ ...review, status: 'INDEXED', confirmed: true, text: null, candidates: [] })
    await expect(repository.confirmMasking('handover-1', 'file-1')).resolves.toMatchObject({ status: 'ready', confirmed: true, text: null })
    expect(confirmed.mock.calls[0][0]).toBe(`${BASE}/confirm`)
    expect(confirmed.mock.calls[0][1]?.method).toBe('POST')

    respond({ title: '확인 필요', status: 409, detail: '확인하지 않은 항목이 1개 남아 있습니다', code: 'MASKING_REVIEW_INCOMPLETE' }, 409)
    const failure = repository.confirmMasking('handover-1', 'file-1')
    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toMatchObject({ status: 409, message: '확인하지 않은 항목이 1개 남아 있습니다' })
  })
})
