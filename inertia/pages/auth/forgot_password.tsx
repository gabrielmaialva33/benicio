import { Head } from '@inertiajs/react'

import { ForgotPasswordForm } from '~/components/auth'
import { AuthSplitLayout } from '~/layouts/auth/auth_split_layout'

export default function ForgotPasswordPage() {
  return (
    <>
      <Head title="Esqueci minha senha" />
      <AuthSplitLayout
        title="Esqueci minha senha"
        subtitle="Informe o e-mail cadastrado e enviaremos um link para criar uma nova senha."
      >
        <ForgotPasswordForm />
      </AuthSplitLayout>
    </>
  )
}
