'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Project {
  id: string
  name: string
  address?: string
  notes?: string
  status: string
  organization: {
    name: string
  }
  areas: Array<{
    id: string
    name: string
    units: Array<{ id: string; label: string }>
    sessions: Array<{ id: string; status: string; createdAt: string }>
  }>
  userRole: string
  _count: {
    areas: number
    reports: number
  }
}

export default function ProjectsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    fetchProjects()
  }, [session, status, router])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Projects
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage your HVAC commissioning projects
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/organizations">
                Organizations
              </Link>
            </Button>
            <Button asChild>
              <Link href="/projects/new">
                New Project
              </Link>
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No projects found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Get started by creating your first commissioning project
              </p>
              <Button asChild>
                <Link href="/projects/new">
                  Create Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg mb-1">
                        <Link 
                          href={`/projects/${project.id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {project.name}
                        </Link>
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {project.organization.name}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${project.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : project.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                        {project.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${project.userRole === 'OWNER'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : project.userRole === 'EDITOR'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                        {project.userRole}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.address && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {project.address}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {project._count.areas}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Areas
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {project.areas.reduce((sum, area) => sum + area.units.length, 0)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Units
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {project.areas.reduce((sum, area) => sum + area.sessions.length, 0)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Sessions
                      </div>
                    </div>
                  </div>

                  {project.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {project.notes}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link href={`/projects/${project.id}`}>
                        View Details
                      </Link>
                    </Button>
                    {project.areas.length > 0 && (
                      <Button size="sm" asChild className="flex-1">
                        <Link href={`/projects/${project.id}/sessions/new`}>
                          New Session
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* User Info */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Signed in as {session.user?.name} ({session.user?.email})
        </div>
      </div>
    </div>
  )
}
