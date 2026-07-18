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

    console.log(`[Supabase Storage] Attempting upload to bucket "item-images" for file: ${fileName}`)

    // 1. Ensure bucket exists
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()
      if (listError) {
        console.error('[Supabase Storage] Failed to list buckets:', listError)
      } else {
        const exists = buckets?.some(b => b.name === 'item-images')
        if (!exists) {
          console.log('[Supabase Storage] Bucket "item-images" not found, creating it as public...')
          const { error: createError } = await supabase.storage.createBucket('item-images', {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024 // 5MB
          })
          if (createError) {
            console.error('[Supabase Storage] Failed to create bucket "item-images":', createError)
          }
        }
      }
    } catch (err) {
      console.warn('[Supabase Storage] Error checking/creating bucket:', err)
    }

    // 2. Upload file
    const { data, error } = await supabase.storage
      .from('item-images')
      .upload(path, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (error) {
      console.error('[Supabase Storage] Upload error details:', error)
      throw error
    }

    // 3. Determine bucket public/private status and generate URL
    let isPublic = true
    try {
      const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('item-images')
      if (bucketError) {
        console.warn('[Supabase Storage] Failed to get bucket metadata, defaulting to public:', bucketError)
      } else if (bucketData) {
        isPublic = bucketData.public
      }
    } catch (err) {
      console.warn('[Supabase Storage] Error fetching bucket metadata, defaulting to public:', err)
    }

    if (isPublic) {
      const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
      console.log('[Supabase Storage] Upload successful. Public URL generated:', urlData.publicUrl)
      return urlData.publicUrl
    } else {
      // Bucket is private - generate a signed URL valid for 10 years (315,360,000 seconds)
      console.log('[Supabase Storage] Bucket "item-images" is private. Generating signed URL...')
      const tenYearsInSeconds = 60 * 60 * 24 * 365 * 10
      const { data: signedData, error: signedError } = await supabase.storage
        .from('item-images')
        .createSignedUrl(path, tenYearsInSeconds)
      
      if (signedError) {
        console.error('[Supabase Storage] Failed to generate signed URL for private bucket:', signedError)
        throw signedError
      }
      console.log('[Supabase Storage] Upload successful. Signed URL generated:', signedData.signedUrl)
      return signedData.signedUrl
    }
  } else if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Vercel Blob Storage persistent cloud upload fallback (production)
    console.log('[Vercel Blob] Uploading image to Vercel Blob...')
    const ext = (fileName.split('.').pop() || 'png').toLowerCase()
    const { put } = await import('@vercel/blob')
    const blob = await put(`items/item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`, fileBuffer, {
      access: 'public',
      contentType: mimeType,
    })
    console.log('[Vercel Blob] Upload successful:', blob.url)
    return blob.url
  } else {
    // Local fallback (development only)
    console.log('[Local Storage] Saving image locally to uploads/items...')
    if (!existsSync(localUploadsDir)) {
      try {
        mkdirSync(localUploadsDir, { recursive: true })
      } catch (err) {
        console.error('[Local Storage] Failed to create local uploads/items directory:', err)
      }
    }
    const ext = (fileName.split('.').pop() || 'png').toLowerCase()
    const filename = `item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
    writeFileSync(join(localUploadsDir, filename), fileBuffer)
    return `/uploads/items/${filename}`
  }
}

// Helper to sign older stored public Supabase URLs if the bucket is private
export async function getItemImageUrl(storedUrl: string | null | undefined): Promise<string | null> {
  if (!storedUrl) return null
  
  if (!storedUrl.startsWith('http') || !useSupabaseStorage() || !supabase) {
    return storedUrl
  }

  const bucketName = 'item-images'
  const searchString = `/storage/v1/object/public/${bucketName}/`
  const index = storedUrl.indexOf(searchString)
  if (index === -1) {
    // Not a public storage URL, or already a signed URL
    return storedUrl
  }

  try {
    const { data: bucketData } = await supabase.storage.getBucket(bucketName)
    if (bucketData && !bucketData.public) {
      // Bucket is private, dynamically convert to a signed URL valid for 10 years
      const path = storedUrl.substring(index + searchString.length)
      if (path) {
        const tenYearsInSeconds = 60 * 60 * 24 * 365 * 10
        const { data: signedData, error: signError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(path, tenYearsInSeconds)
        
        if (signError) {
          console.error('[Supabase Storage] Dynamic URL signing failed:', signError)
        } else if (signedData?.signedUrl) {
          return signedData.signedUrl
        }
      }
    }
  } catch (err) {
    console.warn('[Supabase Storage] Error dynamically signing existing URL:', err)
  }

  return storedUrl
}

export async function deleteItemImage(imageUrl: string): Promise<void> {
  if (!imageUrl) return

  if (imageUrl.startsWith('https://') && imageUrl.includes('public.blob.vercel-storage.com')) {
    // Delete from Vercel Blob
    try {
      const { del } = await import('@vercel/blob')
      await del(imageUrl)
    } catch (err) {
      console.warn('[Vercel Blob] Failed to delete image from Vercel Blob storage:', err)
    }
  } else if (imageUrl.startsWith('http') && useSupabaseStorage() && supabase) {
    try {
      const bucketName = 'item-images'
      // Try to match both public and signed formats
      let path = ''
      const publicSearch = `/storage/v1/object/public/${bucketName}/`
      const signedSearch = `/storage/v1/object/sign/${bucketName}/`
      
      let index = imageUrl.indexOf(publicSearch)
      if (index !== -1) {
        path = imageUrl.substring(index + publicSearch.length)
      } else {
        index = imageUrl.indexOf(signedSearch)
        if (index !== -1) {
          // Remove query params from signed URL to get the file path
          const fullPath = imageUrl.substring(index + signedSearch.length)
          path = fullPath.split('?')[0]
        }
      }

      if (!path) return

      const { error } = await supabase.storage.from(bucketName).remove([path])
      if (error) {
        console.warn('[Supabase Storage] Failed to delete image from Supabase storage:', error)
      }
    } catch (err) {
      console.warn('[Supabase Storage] Error deleting image from Supabase storage:', err)
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
      console.warn('[Local Storage] Failed to delete local image file:', err)
    }
  }
}
