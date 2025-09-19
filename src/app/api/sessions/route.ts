import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, checkProjectAccess } from '@/lib/auth-middleware'
import { CreateSessionSchema } from '@/lib/schemas'

/**
 * GET /api/sessions - Get sessions with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const areaId = searchParams.get('areaId')
    const projectId = searchParams.get('projectId')

    let whereClause: any = {}
    let projectIdToCheck = projectId

    if (areaId) {
      // Get area to verify access
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

      projectIdToCheck = area.project.id
      whereClause.areaId = areaId
    }

    if (projectIdToCheck) {
      // Check project access
      const hasAccess = await checkProjectAccess(
        authResult.user.id,
        projectIdToCheck,
        'VIEWER'
      )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      if (!areaId) {
        // Get all sessions for project areas
        const projectAreas = await db.area.findMany({
          where: { projectId: projectIdToCheck },
          select: { id: true }
        })
        whereClause.areaId = { in: projectAreas.map(a => a.id) }
      }
    }

    const sessions = await db.session.findMany({
      where: whereClause,
      include: {
        area: {
          include: {
            project: {
              include: { organization: true }
            }
          }
        },
        author: {
          select: { id: true, name: true, email: true }
        },
        tests: {
          select: {
            id: true,
            testType: true,
            pass: true,
            createdAt: true,
            unit: {
              select: { id: true, label: true }
            }
          }
        },
        _count: {
          select: {
            tests: true,
            files: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ sessions })

  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sessions - Create new session
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const validatedFields = CreateSessionSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Invalid input fields', details: validatedFields.error.flatten() },
        { status: 400 }
      )
    }

    const { areaId, title, weatherOADryBulb, weatherOARH, weatherNotes, notes } = validatedFields.data

    // Verify area exists and check project access
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

    // Check project access
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

    // Create session
    const session = await db.session.create({
      data: {
        areaId,
        authorId: authResult.user.id,
        title,
        weatherOADryBulb,
        weatherOARH,
        weatherNotes,
        notes,
        status: 'DRAFT'
      },
      include: {
        area: {
          include: {
            project: {
              include: { organization: true }
            },
            units: true
          }
        },
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({ 
      message: 'Session created successfully',
      session 
    }, { status: 201 })

  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
