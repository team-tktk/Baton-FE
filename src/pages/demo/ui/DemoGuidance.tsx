import { useCreateHandover } from '@/features/create-handover'
import type { DemoDocumentActivity } from '@/shared/lib/demo'
import type { DemoMilestone } from '../model/DemoRepository'

import styles from './DemoPage.module.css'

interface GuidanceCopy {
  eyebrow: string
  title: string
  why: string
  action: string
  optional?: string
}

interface DemoGuidanceProps {
  detailed?: boolean
  documentActivity: DemoDocumentActivity
  milestone: DemoMilestone
  pathname: string
}

function staticCopy(pathname: string, milestone: DemoMilestone, documentActivity: DemoDocumentActivity): GuidanceCopy {
  if (pathname.endsWith('/new/setup')) return {
    eyebrow: '자료를 찾기 전 준비',
    title: '누가 어떤 업무를 이어받는지 확인해 주세요',
    why: '받는 사람과 업무를 알면 AI가 필요한 자료를 더 정확히 정리할 수 있어요.',
    action: '미리 입력된 내용을 확인하고 ‘업무 자료 올리기’를 눌러 주세요.',
  }
  if (pathname.endsWith('/new/masking')) return {
    eyebrow: '안전한 분석을 위한 검수',
    title: '분석 전에 민감정보를 가려 주세요',
    why: '가린 내용은 AI 분석과 질의응답에 사용되지 않아요.',
    action: '이메일을 ‘가리기’로 선택한 뒤 ‘확정하고 AI 분석 시작’을 눌러 주세요.',
  }
  if (pathname.endsWith('/new/analyzing')) return {
    eyebrow: '자료 분석 중',
    title: '업무 자료에서 초안의 근거를 찾고 있어요',
    why: '자료의 핵심 내용과 빠진 정보를 구분해 다음 질문을 준비해요.',
    action: '분석이 끝나면 확인 질문 화면으로 자동 이동해요.',
  }
  if (pathname.includes('/new/interview/')) return {
    eyebrow: '자료에 없는 정보 보완',
    title: '인수인계자의 판단 기준을 알려 주세요',
    why: '문서에 없는 기준까지 알아야 후임자가 같은 상황에서 결정할 수 있어요.',
    action: '가장 알맞은 답을 고르고 다음 질문으로 이동해 주세요.',
  }
  if (pathname.endsWith('/new/document')) {
    if (documentActivity === 'review') return {
      eyebrow: 'AI 보완안 검토',
      title: '문서에 표시된 변경 내용만 확인해 주세요',
      why: 'AI 제안을 그대로 확정하지 않고 필요한 내용만 직접 선택할 수 있어요.',
      action: '원치 않는 녹색 문장은 ×로 빼고 오른쪽의 ‘문서에 적용’을 눌러 주세요.',
    }
    if (documentActivity === 'applied') return {
      eyebrow: '보완 완료',
      title: '필요한 내용이 문서에 반영됐어요',
      why: '후임자가 바로 실행할 수 있도록 부족했던 기준을 채웠어요.',
      action: '문서를 한 번 훑어본 뒤 아래의 ‘제출하기’를 눌러 전달해 주세요.',
    }
    return {
      eyebrow: 'AI 초안 검토',
      title: '후임자가 바로 일할 수 있는지 확인해 주세요',
      why: '오른쪽 준비도는 빠진 실행 절차와 예외 기준을 찾아줘요.',
      action: '부족한 항목을 열고 ‘AI로 보완하기’를 한 번 체험해 주세요.',
    }
  }
  if (pathname.endsWith('/new/complete')) return {
    eyebrow: '전달 완료',
    title: '인수인계서가 후임자에게 전달됐어요',
    why: '이제 보낸 사람과 받는 사람의 화면에서 같은 문서를 확인할 수 있어요.',
    action: '상단의 ‘② 받은 문서 · AI 질문’을 눌러 후임자 화면으로 이동해 주세요.',
  }
  if (pathname.endsWith('/handovers/received')) return {
    eyebrow: '후임자 역할',
    title: '나에게 도착한 인수인계서를 열어보세요',
    why: '후임자가 첫날 필요한 내용을 얼마나 빨리 찾는지 체험할 수 있어요.',
    action: '최서윤님에게 받은 인수인계를 선택해 주세요.',
  }
  if (pathname.endsWith('/arrival')) return {
    eyebrow: '업무 시작',
    title: '첫 일정과 업무 맥락부터 파악해 보세요',
    why: '긴 문서를 처음부터 읽지 않아도 당장 필요한 내용을 먼저 볼 수 있어요.',
    action: '‘먼저 할 일 확인하기’를 눌러 주세요.',
  }
  if (pathname.endsWith('/overview')) return {
    eyebrow: '핵심 내용 확인',
    title: '먼저 할 일과 업무 개요를 확인해 주세요',
    why: '업무의 우선순위와 완료 기준을 한눈에 파악할 수 있어요.',
    action: '확인 후 전체 문서나 AI 질문 화면으로 이동해 주세요.',
  }
  if (pathname.endsWith('/chat') || (pathname.includes('/handovers/') && !pathname.includes('/new/'))) return milestone === 'asked' ? {
    eyebrow: '질문 완료',
    title: '문서 근거가 있는 답변을 확인했어요',
    why: '후임자는 원문을 다시 뒤지지 않고 필요한 답과 출처를 함께 볼 수 있어요.',
    action: '상단의 ‘③ 팀장 승인’을 눌러 최종 검토로 이동해 주세요.',
  } : {
    eyebrow: '문서 기반 AI 질문',
    title: '첫날 가장 먼저 할 일을 물어보세요',
    why: 'AI가 인수인계서와 첨부 자료 안에서 근거를 찾아 답해요.',
    action: '추천 질문 ‘첫날 가장 먼저 할 일은?’을 선택해 주세요.',
  }
  if (pathname.endsWith('/reviews')) return {
    eyebrow: '팀장 역할',
    title: '검토할 인수인계서를 열어보세요',
    why: '업무가 빠짐없이 전달됐는지 책임자가 마지막으로 확인해요.',
    action: '검토 목록의 인수인계서를 선택해 주세요.',
  }
  return {
    eyebrow: '최종 검토',
    title: '체크리스트를 확인하고 승인해 주세요',
    why: '필수 내용이 갖춰졌는지 확인해야 안전하게 업무를 넘길 수 있어요.',
    action: '오른쪽 체크리스트를 모두 확인한 뒤 ‘인수인계 승인’을 눌러 주세요.',
  }
}

