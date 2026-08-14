import { Head } from '@inertiajs/react'

import { MainLayout } from '~/layouts'
import { FileUpload } from '~/components/file'
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '~/components/ui/card'

export default function FilesPage() {
  return (
    <MainLayout>
      <Head title="Arquivos" />

      <div>
        <Card className="border-gray-100">
          <CardHeader>
            <CardHeading>
              <CardTitle>Enviar arquivos</CardTitle>
              <p className="text-sm text-gray-500">Arraste um arquivo ou escolha no computador.</p>
            </CardHeading>
          </CardHeader>
          <CardContent>
            <FileUpload />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
