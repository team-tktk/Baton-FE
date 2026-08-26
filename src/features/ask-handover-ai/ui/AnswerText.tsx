import { Fragment, type ReactNode } from 'react'

const BOLD = /\*\*(.+?)\*\*/g

/**
 * AI 답변은 마크다운 강조를 섞어서 온다. 라이브러리를 들이는 대신
 * 실제로 쓰이는 굵게(**)와 줄바꿈만 해석한다. 문자열을 그대로 요소로 만들기 때문에
 * HTML 주입 위험이 없다.
 */
function renderLine(line: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = 0
  for (const match of line.matchAll(BOLD)) {
    const start = match.index ?? 0
    if (start > cursor) nodes.push(line.slice(cursor, start))
    nodes.push(<strong key={`${keyPrefix}-${start}`}>{match[1]}</strong>)
    cursor = start + match[0].length
  }
  if (cursor < line.length) nodes.push(line.slice(cursor))
  return nodes
}

export function AnswerText({ text }: { text: string }) {
  const lines = text.split('\n')
  return <>{lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {renderLine(line, String(index))}
    </Fragment>
  ))}</>
}
