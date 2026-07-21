const IMAGE_SIGNATURES: Record<string, { ext: string; test: (buffer: Buffer) => boolean }> = {
  'image/jpeg': {
    ext: 'jpg',
    test: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  'image/png': {
    ext: 'png',
    test: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  'image/webp': {
    ext: 'webp',
    test: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
}

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
}

export const allowedImageMimeTypes = Object.freeze(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

export function normalizeImageMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().trim()
  return MIME_ALIASES[normalized] || normalized
}

export function isAllowedImageExtension(fileName: string): boolean {
  const ext = (fileName.split('.').pop() || '').toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
}

export function assertSafeImageUpload(file: Express.Multer.File): { ext: string; mimeType: string } {
  const mimeType = normalizeImageMimeType(file.mimetype)
  const signature = IMAGE_SIGNATURES[mimeType]

  if (!signature || !isAllowedImageExtension(file.originalname)) {
    throw new Error('Only JPG, JPEG, PNG, and WEBP image files are allowed.')
  }

  if (!signature.test(file.buffer)) {
    throw new Error('Uploaded image content does not match the declared file type.')
  }

  return { ext: signature.ext, mimeType }
}
