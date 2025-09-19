import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, checkProjectAccess } from '@/lib/auth-middleware'
import { deleteFile, extractKeyFromUrl } from '@/lib/s3-client'

/**
 * GET /api/files/[id] - Get file details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const fileId = params.id

    const file = await db.fileAsset.findUnique({
      where: { id: fileId },
      include: {
        project: {
          select: { id: true, name: true }
        },
        area: {
          select: { name: true }
        },
        session: {
          select: { title: true, startedAt: true }
        },
        testResult: {
          select: { testType: true },
          include: {
            unit: {
              select: { label: true }
            }
          }
        }
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Check access to the project
    if (file.projectId) {
      const hasAccess = await checkProjectAccess(
        authResult.user.id,
        file.projectId,
        'VIEWER'
      )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({ file })

  } catch (error) {
    console.error('Get file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/files/[id] - Delete file and metadata
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const fileId = params.id

    const file = await db.fileAsset.findUnique({
      where: { id: fileId },
      include: {
        project: {
          select: { id: true }
        }
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Check access to the project
    if (file.projectId) {
      const hasAccess = await checkProjectAccess(
        authResult.user.id,
        file.projectId,
        'EDITOR'
      )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    try {
      // Delete from S3
      const s3Key = extractKeyFromUrl(file.url)
      await deleteFile(s3Key)
    } catch (s3Error) {
      console.error('S3 delete error:', s3Error)
      // Continue with database deletion even if S3 delete fails
    }

    // Delete from database
    await db.fileAsset.delete({
      where: { id: fileId }
    })

    return NextResponse.json({ 
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('Delete file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/files/[id] - Update file metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const fileId = params.id
    const body = await request.json()

    const file = await db.fileAsset.findUnique({
      where: { id: fileId },
      include: {
        project: {
          select: { id: true }
        }
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Check access to the project
    if (file.projectId) {
      const hasAccess = await checkProjectAccess(
        authResult.user.id,
        file.projectId,
        'EDITOR'
      )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // Only allow updating certain fields
    const allowedFields = ['label', 'category']
    const updateData: any = {}
    
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    const updatedFile = await db.fileAsset.update({
      where: { id: fileId },
      data: updateData,
      include: {
        project: {
          select: { name: true }
        },
        area: {
          select: { name: true }
        },
        session: {
          select: { title: true }
        },
        testResult: {
          select: { testType: true },
          include: {
            unit: {
              select: { label: true }
            }
          }
        }
      }
    })

    return NextResponse.json({ 
      message: 'File updated successfully',
      file: updatedFile
    })

  } catch (error) {
    console.error('Update file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
