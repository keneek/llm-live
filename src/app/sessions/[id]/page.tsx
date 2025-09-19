'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TestEntryForm } from '@/components/test-forms/test-entry-form'
import { FileUpload } from '@/components/file-upload/file-upload'
import { FileGallery } from '@/components/file-upload/file-gallery'
import { ReportGenerator } from '@/components/reports/report-generator'

interface SessionData {
  id: string
  title?: string
  startedAt: string
  endedAt?: string
  weatherOADryBulb?: number
  weatherOARH?: number
  weatherNotes?: string
  notes?: string
  status: string
  area: {
    id: string
    name: string
    sqft?: number
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
      tons?: number
      refrigerant?: string
    }>
  }
  author: {
    id: string
    name: string
    email: string
  }
  tests: Array<{
    id: string
    testType: string
    reading: any
    computed: any
    pass?: boolean
    notes?: string
    createdAt: string
    unit?: {
      id: string
      label: string
    }
  }>
  statistics: {
    testsByType: Record<string, number>
    passFailStats: {
      pass: number
      fail: number
      pending: number
    }
    completionRate: number
  }
  files: Array<{
    id: string
    filename: string
    originalName: string
    url: string
    mimeType: string
    fileSize: number
    label?: string
    category: string
    createdAt: string
  }>
  _count: {
    tests: number
    files: number
  }
}

// Test type categorization
const ENVELOPE_TESTS = [
  'BUILDING_PRESSURE',
  'PRESSURE_DECAY', 
  'RETURN_CURB_LEAKAGE',
  'SLAB_WALL_MOISTURE'
]

const HVAC_TESTS = [
  'AIRFLOW_STATIC',
  'REFRIGERANT_CIRCUIT',
  'COIL_PERFORMANCE',
  'FAN_EVAP_RECHECK',
  'ECONOMIZER_SEAL',
  'DISTRIBUTION_MIXING'
]

