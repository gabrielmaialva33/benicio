import { useForm } from '@inertiajs/react'
import type { FormEvent, InputHTMLAttributes } from 'react'

interface RegisterFormProps {
  errors?: Record<string, string>
}

interface RegisterFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

function RegisterField({ label, error, name, ...props }: RegisterFieldProps) {
  const id = String(name)
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        {...props}
        id={id}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-[50px] w-full rounded-md border border-[#e1e3ea] bg-transparent px-3 font-semibold text-base text-gray-500 outline-none placeholder:text-gray-500 focus:border-gray-400"
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

export function RegisterForm({ errors: serverErrors }: RegisterFormProps = {}) {
  const { data, setData, post, processing, errors } = useForm({
    full_name: '',
    email: '',
    username: '',
    password: '',
    password_confirmation: '',
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    post('/register')
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4" noValidate>
      {serverErrors?.general && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverErrors.general}
        </p>
      )}

      <RegisterField
        label="Nome completo"
        type="text"
        name="full_name"
        value={data.full_name}
        onChange={(event) => setData('full_name', event.target.value)}
        error={errors.full_name}
        placeholder="Nome completo"
        required
        autoComplete="name"
      />
      <RegisterField
        label="E-mail"
        type="email"
        name="email"
        value={data.email}
        onChange={(event) => setData('email', event.target.value)}
        error={errors.email}
        placeholder="E-mail"
        required
        autoComplete="email"
      />
      <RegisterField
        label="Nome de usuário"
        type="text"
        name="username"
        value={data.username}
        onChange={(event) => setData('username', event.target.value)}
        error={errors.username}
        placeholder="Nome de usuário (opcional)"
        autoComplete="username"
      />
      <RegisterField
        label="Senha"
        type="password"
        name="password"
        value={data.password}
        onChange={(event) => setData('password', event.target.value)}
        error={errors.password}
        placeholder="Senha"
        required
        autoComplete="new-password"
      />
      <RegisterField
        label="Confirmar senha"
        type="password"
        name="password_confirmation"
        value={data.password_confirmation}
        onChange={(event) => setData('password_confirmation', event.target.value)}
        error={errors.password_confirmation}
        placeholder="Confirmar senha"
        required
        autoComplete="new-password"
      />

      <button
        type="submit"
        disabled={processing}
        className="mt-1 flex h-[50px] w-full items-center justify-center rounded-full bg-gray-900 px-4 font-['Work_Sans'] font-semibold text-base text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {processing ? 'Criando conta...' : 'Criar conta'}
      </button>
    </form>
  )
}

export default RegisterForm
