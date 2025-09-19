import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, getUserProjects, requireRole } from '@/lib/auth-middleware'
import { CreateProjectSchema } from '@/lib/schemas'

/**
 * GET /api/projects - Get user's projects
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const projects = await getUserProjects(authResult.user.id)

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects - Create new project
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    // Check if user can create projects (ENGINEER or ADMIN)
    if (!requireRole(authResult.user.role, 'ENGINEER')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedFields = CreateProjectSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Invalid input fields', details: validatedFields.error.flatten() },
        { status: 400 }
      )
    }

    const { name, orgId, address, notes } = validatedFields.data

    // Verify organization exists
    const organization = await db.organization.findUnique({
      where: { id: orgId }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Create project in transaction
    const result = await db.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name,
          orgId,
          address,
          notes,
        },
        include: {
          organization: true,
        }
      })

      // Add creator as project owner
      await tx.membership.create({
        data: {
          userId: authResult.user.id,
          projectId: project.id,
          role: 'OWNER'
        }
      })

      return project
    })

    return NextResponse.json({ 
      message: 'Project created successfully',
      project: result 
    }, { status: 201 })

  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
