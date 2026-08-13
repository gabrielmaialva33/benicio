import { Head, Link } from '@inertiajs/react'
import { ShieldCheck, Users, Zap } from 'lucide-react'

import { LoginForm } from '~/components/auth'
import { AuthSplitLayout } from '~/layouts/auth/auth_split_layout'

export default function LoginPage() {
  return (
    <>
      <Head title="Login" />
      <AuthSplitLayout
        title="Sign in"
        subtitle="Enter your email and password to access your account"
        panelTitle="Welcome back to Benício"
        panelDescription="A focused workspace for legal teams to organize people, permissions and the work that matters."
        features={[
          {
            title: 'Role-based access',
            description: 'Granular permissions per tenant',
            icon: ShieldCheck,
          },
          { title: 'Multi-tenant', description: 'Switch workspaces in one click', icon: Users },
          { title: 'Production ready', description: 'JWT auth, queues and caching', icon: Zap },
        ]}
        footer={
          <>
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </>
        }
      >
        <LoginForm />
      </AuthSplitLayout>
    </>
  )
}
