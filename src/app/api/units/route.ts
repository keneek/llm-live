import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, checkProjectAccess } from '@/lib/auth-middleware'
import { CreateHvacUnitSchema } from '@/lib/schemas'

/**
 * GET /api/units - Get HVAC units with optional filtering
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
      // Get area to verify project access
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
    } else if (projectId) {
      // Get all units for project areas
      const projectAreas = await db.area.findMany({
        where: { projectId },
        select: { id: true }
      })
      whereClause.areaId = { in: projectAreas.map(a => a.id) }
    }

    if (!projectIdToCheck) {
      return NextResponse.json(
        { error: 'Area ID or Project ID is required' },
        { status: 400 }
      )
    }

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

    const units = await db.hvacUnit.findMany({
      where: whereClause,
      include: {
        area: {
          include: {
            project: {
              include: { organization: true }
            }
          }
        },
        tests: {
          select: {
            id: true,
            testType: true,
            pass: true,
            createdAt: true,
            session: {
              select: { id: true, title: true, status: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        files: {
          select: { id: true, filename: true, url: true, mimeType: true, label: true, category: true }
        },
        _count: {
          select: {
            tests: true,
            files: true
          }
        }
      },
      orderBy: { label: 'asc' }
    })

    return NextResponse.json({ units })

  } catch (error) {
    console.error('Get units error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/units - Create new HVAC unit
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const validatedFields = CreateHvacUnitSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Invalid input fields', details: validatedFields.error.flatten() },
        { status: 400 }
      )
    }

    const { label, areaId, make, model, serialNum, stages, tons, refrigerant, notes } = validatedFields.data

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

    // Check for duplicate unit label within the same area
    const existingUnit = await db.hvacUnit.findFirst({
      where: {
        areaId,
        label
      }
    })

    if (existingUnit) {
      return NextResponse.json(
        { error: 'A unit with this label already exists in this area' },
        { status: 409 }
      )
    }

    const unit = await db.hvacUnit.create({
      data: {
        label,
        areaId,
        make,
        model,
        serialNum,
        stages,
        tons,
        refrigerant,
        notes
      },
      include: {
        area: {
          include: {
            project: { include: { organization: true } }
          }
        }
      }
    })

    return NextResponse.json({ 
      message: 'HVAC unit created successfully',
      unit 
    }, { status: 201 })

  } catch (error) {
    console.error('Create unit error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
