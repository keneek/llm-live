import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hvac-logger-files'
const UPLOAD_EXPIRES_IN = 15 * 60 // 15 minutes
const DOWNLOAD_EXPIRES_IN = 60 * 60 // 1 hour

export interface UploadUrlResponse {
  uploadUrl: string
  key: string
  publicUrl: string
}

/**
 * Generate presigned URL for file upload
 */
export async function generateUploadUrl(
  filename: string,
  mimeType: string,
  folder: string = 'general'
): Promise<UploadUrlResponse> {
  // Generate unique key with folder structure
  const extension = filename.split('.').pop() || ''
  const uniqueId = uuidv4()
  const key = `${folder}/${Date.now()}-${uniqueId}.${extension}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
    // Add metadata for better organization
    Metadata: {
      'original-filename': filename,
      'upload-timestamp': new Date().toISOString(),
    },
  })

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: UPLOAD_EXPIRES_IN,
  })

  const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`

  return {
    uploadUrl,
    key,
    publicUrl,
  }
}

/**
 * Generate presigned URL for file download/viewing
 */
export async function generateDownloadUrl(key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, {
    expiresIn: DOWNLOAD_EXPIRES_IN,
  })
}

/**
 * Delete file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
}

/**
 * Get folder path based on context
 */
export function getUploadFolder(context: {
  projectId?: string
  areaId?: string
  sessionId?: string
  testResultId?: string
  category?: string
}): string {
  const { projectId, areaId, sessionId, testResultId, category } = context
  
  let folder = 'general'
  
  if (testResultId) {
    folder = `projects/${projectId}/sessions/${sessionId}/tests/${testResultId}`
  } else if (sessionId) {
    folder = `projects/${projectId}/sessions/${sessionId}`
  } else if (areaId) {
    folder = `projects/${projectId}/areas/${areaId}`
  } else if (projectId) {
    folder = `projects/${projectId}`
  }
  
  if (category) {
    folder += `/${category.toLowerCase()}`
  }
  
  return folder
}

/**
 * Extract S3 key from public URL
 */
export function extractKeyFromUrl(url: string): string {
  try {
    const urlParts = new URL(url)
    return urlParts.pathname.substring(1) // Remove leading slash
  } catch {
    // If not a valid URL, assume it's already a key
    return url
  }
}

/**
 * Validate file type and size
 */
export interface FileValidationResult {
  valid: boolean
  error?: string
}

export function validateFile(file: File): FileValidationResult {
  // Maximum file size: 50MB
  const MAX_SIZE = 50 * 1024 * 1024
  
  // Allowed file types
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/tiff',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: 'File size must be less than 50MB'
    }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed. Please use images, PDF, or spreadsheet files.'
    }
  }

  return { valid: true }
}

/**
 * Get file category based on MIME type
 */
export function categorizeFile(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    // Check if it might be an IR image based on filename patterns
    return 'PHOTO' // Default to PHOTO, can be changed to IR_IMAGE manually
  }
  
  if (mimeType === 'application/pdf') {
    return 'DOCUMENT'
  }
  
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    return 'DOCUMENT'
  }
  
  return 'OTHER'
}
