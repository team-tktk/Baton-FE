import type { HandoverTask } from '../model/types'
import { HandoverStatusBadge } from './HandoverStatusBadge'
import styles from './EntitySummary.module.css'

export function TaskSummary({ task }: { task: HandoverTask }) {
  return <article className={styles.task}><div><strong>{task.title}</strong><HandoverStatusBadge label={task.statusLabel} status={task.tone === 'green' ? 'approved' : task.tone === 'yellow' ? 'in-progress' : 'submitted'} /></div><p>{task.description}</p><span>다음: {task.nextAction}</span></article>
}
