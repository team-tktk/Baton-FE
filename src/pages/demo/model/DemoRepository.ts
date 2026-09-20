import { MockHandoverRepository, summarizeMasking, type CreateHandoverInput, type HandoverChatExchange, type ReadinessArea } from '@/entities/handover'
import { demoSamples } from '@/shared/lib/demoSamples'

export const DEMO_ID = 'handover-moastore-operations'
export type DemoMilestone = 'writing' | 'submitted' | 'asked' | 'approved'

/** 데모에서도 실제 비동기 작업처럼 중간 상태를 충분히 알아볼 수 있게 한다. */
const pause = (milliseconds: number) => new Promise((resolve) => { window.setTimeout(resolve, milliseconds) })

/** One session, one handover. Every operation stays in this repository's memory. */
export class DemoRepository extends MockHandoverRepository {
  protected override includePartialReadinessQuestions = true
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

  override async uploadFile(id: string, file: File) {
    // 낙관적으로 추가된 '업로드 중' 행을 본 뒤 파일별로 완료되는 흐름을 보여 준다.
    await pause(420)
    const attachment = await super.uploadFile(id, file)
    const sample = demoSamples.find((item) => item.name === file.name)
    const email = 'seoyun.demo@example.com'
    const start = sample?.text.indexOf(email) ?? -1
    if (start < 0) return attachment
    const candidate = {
      id: 'demo-email', type: 'EMAIL' as const, typeLabel: '이메일', origin: 'detected' as const,
      start, end: start + email.length, confidence: 97, applied: false,
      needsReview: true, pendingReview: true, preview: 'se***@example.com',
    }
    this.maskingReviews.set(attachment.id, {
      fileId: attachment.id, fileName: attachment.name, status: 'review', confirmed: false,
      text: sample!.text, candidates: [candidate], summary: summarizeMasking([candidate]),
    })
    const files = (await this.listFiles(id)).map((item) => item.id === attachment.id
      ? { ...item, status: 'review' as const, pendingReviewCount: 1 }
      : item)
    await this.updateDraft(id, { attachments: files })
    return files.find((item) => item.id === attachment.id)!
  }

  override async submitHandover(id: string) {
    await pause(650)
    const result = await super.submitHandover(id)
    this.submitted = true
    this.onMilestone('submitted')
    return result
  }

  override async listReceivedHandovers() {
    return this.submitted ? (await super.listReceivedHandovers()).filter(item => item.id === DEMO_ID) : []
  }

  override async listSentHandovers() {
    if (!this.submitted) return []
    const handover = await this.getHandover(DEMO_ID)
    return [{
      id: handover.id,
      title: handover.title,
      scope: handover.document.scope,
      date: handover.deliveredAtLabel,
      status: handover.status,
      tasks: handover.document.activeTasks.length + handover.document.recurringTasks.length,
      files: handover.attachments.length,
      recipients: handover.recipients.length,
    }]
  }

  override async listReviews() {
    return this.submitted ? (await super.listReviews()).filter(item => item.id === DEMO_ID).map(item => ({ ...item, status: item.status === 'in-progress' ? 'submitted' as const : item.status })) : []
  }

  override async completeQuestions(id: string) {
    await super.completeQuestions(id)
    const questions = await this.listQuestions(id)
    const { document } = await this.getDocument(id)
    await this.saveDocument(id, { ...document, confirmedCriteria: questions.filter(item => item.status === 'answered').map(item => ({ label: item.question, value: item.answer ?? '' })) })
    // DraftFinalizing 화면에서 답변이 문서에 반영되는 과정을 확인할 시간을 준다.
    await pause(1400)
  }

  override async confirmMasking(id: string, fileId: string) {
    await pause(650)
    return super.confirmMasking(id, fileId)
  }

  override async evaluateReadiness(id: string) {
    await pause(900)
    return super.evaluateReadiness(id)
  }

  override async startReadinessFix(id: string, areas: ReadinessArea[]) {
    await pause(650)
    return super.startReadinessFix(id, areas)
  }

  override async generateReadinessFix(id: string, fixId: string) {
    await pause(1400)
    return super.generateReadinessFix(id, fixId)
  }

  override async applyReadinessFix(id: string, fixId: string, baseRevision: number) {
    await pause(700)
    return super.applyReadinessFix(id, fixId, baseRevision)
  }

  override async listChatMessages() { return structuredClone(this.exchanges) }
  override async askQuestion(id: string, question: string) {
    await pause(850)
    const answer = await super.askQuestion(id, question)
    this.exchanges.push({ id: `demo-chat-${this.exchanges.length}`, question, answer })
    this.onMilestone('asked')
    return answer
  }

  override async approveHandover(id: string) {
    const handover = await this.getHandover(id)
    if (!handover.review.checklist.length || handover.review.checklist.some(item => !item.checked)) throw new Error('모든 검토 항목을 확인해 주세요')
    await pause(650)
    const result = await super.approveHandover(id)
    this.onMilestone('approved')
    return result
  }
}
