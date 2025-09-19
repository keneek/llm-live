import { NextRequest, NextResponse } from 'next/server'
import { authenticate, checkProjectAccess } from '@/lib/auth-middleware'
import { generateUploadUrl, getUploadFolder, validateFile as validateFileType, categorizeFile } from '@/lib/s3-client'
import { z } from 'zod'

const GenerateUploadUrlSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  fileSize: z.number().positive("File size must be positive"),
  projectId: z.string().optional(),
  areaId: z.string().optional(),
  sessionId: z.string().optional(),
  testResultId: z.string().optional(),
  category: z.enum(['PHOTO', 'IR_IMAGE', 'NAMEPLATE', 'DOCUMENT', 'OTHER']).optional()
})

/**
 * POST /api/files/upload - Generate presigned upload URL
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const validatedFields = GenerateUploadUrlSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Invalid input fields', details: validatedFields.error.flatten() },
        { status: 400 }
      )
    }

    const { filename, mimeType, fileSize, projectId, areaId, sessionId, testResultId, category } = validatedFields.data

    // Validate file type and size
    const mockFile = { type: mimeType, size: fileSize } as File
    const validation = validateFileType(mockFile)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // If projectId is provided, verify access
    if (projectId) {
      const hasAccess = await checkProjectAccess(
        authResult.user.id,
        projectId,
        'EDITOR'
      )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // Generate folder structure and upload URL
    const folder = getUploadFolder({ projectId, areaId, sessionId, testResultId, category })
    const upload = await generateUploadUrl(filename, mimeType, folder)

    // Auto-categorize if not provided
    const fileCategory = category || categorizeFile(mimeType)

    return NextResponse.json({
      uploadUrl: upload.uploadUrl,
      key: upload.key,
      publicUrl: upload.publicUrl,
      category: fileCategory,
      folder
    })

  } catch (error) {
    console.error('Generate upload URL error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
