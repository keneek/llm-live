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

interface AreaData {
  id: string
  name: string
  sqft?: number
  notes?: string
  project: {
    id: string
    name: string
    organization: {
      name: string
    }
  }
  units: Array<{
    id: string
    label: string
    make?: string
    model?: string
    serialNum?: string
    stages?: number
    tons?: number
    refrigerant?: string
    notes?: string
    tests: Array<{
      id: string
      testType: string
      pass?: boolean
      createdAt: string
      session: {
        id: string
        title?: string
        status: string
      }
    }>
    _count: {
      tests: number
      files: number
    }
  }>
  sessions: Array<{
    id: string
    title?: string
    status: string
    startedAt: string
    endedAt?: string
    author: {
      id: string
      name: string
      email: string
    }
    tests: Array<{
      pass?: boolean
    }>
    _count: {
      tests: number
      files: number
    }
  }>
  _count: {
    units: number
    sessions: number
    files: number
  }
}

export default function AreaDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const areaId = params.areaId as string

  const [areaData, setAreaData] = useState<AreaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }

    fetchAreaData()
  }, [session, projectId, areaId])

  const fetchAreaData = async () => {
    try {
      // First get areas for the project
      const response = await fetch(`/api/areas?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        const area = data.areas.find((a: AreaData) => a.id === areaId)
        if (area) {
          setAreaData(area)
        } else {
          router.push(`/projects/${projectId}`)
        }
      }
    } catch (error) {
      console.error('Failed to fetch area:', error)
      router.push(`/projects/${projectId}`)
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

  const calculateAreaKPIs = () => {
    if (!areaData) return null

    const totalTests = areaData.sessions.reduce((sum, session) => sum + session._count.tests, 0)
    const passedTests = areaData.sessions.reduce((sum, session) => 
      sum + session.tests.filter(test => test.pass === true).length, 0
    )
    const failedTests = areaData.sessions.reduce((sum, session) => 
      sum + session.tests.filter(test => test.pass === false).length, 0
    )
    
    const completionRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
    const totalCapacity = areaData.units.reduce((sum, unit) => sum + (unit.tons || 0), 0)
    
    // Recent session activity
    const recentSessions = areaData.sessions
      .filter(s => new Date(s.startedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .length

    return {
      totalTests,
      passedTests,
      failedTests,
      completionRate,
      totalCapacity,
      recentSessions
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!areaData) {
    return <div>Area not found</div>
  }

  const kpis = calculateAreaKPIs()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>›</span>
            <Link 
              href={`/projects/${projectId}`}
              className="hover:text-blue-600"
            >
              {areaData.project.name}
            </Link>
            <span>›</span>
            <span className="text-gray-900 dark:text-white">{areaData.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {areaData.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                <span>{areaData.project.organization.name}</span>
                {areaData.sqft && (
                  <>
                    <span>•</span>
                    <span>{areaData.sqft.toLocaleString()} sq ft</span>
                  </>
                )}
                <span>•</span>
                <span>{areaData.units.length} HVAC units</span>
                <span>•</span>
                <span>{areaData.sessions.length} sessions</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {areaData.units.length > 0 && (
                <Button asChild>
                  <Link href={`/sessions/new?areaId=${areaId}`}>
                    New Session
                  </Link>
                </Button>
              )}
              <Button variant="outline">
                Add Unit
              </Button>
              <Button variant="outline">
                Edit Area
              </Button>
            </div>
          </div>

          {areaData.notes && (
            <p className="text-gray-600 dark:text-gray-300 mt-4 max-w-3xl">
              {areaData.notes}
            </p>
          )}
        </div>

        {/* KPI Dashboard */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{areaData.units.length}</div>
                <div className="text-sm text-gray-500">HVAC Units</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{kpis.totalCapacity.toFixed(1)}</div>
                <div className="text-sm text-gray-500">Total Tons</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{areaData.sessions.length}</div>
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
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600">{kpis.recentSessions}</div>
                <div className="text-sm text-gray-500">Recent (30d)</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="units">HVAC Units ({areaData.units.length})</TabsTrigger>
            <TabsTrigger value="sessions">Sessions ({areaData.sessions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Area Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Area Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Square Footage:</span>
                      <div className="font-medium">{areaData.sqft?.toLocaleString() || 'Not specified'} sq ft</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">HVAC Units:</span>
                      <div className="font-medium">{areaData.units.length}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Total Capacity:</span>
                      <div className="font-medium">{kpis?.totalCapacity.toFixed(1)} tons</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Sessions:</span>
                      <div className="font-medium">{areaData.sessions.length}</div>
                    </div>
                  </div>
                  
                  {areaData.notes && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-sm font-medium">Notes:</span>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{areaData.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Unit Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Equipment Summary</CardTitle>
                  <CardDescription>HVAC units in this area</CardDescription>
                </CardHeader>
                <CardContent>
                  {areaData.units.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No HVAC units defined</p>
                      <Button size="sm">Add First Unit</Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {areaData.units.map((unit) => {
                        const recentTests = unit.tests.slice(0, 3)
                        const passCount = unit.tests.filter(t => t.pass === true).length
                        const failCount = unit.tests.filter(t => t.pass === false).length
                        
                        return (
                          <div key={unit.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium">{unit.label}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {unit.make} {unit.model}
                                  {unit.tons && ` • ${unit.tons} tons`}
                                  {unit.refrigerant && ` • ${unit.refrigerant}`}
                                </p>
                              </div>
                              <div className="text-right text-sm">
                                <div className="text-green-600">✓ {passCount}</div>
                                <div className="text-red-600">✗ {failCount}</div>
                              </div>
                            </div>
                            
                            {recentTests.length > 0 && (
                              <div className="text-xs text-gray-500">
                                Recent: {recentTests.map(t => t.testType.replace('_', ' ')).join(', ')}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="units" className="space-y-6">
            {areaData.units.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No HVAC units
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Add HVAC units to start commissioning tests
                  </p>
                  <Button>
                    Add First Unit
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {areaData.units.map((unit) => {
                  const passCount = unit.tests.filter(t => t.pass === true).length
                  const failCount = unit.tests.filter(t => t.pass === false).length
                  const pendingCount = unit._count.tests - passCount - failCount
                  
                  return (
                    <Card key={unit.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{unit.label}</CardTitle>
                            <CardDescription>
                              {unit.make} {unit.model}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Unit Specifications */}
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          {unit.tons && (
                            <div>
                              <span className="text-gray-500">Capacity:</span>
                              <div className="font-medium">{unit.tons} tons</div>
                            </div>
                          )}
                          {unit.refrigerant && (
                            <div>
                              <span className="text-gray-500">Refrigerant:</span>
                              <div className="font-medium">{unit.refrigerant}</div>
                            </div>
                          )}
                          {unit.stages && (
                            <div>
                              <span className="text-gray-500">Stages:</span>
                              <div className="font-medium">{unit.stages}</div>
                            </div>
                          )}
                          {unit.serialNum && (
                            <div>
                              <span className="text-gray-500">Serial:</span>
                              <div className="font-medium text-xs">{unit.serialNum}</div>
                            </div>
                          )}
                        </div>

                        {/* Test Statistics */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{passCount}</div>
                            <div className="text-xs text-gray-500">Passed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">{failCount}</div>
                            <div className="text-xs text-gray-500">Failed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-600">{pendingCount}</div>
                            <div className="text-xs text-gray-500">Pending</div>
                          </div>
                        </div>

                        {unit.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                            {unit.notes}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            View Details
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            Edit Unit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Area Sessions</h3>
              {areaData.units.length > 0 && (
                <Button asChild>
                  <Link href={`/sessions/new?areaId=${areaId}`}>
                    New Session
                  </Link>
                </Button>
              )}
            </div>

            {areaData.sessions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No sessions yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Start your first commissioning session for this area
                  </p>
                  {areaData.units.length > 0 ? (
                    <Button asChild>
                      <Link href={`/sessions/new?areaId=${areaId}`}>
                        Create First Session
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-500">Add HVAC units first to create sessions</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {areaData.sessions.map((session) => {
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
                              <div>Engineer: {session.author.name}</div>
                              <div>
                                Started: {new Date(session.startedAt).toLocaleDateString()}
                                {session.endedAt && (
                                  <> • Ended: {new Date(session.endedAt).toLocaleDateString()}</>
                                )}
                              </div>
                              <div>
                                Tests: {session._count?.tests || 0} total, {session._count?.files || 0} files
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className="text-sm font-medium text-green-600">✓ {passCount}</div>
                              <div className="text-xs text-gray-500">Pass</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-red-600">✗ {failCount}</div>
                              <div className="text-xs text-gray-500">Fail</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-600">⏳ {pendingCount}</div>
                              <div className="text-xs text-gray-500">Pending</div>
                            </div>
                            
                            <Button size="sm" asChild>
                              <Link href={`/sessions/${session.id}`}>
                                Open Session
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
