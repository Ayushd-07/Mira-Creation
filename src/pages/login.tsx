import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/lib/services'
import { getErrorMessage } from '@/lib/api'
import { Factory, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-bg p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo & Brand */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary dark:bg-dark-primary rounded-2xl flex items-center justify-center overflow-hidden">
            {settings?.logo ? (
              <img src={settings.logo} alt="Company Logo" className="w-full h-full object-cover" />
            ) : (
              <Factory className="w-8 h-8 text-on-primary" />
            )}
          </div>
          <h1 className="font-display text-display text-on-background dark:text-dark-text">
            {settings?.companyName || 'Mira Creation'}
          </h1>
          <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted mt-1">
            Manufacturing Excellence Platform
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-surface dark:bg-dark-card border border-outline-variant dark:border-dark-border rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-stack-lg">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-background dark:text-dark-text mb-1">
                Welcome back
              </h2>
              <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
                Sign in to your account to continue
              </p>
            </div>

            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
                <p className="text-label-md text-danger">{error}</p>
              </div>
            )}

            <div className="space-y-stack-md">
              <Input
                label="Email"
                type="email"
                placeholder="you@miracreation.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[42px] text-on-surface-variant dark:text-dark-text-muted hover:text-on-surface dark:hover:text-dark-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-label-md text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-label-md text-on-surface-variant dark:text-dark-text-muted">
          &copy; 2026 {settings?.companyName || 'Mira Creation'}. All rights reserved.
        </p>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-surface-variant dark:bg-dark-card border border-outline-variant dark:border-dark-border rounded-lg">
          <p className="text-label-sm font-medium text-on-surface dark:text-dark-text mb-2">Demo Credentials:</p>
          <div className="space-y-1 text-label-sm text-on-surface-variant dark:text-dark-text-muted">
            <p><span className="font-medium">Admin:</span> admin@mira.com / admin123</p>
            <p><span className="font-medium">Manager:</span> manager@mira.com / manager123</p>

          </div>
        </div>
      </div>
    </div>
  )
}
