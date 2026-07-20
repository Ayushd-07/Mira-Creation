import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, Upload, Trash2, Factory, Building2, Moon, Sun, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { getSettings, updateSettings, uploadLogo, removeLogo, getBackupStatus, runManualBackup } from '@/lib/services'
import { BUSINESS_TYPES, CURRENCIES, INDIAN_STATES, TIMEZONES, DATE_FORMATS, FINANCIAL_YEAR_MONTHS } from '@/lib/constants'
import { toast } from '@/components/ui/toast'
import { getErrorMessage } from '@/lib/api'
import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/hooks/use-theme'
import { useAuth } from '@/hooks/use-auth'
import { z } from 'zod'

// Settings form schema
const settingsFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  displayName: z.string().optional(),
  businessType: z.string().optional(),
  logo: z.string().optional(),
  adminName: z.string().optional(),
  legalBusinessName: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal('')),
  businessPhone: z.string().optional(),
  alternatePhone: z.string().optional(),
  website: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
  country: z.string().optional(),
  gstRegistered: z.boolean().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  dateFormat: z.string().optional(),
  financialYearStart: z.string().optional(),
})

type SettingsForm = z.infer<typeof settingsFormSchema>

function sanitizeSettings(settings: any) {
  if (!settings) return null
  const sanitized = { ...settings }
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === null) {
      if (key === 'gstRegistered') {
        sanitized[key] = false
      } else {
        sanitized[key] = ''
      }
    }
  })
  sanitized.adminName = sanitized.adminName || ''
  sanitized.gstRegistered = Boolean(sanitized.gstRegistered)
  return sanitized
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isReadOnly = user?.role === 'manager'
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme, toggleTheme } = useTheme()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: sanitizeSettings(settings) || {
          companyName: '',
          displayName: '',
          businessType: '',
          logo: '',
          adminName: '',
          legalBusinessName: '',
      gstin: '',
      pan: '',
      businessEmail: '',
      businessPhone: '',
      alternatePhone: '',
      website: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pinCode: '',
      country: '',
      gstRegistered: false,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
      financialYearStart: '',
    },
  })

  // Watch for changes
  useEffect(() => {
    setHasUnsavedChanges(isDirty)
  }, [isDirty])

  useEffect(() => {
    if (settings) {
      reset(sanitizeSettings(settings))
      setLogoPreview(settings.logo || null)
    }
  }, [settings, reset])

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setHasUnsavedChanges(false)
      toast('success', 'Settings saved', 'Your changes have been saved successfully.')
    },
    onError: (error: any) => {
      toast('error', 'Save failed', getErrorMessage(error))
    },
  })

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      toast('error', 'Invalid file type', 'Please upload PNG, JPG, JPEG, WEBP, or SVG files only.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'File too large', 'Maximum file size is 5MB.')
      return
    }

    // Show preview
    const previewUrl = URL.createObjectURL(file)
    setLogoPreview(previewUrl)

    // Upload to server
    try {
      const result = await uploadLogo(file)
      setLogoPreview(result.logoUrl)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast('success', 'Logo uploaded', 'Your company logo has been uploaded.')
    } catch (error: any) {
      setLogoPreview(settings?.logo || null)
      toast('error', 'Upload failed', getErrorMessage(error))
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove the logo?')) return

    try {
      await removeLogo()
      setLogoPreview(null)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast('success', 'Logo removed', 'Company logo has been removed.')
    } catch (error: any) {
      toast('error', 'Remove failed', getErrorMessage(error))
    }
  }

  const onSubmit: SubmitHandler<SettingsForm> = (data) => {
    updateMutation.mutate(data)
  }

  const handleCancel = () => {
    if (settings) {
      reset(sanitizeSettings(settings))
      setLogoPreview(settings.logo || null)
      setHasUnsavedChanges(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant dark:text-dark-text-muted">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-section-gap">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="font-display text-display text-on-background dark:text-dark-text">Settings</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-dark-text-muted">
          Manage your business profile and preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-section-gap">
        {/* Company Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-background dark:text-dark-text">Company Profile</h2>
                <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
                  Your business information and branding
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-stack-lg">
              {/* Logo Upload */}
              <div>
                <label className="block text-label-md font-bold text-on-surface-variant dark:text-dark-text-muted mb-2">
                  Company Logo
                </label>
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-xl bg-surface-container-low dark:bg-dark-input border-2 border-dashed border-outline-variant dark:border-dark-border flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Company Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Factory className="w-8 h-8 text-on-surface-variant/30" />
                    )}
                  </div>
                   <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isReadOnly}
                      >
                        <Upload className="w-4 h-4" />
                        Choose Image
                      </Button>
                      {settings?.logo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="text-danger"
                          disabled={isReadOnly}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
                      Recommended size: 512 × 512 px
                    </p>
                    <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
                      Maximum size: 5 MB
                    </p>
                    <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
                      Supported formats: PNG, JPG, JPEG, WEBP, SVG
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <Controller
                  name="companyName"
                  control={control}
                  render={({ field }) => (
                    <Input label="Company Name *" error={errors.companyName?.message} required disabled={isReadOnly} {...field} />
                  )}
                />
                <Controller
                  name="displayName"
                  control={control}
                  render={({ field }) => (
                    <Input label="Display Name" disabled={isReadOnly} {...field} />
                  )}
                />
                <Controller
                  name="businessType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Business Type"
                      options={BUSINESS_TYPES.map((t) => ({ value: t, label: t }))}
                      placeholder="Select business type"
                      disabled={isReadOnly}
                      {...field}
                    />
                  )}
                />
                <Controller
                  name="adminName"
                  control={control}
                  render={({ field }) => (
                    <Input label="Admin User Name" disabled={isReadOnly} {...field} />
                  )}
                />

              </div>

            </div>
          </CardContent>
        </Card>


        {/* Theme Settings Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                {theme === 'dark' ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-background dark:text-dark-text">Theme Settings</h2>
                <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
                  Customize the look and feel of the application.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-label-md font-bold text-on-surface-variant dark:text-dark-text-muted">
                Dark Mode
              </p>
              <button
                type="button"
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Backup & Security Section (Admin Only) */}
        {!isReadOnly && <BackupSection />}
      </form>

      {/* Sticky Save Changes Bar */}
      {hasUnsavedChanges && !isReadOnly && (
        <div className="fixed bottom-0 left-0 lg:left-sidebar-width right-0 bg-surface dark:bg-dark-elevated border-t border-outline-variant dark:border-dark-border p-4 flex flex-col-reverse sm:flex-row justify-end gap-3 animate-slide-up z-40">
          <Button variant="secondary" onClick={handleCancel} disabled={updateMutation.isPending}>
            Cancel Changes
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} isLoading={updateMutation.isPending}>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  )
}

