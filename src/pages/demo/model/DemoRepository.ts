import { MockHandoverRepository, type CreateHandoverInput, type HandoverChatExchange } from '@/entities/handover'
import { demoSamples } from '@/shared/lib/demoSamples'

export const DEMO_ID = 'handover-moastore-operations'
export type DemoMilestone = 'writing' | 'submitted' | 'asked' | 'approved'

/** One session, one handover. Every operation stays in this repository's memory. */
export class DemoRepository extends MockHandoverRepository {
  private exchanges: HandoverChatExchange[] = []
  private submitted = false
  private readonly onMilestone: (value: DemoMilestone) => void
  constructor(onMilestone: (value: DemoMilestone) => void) { super(); this.onMilestone = onMilestone }

  override async createDraft(input: CreateHandoverInput) {
    await super.createDraft(input)
    await this.updateDraft(DEMO_ID, { attachments: [] })
    const handover = await this.getHandover(DEMO_ID)
    await this.saveReviewChecklist(DEMO_ID, handover.review.checklist.map(item => ({ label: item.label, checked: false })))
    return this.getHandover(DEMO_ID)
  }

  override async downloadFile(id: string, fileId: string) {
    const file = (await this.listFiles(id)).find(item => item.id === fileId)
    const sample = demoSamples.find(item => item.name === file?.name)
    if (!sample) throw new Error('데모 샘플 파일을 찾을 수 없어요')
    return { blob: new Blob([sample.text], { type: 'text/plain;charset=utf-8' }), filename: sample.name }
  }

  override async submitHandover(id: string) {
    const result = await super.submitHandover(id)
    this.submitted = true
    this.onMilestone('submitted')
    return result
  }

  override async listReceivedHandovers() {
    return this.submitted ? (await super.listReceivedHandovers()).filter(item => item.id === DEMO_ID) : []
  }

  override async listReviews() {
    return this.submitted ? (await super.listReviews()).filter(item => item.id === DEMO_ID).map(item => ({ ...item, status: item.status === 'in-progress' ? 'submitted' as const : item.status })) : []
  }

  override async completeQuestions(id: string) {
    await super.completeQuestions(id)
    const questions = await this.listQuestions(id)
    const { document } = await this.getDocument(id)
    await this.saveDocument(id, { ...document, confirmedCriteria: questions.filter(item => item.status === 'answered').map(item => ({ label: item.question, value: item.answer ?? '' })) })
  }

  override async listChatMessages() { return structuredClone(this.exchanges) }
  override async askQuestion(id: string, question: string) {
    const answer = await super.askQuestion(id, question)
    this.exchanges.push({ id: `demo-chat-${this.exchanges.length}`, question, answer })
    this.onMilestone('asked')
    return answer
  }

  override async approveHandover(id: string) {
    const handover = await this.getHandover(id)
    if (!handover.review.checklist.length || handover.review.checklist.some(item => !item.checked)) throw new Error('모든 검토 항목을 확인해 주세요')
    const result = await super.approveHandover(id)
    this.onMilestone('approved')
    return result
  }
}
