import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, checkProjectAccess } from '@/lib/auth-middleware'
import { CreateTestResultSchema } from '@/lib/schemas'
import { computeTestResult } from '@/lib/test-computations'
import { TestType } from '@prisma/client'

/**
 * POST /api/tests - Create new test result
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const validatedFields = CreateTestResultSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Invalid input fields', details: validatedFields.error.flatten() },
        { status: 400 }
      )
    }

    const { sessionId, unitId, testType, reading, notes } = validatedFields.data

    // Get session and verify access
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        area: {
          include: { project: true }
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
      'EDITOR'
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Verify unit exists if provided
    if (unitId) {
      const unit = await db.hvacUnit.findUnique({
        where: { id: unitId }
      })

      if (!unit) {
        return NextResponse.json(
          { error: 'HVAC unit not found' },
          { status: 404 }
        )
      }
    }

    // Get weather data from session for computations
    const weatherData = {
      outdoorTemp: session.weatherOADryBulb ?? undefined,
      outdoorRH: session.weatherOARH ?? undefined
    }

    // Compute test results
    let computed = undefined
    let pass = undefined
    
    try {
      const computation = computeTestResult(testType as TestType, reading, weatherData)
      computed = computation
      pass = computation.pass
    } catch (error) {
      console.error('Computation error:', error)
      // Continue without computation if it fails
    }

    // Create test result
    const testResult = await db.testResult.create({
      data: {
        sessionId,
        unitId,
        testType: testType as TestType,
        reading,
        computed: computed as any,
        pass,
        notes
      },
      include: {
        session: {
          include: {
            area: {
              include: { project: true }
            }
          }
        },
        unit: true
      }
    })

    return NextResponse.json({ 
      message: 'Test result created successfully',
      testResult 
    }, { status: 201 })

  } catch (error) {
    console.error('Create test result error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tests - Get test results with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const unitId = searchParams.get('unitId')
    const testType = searchParams.get('testType')

    const whereClause: any = {}
    
    if (sessionId) {
      // Verify session access
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

      whereClause.sessionId = sessionId
    }

    if (unitId) whereClause.unitId = unitId
    if (testType) whereClause.testType = testType as TestType

    const testResults = await db.testResult.findMany({
      where: whereClause,
      include: {
        session: {
          include: {
            area: {
              include: { project: true }
            }
          }
        },
        unit: true,
        files: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ testResults })

  } catch (error) {
    console.error('Get test results error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
