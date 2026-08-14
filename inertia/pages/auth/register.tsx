import { Head, Link } from '@inertiajs/react'

import { RegisterForm } from '~/components/auth'
import { AuthSplitLayout } from '~/layouts/auth/auth_split_layout'

interface RegisterPageProps {
  errors?: Record<string, string>
}

export default function RegisterPage({ errors }: RegisterPageProps) {
  return (
    <>
      <Head title="Register" />
      <AuthSplitLayout
        title="Criar conta"
        subtitle="Preencha seus dados para começar"
        footer={
          <>
            <span>Já possui uma conta? </span>
            <Link href="/login" className="font-semibold text-[#f97316] hover:underline">
              Fazer login
            </Link>
          </>
        }
      >
        <RegisterForm errors={errors} />
      </AuthSplitLayout>
    </>
  )
}
