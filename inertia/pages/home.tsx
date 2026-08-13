import { Head, Link } from '@inertiajs/react'
import { ArrowRight, Building2, FolderKanban, ShieldCheck } from 'lucide-react'

import { Button } from '~/components/ui/core/button'

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
)

const foundations = [
  {
    title: 'Workspaces for every firm',
    description: 'Multi-tenant accounts keep teams and access boundaries explicit from day one.',
    icon: Building2,
  },
  {
    title: 'Access under control',
    description: 'Roles, granular permissions and audit-ready foundations are built into the core.',
    icon: ShieldCheck,
  },
  {
    title: 'Legal workflows next',
    description: 'Cases, tasks, hearings and documents are being moved onto this new foundation.',
    icon: FolderKanban,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Head title="Legal operations, organized" />

      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary">
              <span className="font-bold text-primary-foreground">B</span>
            </div>
            <span className="text-xl font-semibold tracking-tight">Benício</span>
          </Link>

          <nav className="flex items-center gap-3">
            <a
              href="https://github.com/gabrielmaialva33/benicio"
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              GitHub
            </a>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Create account</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-28">
          <div>
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
              The new Benício foundation
            </span>
            <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
              Legal operations,
              <span className="text-primary"> organized.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Benício is being rebuilt as the canonical workspace for legal teams, bringing people,
              access and daily casework into one focused platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="px-7">
                  Create workspace
                  <ArrowRight className="ms-2 size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-7">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border bg-card p-7 shadow-xl shadow-primary/5">
            <div className="absolute -end-20 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-medium text-muted-foreground">Platform status</p>
              <h2 className="mt-2 text-2xl font-semibold">Foundation ready</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Authentication, tenancy, permissions, files and the web shell are running on the new
                stack. The legal domain will move in through tested vertical slices.
              </p>

              <div className="mt-7 space-y-3">
                {['AdonisJS 7 + Inertia', 'React 19 interface', 'Versioned REST API'].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-xl border bg-background px-4 py-3"
                    >
                      <span className="text-sm font-medium">{item}</span>
                      <span className="size-2 rounded-full bg-emerald-500" />
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
            {foundations.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-2xl border bg-card p-6">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-5 text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Benício · Legal operations platform</p>
        <a
          href="https://github.com/gabrielmaialva33/benicio"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
        >
          <GitHubIcon className="size-4" />
          Source code
        </a>
      </footer>
    </div>
  )
}
