import { FolderOpen } from 'lucide-react'

export default function DocumentsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 text-muted-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <FolderOpen className="h-8 w-8" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">Documents</h2>
        <p className="text-sm mt-1">Document management coming soon.</p>
      </div>
    </div>
  )
}
