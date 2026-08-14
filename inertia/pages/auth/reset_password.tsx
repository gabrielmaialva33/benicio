import { Head } from '@inertiajs/react'

import { ResetPasswordForm } from '~/components/auth'
import { AuthSplitLayout } from '~/layouts/auth/auth_split_layout'

interface ResetPasswordPageProps {
  token: string
  tokenIsValid: boolean
}

export default function ResetPasswordPage({ token, tokenIsValid }: ResetPasswordPageProps) {
  return (
    <>
      <Head title="Criar nova senha" />
      <AuthSplitLayout
        title="Criar nova senha"
        subtitle={tokenIsValid ? 'Escolha uma senha nova para acessar sua conta.' : undefined}
      >
        <ResetPasswordForm token={token} tokenIsValid={tokenIsValid} />
      </AuthSplitLayout>
    </>
  )
}
