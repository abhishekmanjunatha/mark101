import type { Metadata } from 'next'

export const metadata: Metadata = { title: '404 — Page Not Found' }

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found.</p>
      <a href="/" className="text-primary underline underline-offset-4">Go home</a>
    </main>
  )
}
