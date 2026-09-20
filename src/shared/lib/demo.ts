import { createContext, useCallback, useContext } from 'react'
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom'

export const DemoContext = createContext(false)
export const useDemo = () => useContext(DemoContext)

/** Keep all navigation inside the isolated demo route. */
export function useAppNavigate() {
  const navigate = useNavigate()
  const demo = useDemo()
  return useCallback((to: To | number, options?: NavigateOptions) => {
    if (typeof to === 'number') return navigate(to)
    if (!demo) return navigate(to, options)
    if (typeof to === 'string') return navigate(to.startsWith('/') ? `/demo${to === '/' ? '' : to}` : to, options)
    return navigate({ ...to, pathname: to.pathname?.startsWith('/') ? `/demo${to.pathname}` : to.pathname }, options)
  }, [demo, navigate])
}
