// Auth route group layout — centered card layout for login/register screens
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">{children}</div>
    </main>
  )
}
