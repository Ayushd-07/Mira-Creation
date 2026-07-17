import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

export type PaginationInput = z.infer<typeof paginationSchema>

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export function buildPagination(input: PaginationInput) {
  const skip = (input.page - 1) * input.pageSize
  return { skip, take: input.pageSize }
}

export function toPaginated<T>(data: T[], total: number, input: PaginationInput): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
  }
}

// Build a case-insensitive "contains" OR filter across the given fields.
export function searchFilter(search: string | undefined, fields: string[]) {
  if (!search) return undefined
  const like = `%${search}%`
  return {
    OR: fields.map((field) => ({ [field]: { contains: like } })),
  }
}