import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, requireRole } from '@/lib/auth-middleware'
import { z } from 'zod'

const CreateOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal(''))
})

/**
 * GET /api/organizations - Get organizations
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const organizations = await db.organization.findMany({
      include: {
        _count: {
          select: { projects: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('Get organizations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations - Create new organization
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    // Only ADMIN users can create organizations
    if (!requireRole(authResult.user.role, 'ADMIN')) {
      return NextResponse.json(
        { error: 'Only administrators can create organizations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedFields = CreateOrganizationSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Invalid input fields', details: validatedFields.error.flatten() },
        { status: 400 }
      )
    }

    const { name, address, phone, email } = validatedFields.data

    const organization = await db.organization.create({
      data: {
        name,
        address,
        phone,
        email: email || null
      }
    })

    return NextResponse.json({ 
      message: 'Organization created successfully',
      organization 
    }, { status: 201 })

  } catch (error) {
    console.error('Create organization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
