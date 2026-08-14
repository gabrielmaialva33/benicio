import { Head } from '@inertiajs/react'

import { LoginForm } from '~/components/auth'
import { AuthSplitLayout } from '~/layouts/auth/auth_split_layout'

export default function LoginPage() {
  return (
    <>
      <Head title="Login" />
      <AuthSplitLayout title="Fazer login">
        <LoginForm />
      </AuthSplitLayout>
    </>
  )
}
