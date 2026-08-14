import { Link, useForm, usePage } from '@inertiajs/react'
import type { FormEvent } from 'react'

interface ResetPasswordFormProps {
  token: string
  /** `false` quando o link já expirou, foi usado ou nem existe. */
  tokenIsValid: boolean
}

const campoDeSenhaClasses =
  'h-[50px] w-full rounded-md border border-[#e1e3ea] bg-transparent px-3 font-semibold text-base text-gray-500 outline-none placeholder:text-gray-500 focus:border-gray-400'

export function ResetPasswordForm({ token, tokenIsValid }: ResetPasswordFormProps) {
  const { data, setData, post, processing, errors } = useForm({
    token,
    password: '',
    password_confirmation: '',
  })
  const { errors: sharedErrors } = usePage().props as {
    errors?: Record<string, string | undefined>
  }
  // O erro de token inválido chega pelo flash do controller, não pelo formulário.
  const erroGeral = sharedErrors?.general

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    post('/reset-password')
  }

  if (!tokenIsValid) {
    return (
      <div className="flex w-full flex-col gap-5 text-center">
        <p className="rounded-md bg-red-50 px-3 py-3 text-sm leading-5 text-red-700">
          Este link de redefinição expirou ou já foi utilizado. Peça um novo para continuar.
        </p>
        <Link
          href="/forgot-password"
          className="flex h-[50px] w-full items-center justify-center rounded-full bg-gray-900 px-4 font-['Work_Sans'] font-semibold text-base text-white transition hover:bg-gray-800"
        >
          Pedir um novo link
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5" noValidate>
      {erroGeral && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-3 text-sm leading-5 text-red-700">
          {erroGeral}
        </p>
      )}

      <div>
        <label htmlFor="password" className="sr-only">
          Nova senha
        </label>
        <input
          id="password"
          type="password"
          name="password"
          value={data.password}
          onChange={(event) => setData('password', event.target.value)}
          placeholder="Nova senha"
          required
          minLength={8}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : 'password-hint'}
          className={campoDeSenhaClasses}
        />
        {errors.password ? (
          <p id="password-error" className="mt-1.5 text-sm text-red-600">
            {errors.password}
          </p>
        ) : (
          <p id="password-hint" className="mt-1.5 text-sm text-gray-500">
            Use pelo menos 8 caracteres.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password_confirmation" className="sr-only">
          Confirme a nova senha
        </label>
        <input
          id="password_confirmation"
          type="password"
          name="password_confirmation"
          value={data.password_confirmation}
          onChange={(event) => setData('password_confirmation', event.target.value)}
          placeholder="Confirme a nova senha"
          required
          minLength={8}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password_confirmation)}
          aria-describedby={
            errors.password_confirmation ? 'password-confirmation-error' : undefined
          }
          className={campoDeSenhaClasses}
        />
        {errors.password_confirmation && (
          <p id="password-confirmation-error" className="mt-1.5 text-sm text-red-600">
            {errors.password_confirmation}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={processing}
        className="flex h-[50px] w-full items-center justify-center rounded-full bg-gray-900 px-4 font-['Work_Sans'] font-semibold text-base text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {processing ? 'Salvando...' : 'Salvar nova senha'}
      </button>

      <Link href="/login" className="self-center font-medium text-base text-gray-500 underline">
        Voltar para o login
      </Link>
    </form>
  )
}

export default ResetPasswordForm