export function DemoGuidance({ detailed = false, documentActivity, milestone, pathname }: DemoGuidanceProps) {
  const { state } = useCreateHandover()
  let copy = staticCopy(pathname, milestone, documentActivity)

  if (pathname.endsWith('/new/upload')) {
    const uploading = state.attachments.some((file) => file.id.startsWith('uploading-') || file.status === 'processing')
    const ready = state.attachments.filter((file) => !file.id.startsWith('uploading-') && file.status !== 'processing' && file.status !== 'failed').length
    copy = uploading ? {
      eyebrow: '자료를 불러오는 중',
      title: '파일 목록을 준비하고 있어요',
      why: '추가된 자료는 민감정보 검수를 거친 뒤 AI 초안의 근거로 사용돼요.',
      action: '자료를 처리하고 있어요. 완료되면 다음 단계로 이동할 수 있어요.',
    } : ready > 0 ? {
      eyebrow: '자료 준비 완료',
      title: `자료 ${ready}개가 준비됐어요`,
      why: 'AI가 이 자료를 읽고 업무 맥락과 초안의 근거를 찾아요.',
      action: '‘민감정보 확인하기’를 눌러 분석 전에 이메일을 가려 주세요.',
      optional: '웹 링크와 Slack 대화는 선택 체험이에요.',
    } : {
      eyebrow: '자료 모으기',
      title: '먼저, 흩어진 업무 자료를 모아볼까요?',
      why: 'AI가 이 자료를 읽고 인수인계 초안을 만들어요.',
      action: '아래 ‘준비된 샘플 파일 3개 추가’를 눌러 주세요.',
      optional: '웹 링크와 Slack 대화도 선택적으로 추가할 수 있어요.',
    }
  }

  if (milestone === 'approved') return <section className={styles.contextGuide} aria-label="현재 단계 안내">문서 작성부터 후임자 질문, 팀장 승인까지 체험을 마쳤어요.</section>

  if (!detailed) return <section className={styles.contextGuide} aria-label="현재 단계 안내">
    <span className={styles.guideLabel}>체험 안내</span>
    <p>{copy.action}</p>
  </section>

  return <section className={styles.detailGuide} aria-label="현재 단계 안내">
    <div className={styles.guideReason}>
      <span>{copy.eyebrow}</span>
      <strong>{copy.title}</strong>
      <p>{copy.why}</p>
    </div>
    <div className={styles.guideNext}>
      <span>지금 할 일</span>
      <strong>{copy.action}</strong>
      {copy.optional && <small>{copy.optional}</small>}
    </div>
  </section>
}
