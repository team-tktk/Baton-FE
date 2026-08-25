import type { SVGProps } from 'react'

import styles from './Icon.module.css'

export type IconName =
  | 'arrow'
  | 'back'
  | 'upload'
  | 'download'
  | 'check'
  | 'file'
  | 'chat'
  | 'send'
  | 'spark'
  | 'users'
  | 'shield'
  | 'link'
  | 'calendar'
  | 'briefcase'
  | 'alert'
  | 'repeat'
  | 'target'
  | 'chevron'
  | 'copy'

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  back: <path d="M19 12H5m6 6-6-6 6-6" />,
  upload: <><path d="M12 16V4m0 0-4 4m4-4 4 4" /><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></>,
  download: <><path d="M12 4v12m0 0 4-4m-4 4-4-4" /><path d="M5 18v2h14v-2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
  chat: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" /><path d="M8 9h8M8 13h5" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  spark: <><path d="m12 3-1.4 4.1L6.5 8.5l4.1 1.4L12 14l1.4-4.1 4.1-1.4-4.1-1.4L12 3Z" /><path d="m5 15-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8L5 15Z" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
  alert: <><path d="M10.3 3.5 2.4 17.2A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.8L13.7 3.5a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  repeat: <><path d="m17 1 4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="m15 9 6-6" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
}

export function Icon({ name, className = '', ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`${styles.icon} ${className}`.trim()}
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
