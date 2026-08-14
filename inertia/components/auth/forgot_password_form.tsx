import { Link, useForm, usePage } from '@inertiajs/react'
import type { FormEvent } from 'react'

export function ForgotPasswordForm() {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
  })
  const { flash } = usePage().props as { flash?: { success?: string | null } }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    post('/forgot-password')
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5" noValidate>
      {flash?.success && (
        <p
          role="status"
          className="rounded-md bg-emerald-50 px-3 py-3 text-sm leading-5 text-emerald-800"
        >
          {flash.success}
        </p>
      )}

      <div>
        <label htmlFor="email" className="sr-only">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={data.email}
          onChange={(event) => setData('email', event.target.value)}
          placeholder="E-mail"
          required
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="h-[50px] w-full rounded-md border border-[#e1e3ea] bg-transparent px-3 font-semibold text-base text-gray-500 outline-none placeholder:text-gray-500 focus:border-gray-400"
        />
        {errors.email && (
          <p id="email-error" className="mt-1.5 text-sm text-red-600">
            {errors.email}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={processing}
        className="flex h-[50px] w-full items-center justify-center rounded-full bg-gray-900 px-4 font-['Work_Sans'] font-semibold text-base text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {processing ? 'Enviando...' : 'Enviar link de recuperação'}
      </button>

      <Link href="/login" className="self-center font-medium text-base text-gray-500 underline">
        Voltar para o login
      </Link>
    </form>
  )
}

export default ForgotPasswordForm