export default function SessionDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [files, setFiles] = useState<any[]>([])
  const [filesLoading, setFilesLoading] = useState(false)

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }

    fetchSession()
    fetchFiles()
  }, [session, sessionId])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setSessionData(data.session)
      } else {
        // Handle error - session not found or no access
        router.push('/projects')
      }
    } catch (error) {
      console.error('Failed to fetch session:', error)
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchFiles = async () => {
    try {
      setFilesLoading(true)
      const response = await fetch(`/api/files?sessionId=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files)
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setFilesLoading(false)
    }
  }

  const handleFileUploaded = (file: any) => {
    setFiles(prev => [file, ...prev])
    // Update session file count
    if (sessionData) {
      setSessionData({
        ...sessionData,
        _count: {
          ...sessionData._count,
          files: sessionData._count.files + 1
        }
      })
    }
  }

  const handleFileUpdate = async (fileId: string, updates: any) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const { file } = await response.json()
        setFiles(prev => prev.map(f => f.id === fileId ? file : f))
      }
    } catch (error) {
      console.error('Failed to update file:', error)
    }
  }

  const handleFileDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return
    }

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId))
        // Update session file count
        if (sessionData) {
          setSessionData({
            ...sessionData,
            _count: {
              ...sessionData._count,
              files: Math.max(0, sessionData._count.files - 1)
            }
          })
        }
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  const updateSessionStatus = async (status: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        await fetchSession() // Refresh data
      }
    } catch (error) {
      console.error('Failed to update session status:', error)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!sessionData) {
    return <div>Session not found</div>
  }

  const envelopeTests = sessionData.tests.filter(t => ENVELOPE_TESTS.includes(t.testType))
  const hvacTests = sessionData.tests.filter(t => HVAC_TESTS.includes(t.testType))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>›</span>
            <Link 
              href={`/projects/${sessionData.area.project.id}`}
              className="hover:text-blue-600"
            >
              {sessionData.area.project.name}
            </Link>
            <span>›</span>
            <span>{sessionData.area.name}</span>
            <span>›</span>
            <span className="text-gray-900 dark:text-white">
              {sessionData.title || `Session ${sessionData.id.slice(-8)}`}
            </span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {sessionData.title || `Session ${sessionData.id.slice(-8)}`}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                <span>{sessionData.area.project.organization.name}</span>
                <span>•</span>
                <span>{sessionData.author.name}</span>
                <span>•</span>
                <span>
                  {new Date(sessionData.startedAt).toLocaleDateString()}
                  {sessionData.endedAt && (
                    <> - {new Date(sessionData.endedAt).toLocaleDateString()}</>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(sessionData.status)}>
                {sessionData.status}
              </Badge>
              
              {sessionData.status === 'DRAFT' && (
                <Button 
                  variant="outline"
                  onClick={() => updateSessionStatus('SUBMITTED')}
                >
                  Submit for Review
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={() => setActiveTab('summary')}
              >
                Generate Report
              </Button>
            </div>
          </div>
        </div>

        {/* Session Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{sessionData._count.tests}</div>
              <div className="text-sm text-gray-500">Total Tests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{sessionData.statistics.passFailStats.pass}</div>
              <div className="text-sm text-gray-500">Passed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{sessionData.statistics.passFailStats.fail}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{sessionData.statistics.completionRate}%</div>
              <div className="text-sm text-gray-500">Complete</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="hvac">HVAC Tests ({hvacTests.length})</TabsTrigger>
            <TabsTrigger value="envelope">Envelope Tests ({envelopeTests.length})</TabsTrigger>
            <TabsTrigger value="media">Media ({sessionData._count.files})</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Session Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Session Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <strong className="text-sm font-medium">Area:</strong>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {sessionData.area.name}
                      {sessionData.area.sqft && ` (${sessionData.area.sqft.toLocaleString()} sq ft)`}
                    </p>
                  </div>
                  
                  {(sessionData.weatherOADryBulb || sessionData.weatherOARH) && (
                    <div>
                      <strong className="text-sm font-medium">Weather Conditions:</strong>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {sessionData.weatherOADryBulb}°F, {sessionData.weatherOARH}%RH
                      </p>
                      {sessionData.weatherNotes && (
                        <p className="text-sm text-gray-500 mt-1">{sessionData.weatherNotes}</p>
                      )}
                    </div>
                  )}

                  {sessionData.notes && (
                    <div>
                      <strong className="text-sm font-medium">Notes:</strong>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{sessionData.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* HVAC Units */}
              <Card>
                <CardHeader>
                  <CardTitle>HVAC Units ({sessionData.area.units.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sessionData.area.units.map((unit) => (
                      <div key={unit.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="font-medium">{unit.label}</div>
                          <div className="text-sm text-gray-500">
                            {unit.make} {unit.model}
                            {unit.tons && ` • ${unit.tons} tons`}
                            {unit.refrigerant && ` • ${unit.refrigerant}`}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {sessionData.tests.filter(t => t.unit?.id === unit.id).length} tests
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="hvac" className="space-y-6">
            <TestEntryForm
              sessionId={sessionId}
              sessionData={sessionData}
              testCategory="HVAC"
              availableTests={HVAC_TESTS}
              onTestAdded={fetchSession}
            />
          </TabsContent>

          <TabsContent value="envelope" className="space-y-6">
            <TestEntryForm
              sessionId={sessionId}
              sessionData={sessionData}
              testCategory="ENVELOPE"
              availableTests={ENVELOPE_TESTS}
              onTestAdded={fetchSession}
            />
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Files</CardTitle>
                <CardDescription>
                  Add photos, IR images, nameplates, and documents to this session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFileUploaded={handleFileUploaded}
                  context={{
                    projectId: sessionData.area.project.id,
                    areaId: sessionData.area.id,
                    sessionId: sessionId
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Files ({files.length})</CardTitle>
                <CardDescription>
                  All files uploaded for this session
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <FileGallery
                    files={files}
                    onFileUpdate={handleFileUpdate}
                    onFileDelete={handleFileDelete}
                    showActions={true}
                    showContext={false}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Summary</CardTitle>
                <CardDescription>
                  Overall results and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Test Results Overview</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      <div>✅ {sessionData.statistics.passFailStats.pass} tests passed</div>
                      <div>❌ {sessionData.statistics.passFailStats.fail} tests failed</div>
                      <div>⏳ {sessionData.statistics.passFailStats.pending} tests pending</div>
                    </div>
                  </div>

                  {sessionData.statistics.passFailStats.fail > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-red-600">Failed Tests Require Attention</h4>
                      <div className="text-sm space-y-1">
                        {sessionData.tests
                          .filter(t => t.pass === false)
                          .map(test => (
                            <div key={test.id} className="text-red-600">
                              • {test.testType.replace('_', ' ')} 
                              {test.unit && ` (${test.unit.label})`}
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <ReportGenerator
              sessionId={sessionId}
              sessionData={sessionData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
