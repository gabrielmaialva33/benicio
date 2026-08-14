import { Head, Link } from '@inertiajs/react'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <>
      <Head title="Página não encontrada" />
      <main className="flex min-h-screen items-center justify-center bg-yol-page px-4">
        <section className="w-full max-w-[520px] rounded-[15px] bg-white px-8 py-12 text-center shadow-lg">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <FileQuestion className="size-7" aria-hidden="true" />
          </span>

          <h1 className="mt-6 font-semibold text-3xl text-gray-900">Página não encontrada</h1>
          <p className="mt-3 text-base text-gray-500">
            O endereço acessado não existe ou o registro foi removido.
          </p>

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
