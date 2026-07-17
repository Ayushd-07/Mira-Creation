import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle, Factory } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    setIsLoading(false)
    setSent(true)
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
          {sent ? (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-background dark:text-surface mb-2">Check your email</h2>
              <p className="text-body-md text-on-surface-variant mb-6">
                We've sent a password reset link to <strong className="text-primary">{email}</strong>
              </p>
              <Link to="/login" className="text-primary font-medium hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
              <h2 className="font-headline-lg text-headline-lg text-on-background dark:text-surface mb-1">Forgot password?</h2>
              <p className="text-body-md text-on-surface-variant dark:text-outline-variant mb-8">
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
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