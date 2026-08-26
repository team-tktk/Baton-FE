import { describe, expect, it } from 'vitest'

import { toChatExchange, toHandoverAnswer } from './chatMapper'

describe('chatMapper', () => {
  it('keeps the citations of a document-grounded answer', () => {
    expect(toHandoverAnswer({
      messageId: 'message-1',
      answer: '오늘 오후 3시까지 답이 없으면 물류팀에 공유하세요.',
      grounded: true,
      answerSource: 'DOCUMENT',
      citations: [{ sourceId: 'source-1', title: '대응 방법.pdf', locator: '청크 3/12' }],
    })).toEqual({
      text: '오늘 오후 3시까지 답이 없으면 물류팀에 공유하세요.',
      grounded: true,
      citations: [{ sourceId: 'source-1', title: '대응 방법.pdf', locator: '청크 3/12' }],
    })
  })

  it('shows a general-knowledge answer even though it is not grounded', () => {
    expect(toHandoverAnswer({
      messageId: 'message-2',
      answer: 'ROI는 투자 대비 수익률을 뜻해요.',
      grounded: false,
      answerSource: 'GENERAL_KNOWLEDGE',
      citations: [],
    })).toEqual({
      text: 'ROI는 투자 대비 수익률을 뜻해요.',
      grounded: false,
      citations: [],
    })
  })

  it('falls back to the contact notice only when there is no answer', () => {
    expect(toHandoverAnswer({
      messageId: 'message-3',
      answer: null,
      grounded: false,
      answerSource: 'NOT_FOUND',
      fallbackContact: '인계자에게 직접 문의해주세요.',
    })).toEqual({
      text: '자료에서 답을 찾지 못했어요. 인계자에게 직접 문의해주세요.',
      grounded: false,
      citations: [],
    })
  })

  it('keeps a general-knowledge answer in the chat history', () => {
    expect(toChatExchange({
      id: 'message-4',
      question: '어떤 배송업체를 말하는 건가요?',
      answer: '어떤 배송업체를 말씀하시는 건가요? 알려주시면 다시 찾아볼게요.',
      grounded: false,
      answerSource: 'GENERAL_KNOWLEDGE',
      citations: [],
      createdAt: '2026-08-25T02:00:00Z',
    }).answer).toEqual({
      text: '어떤 배송업체를 말씀하시는 건가요? 알려주시면 다시 찾아볼게요.',
      grounded: false,
      citations: [],
    })
  })
})
