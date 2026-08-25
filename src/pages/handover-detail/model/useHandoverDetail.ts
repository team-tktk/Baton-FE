import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { Handover } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { RepositoryError } from '@/shared/lib/async'

export function useHandoverDetail() {
  const { handoverId } = useParams()
  const repository = useHandoverRepository()
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState<{ id: string; value: Handover } | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => { setError(''); setAttempt((value) => value + 1) }, [])

  useEffect(() => {
    if (!handoverId) { navigate('/404', { replace: true }); return }
    let ignore = false
    repository.getHandover(handoverId).then((value) => { if (!ignore) { setError(''); setLoaded({ id: handoverId, value }) } }).catch((reason: unknown) => {
      if (ignore) return
      if (reason instanceof RepositoryError && reason.code === 'NOT_FOUND') navigate('/404', { replace: true })
      else setError(reason instanceof Error ? reason.message : '인수인계를 불러오지 못했어요.')
    })
    return () => { ignore = true }
  }, [attempt, handoverId, navigate, repository])

  return { error, handover: loaded && loaded.id === handoverId ? loaded.value : null, handoverId, retry }
}
