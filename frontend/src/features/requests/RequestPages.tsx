import { Link, useParams } from 'react-router'
import { Placeholder } from '@/components/Placeholder'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { RequestEditAction } from './RequestEditAction'

export function RequestPage() {
  const { id } = useParams()
  return (
    <>
      <SectionHeader>
        <Button variant="link" asChild className="px-0">
          <Link to="/requests">← Voltar para solicitações</Link>
        </Button>
        {id && <RequestEditAction key={id} id={id} />}
      </SectionHeader>
      <Placeholder title="Informações da solicitação">
        {`Endereço da solicitação: ${id}. A apresentação completa dos detalhes e as ações de atendimento serão disponibilizadas na próxima etapa.`}
      </Placeholder>
    </>
  )
}
