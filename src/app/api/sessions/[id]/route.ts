import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, checkProjectAccess } from '@/lib/auth-middleware'

/**
 * GET /api/sessions/[id] - Get session details with tests
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

    const sessionId = params.id

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        area: {
          include: {
            project: {
              include: { organization: true }
            },
            units: {
              orderBy: { label: 'asc' }
            }
          }
        },
        author: {
          select: { id: true, name: true, email: true }
        },
        tests: {
          include: {
            unit: {
              select: { id: true, label: true, make: true, model: true }
            },
            files: {
              select: { id: true, filename: true, url: true, mimeType: true, label: true }
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
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check project access
    const hasAccess = await checkProjectAccess(
      authResult.user.id,
      session.area.project.id,
      'VIEWER'
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Calculate session statistics
    const testsByType = session.tests.reduce((acc, test) => {
      acc[test.testType] = (acc[test.testType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const passFailStats = session.tests.reduce((acc, test) => {
      if (test.pass === true) acc.pass++
      else if (test.pass === false) acc.fail++
      else acc.pending++
      return acc
    }, { pass: 0, fail: 0, pending: 0 })

    const sessionWithStats = {
      ...session,
      statistics: {
        testsByType,
        passFailStats,
        completionRate: session.tests.length > 0 
          ? Math.round((passFailStats.pass + passFailStats.fail) / session.tests.length * 100)
          : 0
      }
    }

    return NextResponse.json({ session: sessionWithStats })

  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/sessions/[id] - Update session
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

    const sessionId = params.id
    const body = await request.json()

    // Get session to verify access
    const existingSession = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        area: { include: { project: true } }
      }
    })

    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check project access
    const hasAccess = await checkProjectAccess(
      authResult.user.id,
      existingSession.area.project.id,
      'EDITOR'
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate update fields
    const allowedFields = [
      'title', 'weatherOADryBulb', 'weatherOARH', 'weatherNotes', 
      'notes', 'status', 'endedAt'
    ]
    
    const updateData: any = {}
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    // Auto-set endedAt when status changes to non-draft
    if (body.status && body.status !== 'DRAFT' && !existingSession.endedAt) {
      updateData.endedAt = new Date()
    }

    const updatedSession = await db.session.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        area: {
          include: {
            project: { include: { organization: true } }
          }
        },
        author: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { tests: true, files: true }
        }
      }
    })

    return NextResponse.json({ 
      message: 'Session updated successfully',
      session: updatedSession 
    })

  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sessions/[id] - Delete session (admin only)
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

    // Only admins or project owners can delete sessions
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete sessions' },
        { status: 403 }
      )
    }

    const sessionId = params.id

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        area: { include: { project: true } }
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Delete session and related data
    await db.session.delete({
      where: { id: sessionId }
    })

    return NextResponse.json({ 
      message: 'Session deleted successfully'
    })

  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
