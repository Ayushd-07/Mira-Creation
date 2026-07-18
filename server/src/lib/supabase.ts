import { createClient } from '@supabase/supabase-js'
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

export function useSupabaseStorage(): boolean {
  return Boolean(supabase)
}

const localUploadsDir = join(process.cwd(), 'uploads', 'items')

export async function uploadItemImage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  if (useSupabaseStorage() && supabase) {
    const ext = (fileName.split('.').pop() || 'png').toLowerCase()
    const path = `items/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    const { data, error } = await supabase.storage
      .from('item-images')
      .upload(path, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      throw error
    }

    const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
    return urlData.publicUrl
  } else {
    // Local fallback
    if (!existsSync(localUploadsDir)) {
      try {
        mkdirSync(localUploadsDir, { recursive: true })
      } catch (err) {
        console.error('Failed to create local uploads/items directory:', err)
      }
    }
    const ext = (fileName.split('.').pop() || 'png').toLowerCase()
    const filename = `item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
    writeFileSync(join(localUploadsDir, filename), fileBuffer)
    return `/uploads/items/${filename}`
  }
}

export async function deleteItemImage(imageUrl: string): Promise<void> {
  if (!imageUrl) return

  if (imageUrl.startsWith('http') && useSupabaseStorage() && supabase) {
    try {
      const bucketName = 'item-images'
      const searchString = `/storage/v1/object/public/${bucketName}/`
      const index = imageUrl.indexOf(searchString)
      if (index === -1) return

      const path = imageUrl.substring(index + searchString.length)
      if (!path) return

      const { error } = await supabase.storage.from(bucketName).remove([path])
      if (error) {
        console.warn('Failed to delete image from Supabase storage:', error)
      }
    } catch (err) {
      console.warn('Error deleting image from Supabase storage:', err)
    }
  } else if (imageUrl.startsWith('/uploads/items/')) {
    // Delete local file
    const filename = imageUrl.replace('/uploads/items/', '')
    const filePath = join(localUploadsDir, filename)
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath)
      }
    } catch (err) {
      console.warn('Failed to delete local image file:', err)
    }
  }
}
