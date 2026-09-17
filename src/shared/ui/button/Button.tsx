import type { ComponentPropsWithRef } from 'react'

import styles from './Button.module.css'

// React 19부터 ref는 일반 prop으로 넘어간다. 모달이 닫힐 때 포커스를 돌려줄 대상으로 쓸 수 있게 받는다.
interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return <button className={`${styles.button} ${styles[variant]} ${className}`.trim()} {...props} />
}
