import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle, Factory } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    setIsLoading(false)
    setSuccess(true)
  }

  return (
    <div className="min-h-screen bg-background dark:bg-on-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in-scale">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/25">
            <Factory className="w-8 h-8 text-on-primary" />
          </div>
          <h1 className="font-display text-display text-on-background dark:text-surface font-bold">Mira Creation</h1>
        </div>

        <div className="bg-surface dark:bg-on-secondary-fixed-variant border border-outline-variant dark:border-outline rounded-2xl p-8 shadow-xl">
          {success ? (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-background dark:text-surface mb-2">Password reset</h2>
              <p className="text-body-md text-on-surface-variant mb-6">Your password has been reset successfully.</p>
              <Link to="/login" className="text-primary font-medium hover:underline">Back to login</Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary mb-6 transition-colors">
                ← Back to login
              </Link>
              <h2 className="font-headline-lg text-headline-lg text-on-background dark:text-surface mb-1">Reset password</h2>
              <p className="text-body-md text-on-surface-variant dark:text-outline-variant mb-8">Enter your new password.</p>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-body-md font-medium">{error}</div>
                )}
                <div className="relative">
                  <Input
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}