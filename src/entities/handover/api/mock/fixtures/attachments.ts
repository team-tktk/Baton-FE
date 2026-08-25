import type { HandoverAttachment } from '../../../model/types'

export const defaultAttachmentFixtures = [
  {
    id: 'attachment-autumn-sale',
    name: '가을_할인전_준비_메모.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 2_400_000,
    status: 'ready',
  },
  {
    id: 'attachment-weekly-orders',
    name: '주간_주문현황_양식.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 840_000,
    status: 'ready',
  },
  {
    id: 'attachment-incidents',
    name: '문제상황_대응방법.pdf',
    mimeType: 'application/pdf',
    size: 1_800_000,
    status: 'ready',
  },
] satisfies HandoverAttachment[]

export const csAttachmentFixtures = [
  { id: 'attachment-cs-playbook', name: '고객문의_응대_플레이북.pdf', mimeType: 'application/pdf', size: 3_100_000, status: 'ready' },
  { id: 'attachment-refund-policy', name: '환불_예외처리_기준.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 720_000, status: 'ready' },
  { id: 'attachment-voc-board', name: '주간_VOC_분류표.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 1_260_000, status: 'ready' },
  { id: 'attachment-cs-template', name: '고객안내_메시지_템플릿.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 2_050_000, status: 'ready' },
] satisfies HandoverAttachment[]

export const settlementAttachmentFixtures = [
  { id: 'attachment-settlement-calendar', name: '월간_정산_캘린더.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 930_000, status: 'ready' },
  { id: 'attachment-tax-invoice', name: '세금계산서_발행_가이드.pdf', mimeType: 'application/pdf', size: 1_450_000, status: 'ready' },
] satisfies HandoverAttachment[]
