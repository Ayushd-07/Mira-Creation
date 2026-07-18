import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const workerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  workerId: z.string().min(1, 'Worker ID is required'),
  department: z.string().min(1, 'Department is required'),
  phone: z.string().min(1, 'Phone is required').refine((val) => {
    const cleaned = val.replace(/\D/g, '')
    return cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith('91'))
  }, 'Phone number must be a valid 10-digit Indian mobile number').transform((val) => {
    const cleaned = val.replace(/\D/g, '')
    return cleaned.length === 12 && cleaned.startsWith('91') ? cleaned.slice(2) : cleaned
  }),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  salary: z.coerce.number().nonnegative().optional(),
  joiningDate: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'On Leave']).optional().default('Active'),
})

export const incomingSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  srNo: z.string().optional().or(z.literal('')),
  design: z.string().optional().or(z.literal('')),
  fabric: z.string().min(1, 'Fabric is required'),
  pieces: z.coerce.number().int().positive('Pieces must be greater than 0'),
  rate: z.coerce.number().nonnegative('Rate cannot be negative'),
  supplier: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  total: z.coerce.number().nonnegative().optional(),
}).transform((d) => ({ 
  ...d, 
  total: (d.pieces || 0) * (d.rate || 0),
}))

export const outgoingSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  srNo: z.string().optional().or(z.literal('')),
  design: z.string().optional().or(z.literal('')),
  fabric: z.string().min(1, 'Fabric is required'),
  pieces: z.coerce.number().int().positive('Pieces must be greater than 0'),
  rate: z.coerce.number().nonnegative('Rate cannot be negative'),
  customer: z.string().optional().or(z.literal('')),
  status: z.enum(['Pending', 'Dispatched', 'Delivered', 'Cancelled']).optional().default('Pending'),
  dispatchDate: z.string().optional().or(z.literal('')),
  vehicleNumber: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  total: z.coerce.number().nonnegative().optional(),
}).transform((d) => ({ 
  ...d, 
  total: (d.pieces || 0) * (d.rate || 0),
}))

export const productionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  workerId: z.string().min(1, 'Worker is required'),
  workerName: z.string().min(1, 'Worker name is required'),
  department: z.string().min(1, 'Department is required'),
  design: z.string().min(1, 'Design is required'),
  pieces: z.coerce.number().int().nonnegative().default(0),
  rate: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional().or(z.literal('')),
})

export const departmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().or(z.literal('')),
})

export const settingsSchema = z.object({
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
  currency: z.string().default('INR'),
  timezone: z.string().default('Asia/Kolkata'),
  language: z.string().default('en'),
  dateFormat: z.string().default('DD/MM/YYYY'),
  financialYearStart: z.string().optional(),
})

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one id is required'),
})

const z_changePassword = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

export default z_changePassword

// Helper to clean empty strings from validated data before sending to Prisma
export function cleanEmptyStrings<T extends Record<string, unknown>>(data: T): T {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === '' || value === null || value === undefined) {
      // Skip empty values - Prisma will use database defaults or NULL
      continue
    }
    cleaned[key] = value
  }
  return cleaned as T
}
