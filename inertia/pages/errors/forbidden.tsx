import { Head, Link } from '@inertiajs/react'
import { ShieldAlert } from 'lucide-react'

interface ForbiddenProps {
  /** Path the user tried to open, shown as context for the block. */
  attemptedPath?: string | null
  /** Landing route the signed-in user can actually reach. */
  fallbackPath?: string
}

export default function Forbidden({ attemptedPath, fallbackPath = '/' }: ForbiddenProps) {
  return (
    <>
      <Head title="Acesso negado" />
      <main className="flex min-h-screen items-center justify-center bg-yol-page px-4">
        <section className="w-full max-w-[520px] rounded-[15px] bg-white px-8 py-12 text-center shadow-lg">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-orange-50 text-orange-500">
            <ShieldAlert className="size-7" aria-hidden="true" />
          </span>

          <h1 className="mt-6 font-semibold text-3xl text-gray-900">Acesso negado</h1>
          <p className="mt-3 text-base text-gray-500">
            Seu perfil não tem permissão para abrir esta página. Se você precisa desse acesso, fale
            com o administrador do escritório.
          </p>

          {attemptedPath && (
            <p className="mt-4 rounded-md bg-gray-50 px-3 py-2 font-mono text-sm text-gray-500">
              {attemptedPath}
            </p>
          )}

          <Link
            href={fallbackPath}
            className="mt-8 inline-flex h-[50px] w-full items-center justify-center rounded-full bg-gray-900 px-4 font-semibold text-base text-white transition hover:bg-gray-800"
          >
            Voltar para o início
          </Link>
        </section>
      </main>
    </>
  )
}
