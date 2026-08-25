import { Navigate, useParams } from 'react-router-dom'

export function HandoverWorkspaceRedirect() {
  const { handoverId } = useParams()
  return <Navigate replace to={handoverId ? `/handovers/${handoverId}` : '/404'} />
}
