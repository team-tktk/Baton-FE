import type { HandoverAttachment } from '../../../model/types'

export const defaultAttachmentFixtures = [
  {
    id: 'attachment-autumn-sale',
    name: '가을_할인전_준비_메모.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 2_400_000,
  },
  {
    id: 'attachment-weekly-orders',
    name: '주간_주문현황_양식.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 840_000,
  },
  {
    id: 'attachment-incidents',
    name: '문제상황_대응방법.pdf',
    mimeType: 'application/pdf',
    size: 1_800_000,
  },
] satisfies HandoverAttachment[]
