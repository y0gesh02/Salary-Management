import type { ReactNode } from 'react'

export function FullPageMessage({ children }: { children: ReactNode }) {
  return <div className="flex min-h-svh items-center justify-center p-4 text-muted-foreground">{children}</div>
}
