import { NavLink, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { useLogout, useSession } from '@/auth/session'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/employees', label: 'Employees' },
  { to: '/insights', label: 'Insights' },
]

export function AppLayout() {
  const session = useSession()
  const logout = useLogout()

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:gap-6">
          <span className="font-semibold whitespace-nowrap"><span className="hidden sm:inline">Incubyte </span>Salary</span>
          <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to}
                       className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground',
                                                       isActive && 'bg-muted font-medium text-foreground')}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{session.data?.user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
