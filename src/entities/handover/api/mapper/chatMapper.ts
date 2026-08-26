import type { HandoverAnswer, HandoverChatExchange } from '../../model/types'
import type { ChatAnswerResponse, ChatMessageResponse, Citation } from '../dto/types'

const NOT_GROUNDED = '자료에서 답을 찾지 못했어요.'

function toCitations(citations: Citation[] | undefined) {
  return (citations ?? []).map((citation) => ({
    sourceId: citation.sourceId,
    title: citation.title?.trim() || '첨부 자료',
    locator: citation.locator?.trim() || '',
  }))
}

/**
 * 자료에 근거가 없어도(`grounded=false`) 서버가 답을 만들어 주면 그대로 보여 준다.
 * 그 답 자체가 이미 자연어 안내문이라 프론트가 문구를 덧붙이지 않는다.
 * 답이 아예 없을 때만(`NOT_FOUND`) 문의 안내로 대체한다.
 */
export function toHandoverAnswer(response: ChatAnswerResponse): HandoverAnswer {
  const answer = response.answer?.trim()
  return {
    text: answer || [NOT_GROUNDED, response.fallbackContact?.trim()].filter(Boolean).join(' '),
    grounded: Boolean(response.grounded && answer),
    citations: response.grounded ? toCitations(response.citations) : [],
  }
}

export function toChatExchange(message: ChatMessageResponse): HandoverChatExchange {
  const answer = message.answer?.trim()
  return {
    id: message.id,
    question: message.question,
    answer: {
      text: answer || NOT_GROUNDED,
      grounded: Boolean(message.grounded && answer),
      citations: message.grounded ? toCitations(message.citations) : [],
    },
  }
}
