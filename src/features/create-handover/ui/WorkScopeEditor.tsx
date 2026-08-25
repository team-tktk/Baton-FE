import styles from './WorkScopeEditor.module.css'

interface WorkScopeEditorProps {
  items: string[]
  onAdd: () => void
  onChange: (index: number, value: string) => void
  onRemove: (index: number) => void
}

export function WorkScopeEditor({ items, onAdd, onChange, onRemove }: WorkScopeEditorProps) {
  return (
    <section className={styles.section}>
      <h2>넘길 업무</h2><p>업무 하나당 한 줄씩 적어주세요. 순서와 세부 내용은 AI가 자료에서 정리해요.</p>
      <div className={styles.list}>
        {items.map((item, index) => (
          <div className={styles.item} key={index}><span>{index + 1}</span><input aria-label={`${index + 1}번 업무`} placeholder="업무를 입력하세요" value={item} onChange={(event) => onChange(index, event.target.value)} /><button aria-label={`${index + 1}번 업무 삭제`} type="button" onClick={() => onRemove(index)}>×</button></div>
        ))}
      </div>
      <button className={styles.add} type="button" onClick={onAdd}>+ 업무 추가</button>
    </section>
  )
}
