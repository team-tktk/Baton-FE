import type { HandoverParticipant } from '@/entities/handover'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'

import styles from './RecipientPicker.module.css'

interface RecipientPickerProps {
  members: HandoverParticipant[]
  selectedIds: string[]
  query: string
  onQueryChange: (query: string) => void
  onToggle: (id: string) => void
}

export function RecipientPicker({ members, onQueryChange, onToggle, query, selectedIds }: RecipientPickerProps) {
  const visible = members.filter((member) => `${member.name} ${member.team}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <section>
      <div className={styles.heading}><div><h2>업무를 받는 사람</h2><p>이름이나 팀으로 검색하세요.</p></div><Badge tone="blue">{selectedIds.length}명 선택</Badge></div>
      <label className={styles.search}><Icon name="users" /><input aria-label="이름 또는 팀 검색" placeholder="이름 또는 팀 검색" value={query} onChange={(event) => onQueryChange(event.target.value)} /></label>
      <strong className={styles.listTitle}>멤버 목록</strong>
      <div className={styles.people}>
        {visible.map((member) => {
          const selected = selectedIds.includes(member.id)
          return (
            <button aria-pressed={selected} className={selected ? styles.selected : ''} key={member.id} type="button" onClick={() => onToggle(member.id)}>
              <span><strong>{member.name}</strong><small>{member.organization} · {member.team}</small></span><i><Icon name="check" /></i>
            </button>
          )
        })}
      </div>
    </section>
  )
}
