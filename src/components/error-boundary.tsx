import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.'
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Surface the error in the console for debugging without crashing the app.
    console.error('ErrorBoundary caught an error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-bg p-4">
          <div className="w-full max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-danger/10 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="font-display text-headline-lg text-on-background dark:text-dark-text">
              Something went wrong
            </h1>
            <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
              {this.state.message || 'The application encountered an unexpected error.'}
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md font-medium hover:opacity-90 transition-opacity"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}