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

/** 근거를 못 찾으면 서버가 답을 만들지 않는다. 지어내지 말고 문의 안내를 그대로 보여 준다. */
export function toHandoverAnswer(response: ChatAnswerResponse): HandoverAnswer {
  const answer = response.answer?.trim()
  return {
    text: response.grounded && answer
      ? answer
      : [NOT_GROUNDED, response.fallbackContact?.trim()].filter(Boolean).join(' '),
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
      text: message.grounded && answer ? answer : NOT_GROUNDED,
      grounded: Boolean(message.grounded && answer),
      citations: message.grounded ? toCitations(message.citations) : [],
    },
  }
}
