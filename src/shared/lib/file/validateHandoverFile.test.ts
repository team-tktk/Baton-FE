import { describe, expect, it } from 'vitest'

import { validateHandoverFile } from './validateHandoverFile'

describe('validateHandoverFile', () => {
  it('accepts the four supported extensions at or below 50MB', () => {
    for (const name of ['guide.pdf', 'memo.docx', 'orders.xlsx', 'brief.pptx']) {
      expect(validateHandoverFile({ name, size: 50 * 1024 * 1024 })).toEqual({ ok: true })
    }
  })

  it('rejects unsupported extensions', () => {
    expect(validateHandoverFile({ name: 'memo.txt', size: 1 })).toEqual({
      ok: false,
      message: 'PDF, DOCX, XLSX, PPTX 파일만 추가할 수 있어요',
    })
  })

  it('rejects a supported file over 50MB', () => {
    expect(validateHandoverFile({ name: 'guide.pdf', size: 50 * 1024 * 1024 + 1 })).toEqual({
      ok: false,
      message: '파일당 최대 크기는 50MB예요',
    })
  })
})
