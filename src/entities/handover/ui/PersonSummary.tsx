import type { HandoverPerson } from '../model/types'
import styles from './EntitySummary.module.css'

export function PersonSummary({ person }: { person: HandoverPerson }) {
  return <article className={styles.person}><i>{person.name.slice(0, 1)}</i><div><strong>{person.name} · {person.team}</strong><span>{person.responsibility}</span></div></article>
}
