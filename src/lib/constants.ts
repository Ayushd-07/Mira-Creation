export const DEPARTMENTS = [
  'Stitching',
  'Cutting',
  'Quality Control',
  'Finishing',
  'Packaging',
  'Design',
] as const

export const FABRICS = [
  'Premium Cotton',
  'Mulberry Silk',
  'Italian Crepe',
  'Synthetic Velvet',
  'Cotton Silk',
] as const

export const PRODUCTION_STATUS = ['In Progress', 'Completed', 'Pending', 'On Hold'] as const

export const OUTGOING_STATUS = ['Delivered', 'Pending', 'Cancelled'] as const

export const WORKER_STATUS = ['Active', 'Inactive', 'On Leave'] as const

export const PAGE_SIZE = 10

export const ITEMS_PER_PAGE = [5, 10, 20, 50] as const

// Business Types for Indian businesses
export const BUSINESS_TYPES = [
  'Proprietorship',
  'Partnership Firm',
  'Limited Liability Partnership (LLP)',
  'Private Limited Company',
  'Public Limited Company',
  'One Person Company (OPC)',
  'Hindu Undivided Family (HUF)',
  'Trust',
  'Society',
  'Other',
] as const

// Indian States and Union Territories
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const

// Currencies - Only INR for Indian businesses
export const CURRENCIES = [
  { value: 'INR', label: '₹ INR (Indian Rupee)' },
] as const

// Timezones
export const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
] as const

// Date Formats
export const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
] as const

// Financial Year Start Months
export const FINANCIAL_YEAR_MONTHS = [
  { value: 'January', label: 'January' },
  { value: 'February', label: 'February' },
  { value: 'March', label: 'March' },
  { value: 'April', label: 'April' },
  { value: 'May', label: 'May' },
  { value: 'June', label: 'June' },
] as const