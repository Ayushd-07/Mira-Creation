import { Link } from 'react-router-dom'
import { ShieldAlert, Factory } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background dark:bg-on-background flex items-center justify-center p-4">
      <div className="text-center max-w-md animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-error-container rounded-full mb-6">
          <ShieldAlert className="w-10 h-10 text-error" />
        </div>
        <h1 className="font-display text-display text-on-background dark:text-surface mb-2">Access Denied</h1>
        <p className="text-body-lg text-on-surface-variant dark:text-outline-variant mb-8">
          You don't have permission to access this area. Contact your administrator.
        </p>
        <Link to="/">
          <Button variant="primary" size="lg">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}