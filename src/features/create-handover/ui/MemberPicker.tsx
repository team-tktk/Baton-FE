import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import type { HandoverParticipant } from '@/entities/handover'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'

import styles from './MemberPicker.module.css'

interface MemberPickerProps {
  separated?: boolean
  title: string
  description: string
  members: HandoverParticipant[]
  selectedIds: string[]
  /** 다른 역할에 이미 뽑혀 고를 수 없는 사람. 서버가 같은 사람의 겸임을 400으로 막는다. */
  disabledIds?: string[]
  /** 왜 못 고르는지 목록에 적어 준다. 숨기면 "왜 안 눌리지?"가 되어 그대로 보여 준다. */
  disabledReason?: string
  query: string
  onQueryChange: (query: string) => void
  onToggle: (id: string) => void
}

export function MemberPicker({ description, disabledIds = [], disabledReason = '선택할 수 없어요', members, onQueryChange, onToggle, query, selectedIds, separated = false, title }: MemberPickerProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const visible = members.filter((member) => `${member.name} ${member.team}`.toLowerCase().includes(query.toLowerCase()))
  const selectedMembers = members.filter((member) => selectedIds.includes(member.id))
  const isBlocked = (id: string) => disabledIds.includes(id)

  /** 못 고르는 사람은 건너뛰고 다음으로 고를 수 있는 항목을 찾는다. 하나도 없으면 -1. */
  const nextSelectable = (from: number, delta: number) => {
    if (visible.length === 0) return -1
    let index = from
    for (let moved = 0; moved < visible.length; moved += 1) {
      index = (index + delta + visible.length) % visible.length
      if (!isBlocked(visible[index].id)) return index
    }
    return -1
  }

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && rootRef.current?.contains(document.activeElement)) {
        setOpen(false)
        setActiveIndex(-1)
        inputRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const toggleMember = (id: string) => {
    onToggle(id)
    onQueryChange('')
    setActiveIndex(-1)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => {
        if (event.key === 'Home') return nextSelectable(visible.length - 1, 1)
        if (event.key === 'End') return nextSelectable(0, -1)
        if (event.key === 'ArrowDown') return nextSelectable(current, 1)
        return nextSelectable(current < 0 ? 0 : current, -1)
      })
      return
    }
    if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault()
      toggleMember(visible[activeIndex].id)
    }
  }

  return (
    <section aria-label={title} className={separated ? styles.separated : undefined} ref={rootRef}>
      <div className={styles.heading}><div><h2>{title}</h2><p>{description}</p></div><Badge tone="blue">{selectedIds.length}명 선택</Badge></div>
      <div className={`${styles.picker} ${open ? styles.pickerOpen : ''}`.trim()}>
        <div className={styles.search} onClick={() => { setOpen(true); inputRef.current?.focus() }}>
          <Icon name="users" />
          <div className={styles.value}>
            <div className={styles.chips}>
              {selectedMembers.map((member) => (
                <button aria-label={`${member.name} 선택 해제`} key={member.id} type="button" onClick={(event) => { event.stopPropagation(); toggleMember(member.id) }}>
                  {member.name}<span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
            <input
              aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-member-option-${visible[activeIndex].id}` : undefined}
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={open}
              aria-label={`${title} 검색`}
              autoComplete="off"
              placeholder="이름 또는 팀 검색"
              ref={inputRef}
              role="combobox"
              value={query}
              onChange={(event) => { onQueryChange(event.target.value); setActiveIndex(-1) }}
              onBlur={(event) => {
                if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
                  setOpen(false)
                  setActiveIndex(-1)
                }
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        {open && (
          <div aria-label={`${title} 목록`} className={styles.popover} id={listboxId} role="listbox">
            <strong className={styles.listTitle}>멤버 목록</strong>
            <div className={styles.people}>
              {visible.map((member, index) => {
                const selected = selectedIds.includes(member.id)
                const blocked = isBlocked(member.id)
                return (
                  <button aria-disabled={blocked || undefined} aria-selected={selected} className={`${selected ? styles.selected : ''} ${activeIndex === index ? styles.active : ''}`.trim()} disabled={blocked} id={`${listboxId}-member-option-${member.id}`} key={member.id} role="option" tabIndex={-1} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleMember(member.id)}>
                    <span><strong>{member.name}</strong><small>{member.position} · {member.team}</small></span>
                    {blocked ? <em className={styles.reason}>{disabledReason}</em> : <i><Icon name="check" /></i>}
                  </button>
                )
              })}
              {visible.length === 0 && <p className={styles.empty}>검색 결과가 없어요.</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