function BackupSection() {
  const queryClient = useQueryClient()

  const { data: backupStatus, isLoading } = useQuery({
    queryKey: ['backupStatus'],
    queryFn: getBackupStatus,
    refetchInterval: 15000,
  })

  const backupMutation = useMutation({
    mutationFn: runManualBackup,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['backupStatus'] })
      toast('success', 'Backup completed', `Successfully backed up ${data.recordCount || 0} database records and ${data.fileCount || 0} files to Google Drive.`)
    },
    onError: (error: any) => {
      toast('error', 'Backup failed', getErrorMessage(error))
    },
  })

  const latestLog = backupStatus?.latestLog

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-background dark:text-dark-text">Backup & Security</h2>
              <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted">
                Automatic Google Drive sync & single permanent cloud backup
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => backupMutation.mutate()}
            isLoading={backupMutation.isPending}
            disabled={backupMutation.isPending || isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${backupMutation.isPending ? 'animate-spin' : ''}`} />
            Backup Now
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <div className="p-4 rounded-xl bg-surface-container-low dark:bg-dark-input border border-outline-variant dark:border-dark-border">
            <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted mb-1">Backup Status</p>
            <div className="flex items-center gap-2">
              {latestLog?.status === 'success' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Success</span>
                </>
              ) : latestLog?.status === 'failed' ? (
                <>
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                  <span className="font-semibold text-rose-600 dark:text-rose-400">Failed</span>
                </>
              ) : (
                <span className="font-semibold text-on-surface-variant dark:text-dark-text-muted">Not Synced</span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low dark:bg-dark-input border border-outline-variant dark:border-dark-border">
            <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted mb-1">Last Backup</p>
            <p className="font-semibold text-on-background dark:text-dark-text">
              {latestLog?.completedAt
                ? new Date(latestLog.completedAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Never'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low dark:bg-dark-input border border-outline-variant dark:border-dark-border">
            <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted mb-1">Database Records</p>
            <p className="font-semibold text-on-background dark:text-dark-text">
              {latestLog?.recordCount !== undefined ? latestLog.recordCount.toLocaleString() : '0'} records
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low dark:bg-dark-input border border-outline-variant dark:border-dark-border">
            <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted mb-1">Files Synchronized</p>
            <p className="font-semibold text-on-background dark:text-dark-text">
              {latestLog?.fileCount !== undefined ? latestLog.fileCount.toLocaleString() : '0'} files
            </p>
          </div>
        </div>

        {latestLog?.error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
            <strong>Last Error:</strong> {latestLog.error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}