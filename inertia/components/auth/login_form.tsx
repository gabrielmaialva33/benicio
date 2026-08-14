import { Link, useForm } from '@inertiajs/react'
import type { FormEvent } from 'react'

import { useFlash } from '~/hooks/use_flash'

export function LoginForm() {
  const { data, setData, post, processing, errors } = useForm({
    uid: '',
    password: '',
  })
  const flash = useFlash()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    post('/login')
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
        <label htmlFor="uid" className="sr-only">
          E-mail
        </label>
        <input
          id="uid"
          type="text"
          name="uid"
          value={data.uid}
          onChange={(event) => setData('uid', event.target.value)}
          placeholder="E-mail"
          required
          autoComplete="username"
          aria-invalid={Boolean(errors.uid)}
          aria-describedby={errors.uid ? 'uid-error' : undefined}
          className="h-[50px] w-full rounded-md border border-[#e1e3ea] bg-transparent px-3 font-semibold text-base text-gray-500 outline-none placeholder:text-gray-500 focus:border-gray-400"
        />
        {errors.uid && (
          <p id="uid-error" className="mt-1.5 text-sm text-red-600">
            {errors.uid}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="sr-only">
          Senha
        </label>
        <input
          id="password"
          type="password"
          name="password"
          value={data.password}
          onChange={(event) => setData('password', event.target.value)}
          placeholder="Senha"
          required
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="h-[50px] w-full rounded-md border border-[#e1e3ea] bg-transparent px-3 font-semibold text-base text-gray-500 outline-none placeholder:text-gray-500 focus:border-gray-400"
        />
        {errors.password && (
          <p id="password-error" className="mt-1.5 text-sm text-red-600">
            {errors.password}
          </p>
        )}
      </div>

      <Link
        href="/forgot-password"
        className="self-stretch text-right font-medium text-base text-gray-500 underline"
      >
        Esqueci minha senha
      </Link>

      <button
        type="submit"
        disabled={processing}
        className="flex h-[50px] w-full items-center justify-center rounded-full bg-gray-900 px-4 font-['Work_Sans'] font-semibold text-base text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {processing ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}

export default LoginForm
