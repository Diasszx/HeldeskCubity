import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { portalServices } from '@/services/portal-services'

export function RequestEditAction({ id }: { id: string }) {
  const [eligibleId, setEligibleId] = useState<string>()
  useEffect(() => {
    let active = true
    void Promise.all([
      portalServices.requests.get(id),
      portalServices.users.current(),
    ])
      .then(([request, user]) => {
        if (
          active &&
          user?.id === request.requesterId &&
          request.status === 'OPEN'
        )
          setEligibleId(id)
      })
      .catch(() => {
        /* Details and operation errors belong to their respective pages. */
      })
    return () => {
      active = false
    }
  }, [id])
  if (eligibleId !== id) return null
  return (
    <Button asChild>
      <Link to={`/requests/${id}/edit`}>Editar solicitação</Link>
    </Button>
  )
}
