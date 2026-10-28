import { type FormEvent, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLogin, useSession } from '@/auth/session'
import { FullPageMessage } from '@/components/FullPageMessage'

type LocationState = { from?: { pathname: string; search: string } } | null

export function LoginPage() {
  const session = useSession()
  const login = useLogin()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (session.isPending) return <FullPageMessage>Loading…</FullPageMessage>

  if (session.data?.user) {
    const from = (location.state as LocationState)?.from
    return <Navigate to={from ? `${from.pathname}${from.search}` : '/employees'} replace />
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    login.mutate({ email, password })
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Incubyte Salary Management</CardTitle>
          <CardDescription>Log in with your HR Manager account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {login.error && (
              <Alert variant="destructive">
                <AlertDescription>{login.error.message}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" required value={email}
                     onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password}
                     onChange={(event) => setPassword(event.target.value)} />
            </div>
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
