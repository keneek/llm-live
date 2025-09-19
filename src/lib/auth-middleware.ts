import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'
import { db } from './db'
import { Role, RoleInProject } from '@prisma/client'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string
    email: string
    name: string
    role: Role
  }
}

/**
 * Middleware to authenticate API requests
 */
export async function authenticate(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user?.email) {
    return { error: 'Unauthorized', status: 401 }
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, role: true }
  })

  if (!user) {
    return { error: 'User not found', status: 401 }
  }

  return { user }
}

/**
 * Check if user has required role
 */
export function requireRole(userRole: Role, requiredRole: Role) {
  const roleHierarchy: Role[] = ['VIEWER', 'ENGINEER', 'ADMIN']
  const userRoleIndex = roleHierarchy.indexOf(userRole)
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)
  
  return userRoleIndex >= requiredRoleIndex
}

/**
 * Check if user has access to a specific project
 */
export async function checkProjectAccess(
  userId: string, 
  projectId: string, 
  requiredRole: RoleInProject = 'VIEWER'
) {
  const membership = await db.membership.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId
      }
    }
  })

  if (!membership) {
    return false
  }

  const roleHierarchy: RoleInProject[] = ['VIEWER', 'EDITOR', 'OWNER']
  const userRoleIndex = roleHierarchy.indexOf(membership.role)
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)
  
  return userRoleIndex >= requiredRoleIndex
}

/**
 * Get user's projects with their roles
 */
export async function getUserProjects(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          organization: true,
          areas: {
            include: {
              units: true,
              sessions: {
                select: {
                  id: true,
                  status: true,
                  createdAt: true
                }
              }
            }
          },
          _count: {
            select: {
              areas: true,
              reports: true
            }
          }
        }
      }
    },
    orderBy: {
      project: {
        updatedAt: 'desc'
      }
    }
  })

  return memberships.map(m => ({
    ...m.project,
    userRole: m.role,
    membershipId: m.id
  }))
}
