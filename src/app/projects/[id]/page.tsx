'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

interface ProjectData {
  id: string
  name: string
  address?: string
  notes?: string
  status: string
  organization: {
    id: string
    name: string
    address?: string
    email?: string
    phone?: string
  }
  areas: Array<{
    id: string
    name: string
    sqft?: number
    notes?: string
    units: Array<{
      id: string
      label: string
      make?: string
      model?: string
      tons?: number
      refrigerant?: string
    }>
    sessions: Array<{
      id: string
      title?: string
      status: string
      startedAt: string
      endedAt?: string
      author: {
        name: string
      }
      _count: {
        tests: number
      }
    }>
    _count: {
      units: number
      sessions: number
      files: number
    }
  }>
  userRole: string
  _count: {
    areas: number
    reports: number
  }
}

interface RecentSession {
  id: string
  title?: string
  status: string
  startedAt: string
  area: {
    name: string
  }
  author: {
    name: string
  }
  tests: Array<{
    pass?: boolean
  }>
  _count: {
    tests: number
  }
}

export default function ProjectDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }

    fetchProjectData()
    fetchRecentSessions()
  }, [session, projectId])

  const fetchProjectData = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        const project = data.projects.find((p: ProjectData) => p.id === projectId)
        if (project) {
          setProjectData(project)
        } else {
          router.push('/projects')
        }
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
      router.push('/projects')
    }
  }

  const fetchRecentSessions = async () => {
    try {
      const response = await fetch(`/api/sessions?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setRecentSessions(data.sessions.slice(0, 10)) // Show latest 10
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'APPROVED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const calculateProjectKPIs = () => {
    if (!projectData) return null

    const totalUnits = projectData.areas.reduce((sum, area) => sum + area.units.length, 0)
    const totalSessions = projectData.areas.reduce((sum, area) => sum + area.sessions.length, 0)
    const totalTests = recentSessions.reduce((sum, session) => sum + session._count.tests, 0)
    
    const passedTests = recentSessions.reduce((sum, session) => 
      sum + session.tests.filter(test => test.pass === true).length, 0
    )
    
    const completionRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

    return {
      totalUnits,
      totalSessions,
      totalTests,
      passedTests,
      completionRate
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!projectData) {
    return <div>Project not found</div>
  }

  const kpis = calculateProjectKPIs()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>›</span>
            <span className="text-gray-900 dark:text-white">{projectData.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {projectData.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                <span>{projectData.organization.name}</span>
                {projectData.address && (
                  <>
                    <span>•</span>
                    <span>{projectData.address}</span>
                  </>
                )}
                <span>•</span>
                <Badge className={getStatusColor(projectData.status)}>
                  {projectData.status}
                </Badge>
                <span>•</span>
                <Badge variant="secondary">
                  {projectData.userRole}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {projectData.areas.length > 0 && (
                <Button asChild>
                  <Link href={`/sessions/new?projectId=${projectId}`}>
                    New Session
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href={`/projects/${projectId}/settings`}>
                  Settings
                </Link>
              </Button>
            </div>
          </div>

          {projectData.notes && (
            <p className="text-gray-600 dark:text-gray-300 mt-4 max-w-3xl">
              {projectData.notes}
            </p>
          )}
        </div>

        {/* KPI Dashboard */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{projectData._count.areas}</div>
                <div className="text-sm text-gray-500">Areas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{kpis.totalUnits}</div>
                <div className="text-sm text-gray-500">HVAC Units</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{kpis.totalSessions}</div>
                <div className="text-sm text-gray-500">Sessions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{kpis.totalTests}</div>
                <div className="text-sm text-gray-500">Total Tests</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${kpis.completionRate >= 80 ? 'text-green-600' : kpis.completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {kpis.completionRate}%
                </div>
                <div className="text-sm text-gray-500">Pass Rate</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="areas">Areas ({projectData.areas.length})</TabsTrigger>
            <TabsTrigger value="sessions">Sessions ({kpis?.totalSessions || 0})</TabsTrigger>
            <TabsTrigger value="reports">Reports ({projectData._count.reports})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <strong className="text-sm font-medium">Organization:</strong>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{projectData.organization.name}</p>
                    {projectData.organization.address && (
                      <p className="text-sm text-gray-500">{projectData.organization.address}</p>
                    )}
                    {projectData.organization.email && (
                      <p className="text-sm text-gray-500">{projectData.organization.email}</p>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <strong className="text-sm font-medium">Project Details:</strong>
                    <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-gray-500">Areas:</span>
                        <div className="font-medium">{projectData._count.areas}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Total HVAC Units:</span>
                        <div className="font-medium">{kpis?.totalUnits || 0}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Your Role:</span>
                        <div className="font-medium">{projectData.userRole}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <div className="font-medium">{projectData.status}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Sessions</CardTitle>
                  <CardDescription>Latest commissioning activities</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentSessions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No sessions yet</p>
                  ) : (
                    <div className="space-y-3">
                      {recentSessions.slice(0, 5).map((session) => {
                        const passCount = session.tests.filter(t => t.pass === true).length
                        const failCount = session.tests.filter(t => t.pass === false).length
                        
                        return (
                          <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Link 
                                  href={`/sessions/${session.id}`}
                                  className="font-medium truncate hover:text-blue-600"
                                >
                                  {session.title || `Session ${session.id.slice(-8)}`}
                                </Link>
                                <Badge className={`${getStatusColor(session.status)} text-xs`}>
                                  {session.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                {session.area.name} • {session.author.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(session.startedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div className="text-green-600">✓ {passCount}</div>
                              <div className="text-red-600">✗ {failCount}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {recentSessions.length > 5 && (
                    <div className="mt-4 text-center">
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('sessions')}>
                        View All Sessions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="areas" className="space-y-6">
            {projectData.areas.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No areas defined
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Create areas to organize HVAC units and sessions
                  </p>
                  <Button>
                    Create First Area
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectData.areas.map((area) => (
                  <Card key={area.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            <Link 
                              href={`/projects/${projectId}/areas/${area.id}`}
                              className="hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {area.name}
                            </Link>
                          </CardTitle>
                          {area.sqft && (
                            <CardDescription>
                              {area.sqft.toLocaleString()} sq ft
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">
                            {area.units.length}
                          </div>
                          <div className="text-xs text-gray-500">Units</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-purple-600">
                            {area.sessions.length}
                          </div>
                          <div className="text-xs text-gray-500">Sessions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-orange-600">
                            {area._count?.files || 0}
                          </div>
                          <div className="text-xs text-gray-500">Files</div>
                        </div>
                      </div>

                      {area.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                          {area.notes}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" asChild className="flex-1">
                          <Link href={`/projects/${projectId}/areas/${area.id}`}>
                            View Details
                          </Link>
                        </Button>
                        {area.units.length > 0 && (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/sessions/new?areaId=${area.id}`}>
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
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">All Sessions</h3>
              <div className="flex gap-2">
                <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
                  <option>All Areas</option>
                  {projectData.areas.map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
                <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
                  <option>All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {recentSessions.map((session) => {
                const passCount = session.tests.filter(t => t.pass === true).length
                const failCount = session.tests.filter(t => t.pass === false).length
                const pendingCount = session._count.tests - passCount - failCount
                
                return (
                  <Card key={session.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Link 
                              href={`/sessions/${session.id}`}
                              className="text-lg font-medium hover:text-blue-600"
                            >
                              {session.title || `Session ${session.id.slice(-8)}`}
                            </Link>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <div>Area: {session.area.name}</div>
                            <div>Engineer: {session.author.name}</div>
                            <div>Date: {new Date(session.startedAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-sm font-medium text-green-600">✓ {passCount}</div>
                            <div className="text-xs text-gray-500">Passed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-red-600">✗ {failCount}</div>
                            <div className="text-xs text-gray-500">Failed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-600">⏳ {pendingCount}</div>
                            <div className="text-xs text-gray-500">Pending</div>
                          </div>
                          
                          <Button size="sm" asChild>
                            <Link href={`/sessions/${session.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Reports</CardTitle>
                <CardDescription>
                  Generated commissioning reports for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  Report generation coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
