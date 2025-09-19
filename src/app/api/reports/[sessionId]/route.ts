import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { db } from '@/lib/db'
import { authenticate, checkProjectAccess } from '@/lib/auth-middleware'
import { CommissioningReport } from '@/lib/pdf-generator'

/**
 * GET /api/reports/[sessionId] - Generate and download PDF report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const sessionId = params.sessionId

    // Get comprehensive session data for report
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
              select: { 
                id: true, 
                label: true, 
                make: true, 
                model: true, 
                tons: true,
                refrigerant: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
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

    const completionRate = session.tests.length > 0 
      ? Math.round((passFailStats.pass + passFailStats.fail) / session.tests.length * 100)
      : 0

    const statistics = {
      testsByType,
      passFailStats,
      completionRate
    }

    // Prepare data for PDF generation (convert dates to strings)
    const reportData = {
      session: {
        ...session,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString() || null,
        tests: session.tests.map(test => ({
          ...test,
          createdAt: test.createdAt.toISOString()
        })),
        statistics
      }
    }

    // Generate PDF
    const pdfStream = await renderToStream(
      React.createElement(CommissioningReport, { data: reportData }) as any
    )

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    
    return new Promise<NextResponse>((resolve) => {
      pdfStream.on('data', (chunk) => {
        chunks.push(chunk)
      })
      
      pdfStream.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        
        // Generate filename
        const sessionTitle = session.title || `Session-${session.id.slice(-8)}`
        const date = new Date(session.startedAt).toISOString().split('T')[0]
        const filename = `${sessionTitle.replace(/[^a-zA-Z0-9-_]/g, '-')}-${date}.pdf`

        // Return PDF as response
        const response = new NextResponse(pdfBuffer)
        response.headers.set('Content-Type', 'application/pdf')
        response.headers.set('Content-Disposition', `attachment; filename="${filename}"`)
        response.headers.set('Content-Length', pdfBuffer.length.toString())

        resolve(response)
      })

      pdfStream.on('error', (error) => {
        console.error('PDF generation error:', error)
        resolve(NextResponse.json(
          { error: 'Failed to generate PDF report' },
          { status: 500 }
        ))
      })
    })

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reports/[sessionId] - Save report metadata to database
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const sessionId = params.sessionId
    const body = await request.json()
    const { title, summary, pdfUrl } = body

    // Get session to verify access and get project info
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

    // Find existing report or create new one
    let report = await db.report.findFirst({
      where: { sessionId }
    })

    if (report) {
      // Update existing report
      report = await db.report.update({
        where: { id: report.id },
        data: {
          title: title || `${session.area.project.name} - ${session.area.name}`,
          summary,
          pdfUrl,
          status: 'GENERATED'
        }
      })
    } else {
      // Create new report
      report = await db.report.create({
        data: {
          projectId: session.area.project.id,
          areaId: session.area.id,
          sessionId,
          title: title || `${session.area.project.name} - ${session.area.name}`,
          summary,
          pdfUrl,
          status: 'GENERATED'
        }
      })
    }

    return NextResponse.json({ 
      message: 'Report saved successfully',
      report
    }, { status: 201 })

  } catch (error) {
    console.error('Save report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
