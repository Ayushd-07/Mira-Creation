export type Theme = 'light' | 'dark'

export type UserRole = 'admin' | 'manager'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface StockEntry {
  id: string
  date: string
  srNo: string
  design: string
  fabric: string
  pieces: number
  rate: number
  total: number
  supplier?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface IncomingEntry {
  id: string
  date: string
  srNo: string
  design: string
  fabric: string
  pieces: number
  rate: number
  total: number
  supplier?: string
  notes?: string
  itemId?: string
  item?: Item
  createdAt: string
  updatedAt: string
}

export interface OutgoingEntry {
  id: string
  date: string
  srNo: string
  design: string
  fabric: string
  pieces: number
  rate: number
  total: number
  customer: string
  dispatchDate: string
  vehicleNumber: string
  status: 'Delivered' | 'Pending' | 'Cancelled' | 'Dispatched'
  notes?: string
  itemId?: string
  item?: Item
  createdAt: string
  updatedAt: string
}

export type ProductionStatus = 'In Progress' | 'Completed' | 'Pending' | 'On Hold'

export interface ProductionLog {
  id: string
  date: string
  workerId: string
  workerName: string
  department: string
  design: string
  pieces: number
  rate: number
  total: number
  status: ProductionStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export type WorkerStatus = 'Active' | 'Inactive' | 'On Leave'

export interface Worker {
  id: string
  name: string
  workerId: string
  department: string
  phone: string
  email?: string
  address?: string
  salary?: number
  joiningDate?: string
  avatar?: string
  status: WorkerStatus
  createdAt: string
  updatedAt: string
}

export interface Department {
  id: string
  name: string
  description?: string
  workerCount: number
}

export interface DashboardStats {
  incomingToday: number
  outgoingToday: number
  incomingTodayPrice: number
  outgoingTodayPrice: number
  workersActive: number
  productionEfficiency: number
  pendingWork: number
  completedWork: number
  lowStockAlerts: number
  incomingTrend: number
  outgoingTrend: number
  workersOnDuty: number
  totalWorkers: number
}

export interface CompanySettings {
  companyName: string
  displayName?: string
  businessType?: string
  logo?: string
  adminName?: string
  legalBusinessName?: string
  gstin?: string
  pan?: string
  businessEmail?: string
  businessPhone?: string
  alternatePhone?: string
  website?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  pinCode?: string
  country?: string
  gstRegistered?: boolean
  currency: string
  timezone: string
  dateFormat: string
  financialYearStart?: string
  language: string
}

export interface NavItem {
  label: string
  icon: string
  path: string
  active?: boolean
}

export interface PaginationState {
  currentPage: number
  totalPages: number
  totalEntries: number
  pageSize: number
}

export interface SortState {
  column: string
  direction: 'asc' | 'desc'
}

export interface FilterState {
  search: string
  department?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export interface Activity {
  id: string
  type: 'incoming' | 'outgoing' | 'production' | 'worker' | 'system'
  message: string
  timestamp: string
  user: string
}

export interface Item {
  id: string
  itemCode: string
  itemName?: string
  fabricName: string
  itemImage?: string
  remark?: string
  status: 'Active' | 'Inactive'
  createdAt: string
  updatedAt: string
}