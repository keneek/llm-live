import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, checkProjectAccess } from '@/lib/auth-middleware'
import { FileUploadSchema } from '@/lib/schemas'
import { z } from 'zod'

const SaveFileSchema = FileUploadSchema.extend({
  key: z.string().min(1, "S3 key is required"),
  url: z.string().url("Valid URL is required"),
  projectId: z.string().optional(),
  areaId: z.string().optional(),
  sessionId: z.string().optional(),
  testResultId: z.string().optional(),
})

/**
 * GET /api/files - List files with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const areaId = searchParams.get('areaId')
    const sessionId = searchParams.get('sessionId')
    const testResultId = searchParams.get('testResultId')
    const category = searchParams.get('category')

    // Build where clause
    const whereClause: any = {}
    
    if (testResultId) {
      whereClause.testResultId = testResultId
    } else if (sessionId) {
      whereClause.sessionId = sessionId
      whereClause.testResultId = null // Session files, not test-specific
    } else if (areaId) {
      whereClause.areaId = areaId
      whereClause.sessionId = null
      whereClause.testResultId = null
    } else if (projectId) {
      whereClause.projectId = projectId
      whereClause.areaId = null
      whereClause.sessionId = null
      whereClause.testResultId = null
    }

    if (category) {
      whereClause.category = category
    }

    // Verify access to project if specified
    if (projectId) {
      const hasAccess = await checkProjectAccess(
        authResult.user.id,
        projectId,
        'VIEWER'
      )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    const files = await db.fileAsset.findMany({
      where: whereClause,
      include: {
        project: {
          select: { name: true }
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
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ files })

  } catch (error) {
    console.error('Get files error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/files - Save file metadata after successful upload
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const validatedFields = SaveFileSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Invalid input fields', details: validatedFields.error.flatten() },
        { status: 400 }
      )
    }

    const { 
      filename, 
      mimeType, 
      fileSize, 
      category = 'OTHER', 
      label, 
      key, 
      url,
      projectId,
      areaId,
      sessionId,
      testResultId
    } = validatedFields.data

    // Verify access if project is specified
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

    // Verify related entities exist
    if (testResultId) {
      const testResult = await db.testResult.findUnique({
        where: { id: testResultId },
        include: { session: { include: { area: { include: { project: true } } } } }
      })

      if (!testResult) {
        return NextResponse.json(
          { error: 'Test result not found' },
          { status: 404 }
        )
      }

      // Verify access to the test result's project
      const hasAccess = await checkProjectAccess(
        authResult.user.id,
        testResult.session.area.project.id,
        'EDITOR'
      )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    } else if (sessionId) {
      const session = await db.session.findUnique({
        where: { id: sessionId },
        include: { area: { include: { project: true } } }
      })

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      const hasAccess = await checkProjectAccess(
        authResult.user.id,
        session.area.project.id,
        'EDITOR'
      )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    } else if (areaId) {
      const area = await db.area.findUnique({
        where: { id: areaId },
        include: { project: true }
      })

      if (!area) {
        return NextResponse.json(
          { error: 'Area not found' },
          { status: 404 }
        )
      }

      const hasAccess = await checkProjectAccess(
        authResult.user.id,
        area.project.id,
        'EDITOR'
      )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // Extract original filename (remove S3 prefix)
    const originalName = filename

    // Save file metadata to database
    const fileAsset = await db.fileAsset.create({
      data: {
        filename: key, // S3 key
        originalName,
        url,
        mimeType,
        fileSize,
        label,
        category,
        projectId,
        areaId,
        sessionId,
        testResultId,
      },
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
      message: 'File uploaded successfully',
      file: fileAsset
    }, { status: 201 })

  } catch (error) {
    console.error('Save file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
