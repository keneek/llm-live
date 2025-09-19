import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, checkProjectAccess } from '@/lib/auth-middleware'
import { CreateAreaSchema, CreateHvacUnitSchema } from '@/lib/schemas'

/**
 * GET /api/areas - Get areas with optional filtering by project
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Check project access
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

    const areas = await db.area.findMany({
      where: { projectId },
      include: {
        project: {
          include: { organization: true }
        },
        units: {
          orderBy: { label: 'asc' }
        },
        sessions: {
          select: {
            id: true,
            title: true,
            status: true,
            startedAt: true,
            endedAt: true,
            author: {
              select: { id: true, name: true, email: true }
            },
            _count: {
              select: { tests: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            units: true,
            sessions: true,
            files: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ areas })

  } catch (error) {
    console.error('Get areas error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/areas - Create new area
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const validatedFields = CreateAreaSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Invalid input fields', details: validatedFields.error.flatten() },
        { status: 400 }
      )
    }

    const { name, projectId, sqft, notes } = validatedFields.data

    // Check project access
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

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const area = await db.area.create({
      data: {
        name,
        projectId,
        sqft,
        notes
      },
      include: {
        project: {
          include: { organization: true }
        }
      }
    })

    return NextResponse.json({ 
      message: 'Area created successfully',
      area 
    }, { status: 201 })

  } catch (error) {
    console.error('Create area error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
