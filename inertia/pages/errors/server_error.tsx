import { Head, Link } from '@inertiajs/react'
import { TriangleAlert } from 'lucide-react'

interface ServerErrorProps {
  /** Upstream message. Shown in development only — see below. */
  error?: { message?: string }
}

export default function ServerError({ error }: ServerErrorProps) {
  /*
   * The raw message can carry a stack frame, a query or a table name. That is
   * useful while developing and is an information leak in production, so the
   * user always gets the neutral copy and only a dev build sees the detail.
   */
  const detail = import.meta.env.DEV ? error?.message : undefined

  return (
    <>
      <Head title="Erro no servidor" />
      <main className="flex min-h-screen items-center justify-center bg-yol-page px-4">
        <section className="w-full max-w-[520px] rounded-[15px] bg-white px-8 py-12 text-center shadow-lg">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <TriangleAlert className="size-7" aria-hidden="true" />
          </span>

          <h1 className="mt-6 font-semibold text-3xl text-gray-900">Algo deu errado</h1>
          <p className="mt-3 text-base text-gray-500">
            Não conseguimos concluir esta operação. Tente novamente em instantes — se persistir,
            avise o suporte do escritório.
          </p>

          {detail && (
            <p className="mt-4 break-words rounded-md bg-gray-50 px-3 py-2 text-left font-mono text-sm text-gray-500">
              {detail}
            </p>
          )}

          <Link
            href="/"
            className="mt-8 inline-flex h-[50px] w-full items-center justify-center rounded-full bg-gray-900 px-4 font-semibold text-base text-white transition hover:bg-gray-800"
          >
            Voltar para o início
          </Link>
        </section>
      </main>
    </>
  )
}
