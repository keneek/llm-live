'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreateSessionSchema, type CreateSessionData } from '@/lib/schemas'

interface Area {
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
  }>
  _count: {
    units: number
  }
}

export default function NewSessionPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [areas, setAreas] = useState<Area[]>([])
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get query parameters
  const preselectedProjectId = searchParams.get('projectId')
  const preselectedAreaId = searchParams.get('areaId')

  const form = useForm<CreateSessionData>({
    resolver: zodResolver(CreateSessionSchema),
    defaultValues: {
      areaId: preselectedAreaId || '',
      title: '',
      weatherOADryBulb: undefined,
      weatherOARH: undefined,
      weatherNotes: '',
      notes: ''
    }
  })

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }

    fetchAreas()
  }, [session])

  useEffect(() => {
    if (preselectedAreaId && areas.length > 0) {
      const area = areas.find(a => a.id === preselectedAreaId)
      if (area) {
        setSelectedArea(area)
        form.setValue('areaId', area.id)
      }
    }
  }, [preselectedAreaId, areas, form])

  const fetchAreas = async () => {
    try {
      if (preselectedProjectId) {
        // Get areas for specific project
        const response = await fetch(`/api/areas?projectId=${preselectedProjectId}`)
        if (response.ok) {
          const data = await response.json()
          setAreas(data.areas)
        }
      } else {
        // Get all projects and their areas
        const response = await fetch('/api/projects')
        if (response.ok) {
          const data = await response.json()
          const allAreas: Area[] = []
          data.projects.forEach((project: any) => {
            project.areas?.forEach((area: any) => {
              allAreas.push({
                ...area,
                project: {
                  id: project.id,
                  name: project.name,
                  organization: project.organization
                }
              })
            })
          })
          setAreas(allAreas.filter(area => area._count.units > 0)) // Only areas with units
        }
      }
    } catch (error) {
      console.error('Failed to fetch areas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAreaChange = (areaId: string) => {
    const area = areas.find(a => a.id === areaId)
    setSelectedArea(area || null)
    form.setValue('areaId', areaId)
  }

  const onSubmit = async (data: CreateSessionData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/sessions/${result.session.id}`)
      } else {
        const error = await response.json()
        alert(`Failed to create session: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Failed to create session. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>›</span>
            {selectedArea ? (
              <>
                <Link 
                  href={`/projects/${selectedArea.project.id}`}
                  className="hover:text-blue-600"
                >
                  {selectedArea.project.name}
                </Link>
                <span>›</span>
                <Link 
                  href={`/projects/${selectedArea.project.id}/areas/${selectedArea.id}`}
                  className="hover:text-blue-600"
                >
                  {selectedArea.name}
                </Link>
                <span>›</span>
              </>
            ) : (
              <>
                <span>Sessions</span>
                <span>›</span>
              </>
            )}
            <span className="text-gray-900 dark:text-white">New Session</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create New Session
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Start a new commissioning session to log test results and evidence
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
              <CardDescription>
                Configure your commissioning session parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Area Selection */}
                <div className="space-y-2">
                  <Label htmlFor="area">Area *</Label>
                  <select
                    id="area"
                    value={form.watch('areaId')}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select an area...</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.project.name} - {area.name} ({area._count.units} units)
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.areaId && (
                    <p className="text-sm text-red-600">{form.formState.errors.areaId.message}</p>
                  )}
                  
                  {areas.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No areas with HVAC units found. Create areas and units before starting sessions.
                    </p>
                  )}
                </div>

                {/* Selected Area Info */}
                {selectedArea && (
                  <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">Selected Area Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">Project:</span>
                          <div className="font-medium">{selectedArea.project.name}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">Organization:</span>
                          <div className="font-medium">{selectedArea.project.organization.name}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">Area Size:</span>
                          <div className="font-medium">
                            {selectedArea.sqft ? `${selectedArea.sqft.toLocaleString()} sq ft` : 'Not specified'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">HVAC Units:</span>
                          <div className="font-medium">{selectedArea.units.length} units</div>
                        </div>
                      </div>
                      
                      {selectedArea.units.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Units: </span>
                          <span className="text-sm">
                            {selectedArea.units.map(u => u.label).join(', ')}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Session Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Session Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Initial Commissioning - July 2024"
                    {...form.register('title')}
                  />
                  <p className="text-xs text-gray-500">
                    Optional - leave blank to auto-generate from date
                  </p>
                </div>

                {/* Weather Conditions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Weather Conditions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weatherOADryBulb">Outdoor Air Temperature (°F)</Label>
                      <Input
                        id="weatherOADryBulb"
                        type="number"
                        min="-40"
                        max="150"
                        placeholder="95"
                        {...form.register('weatherOADryBulb', { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weatherOARH">Outdoor Air Relative Humidity (%)</Label>
                      <Input
                        id="weatherOARH"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="65"
                        {...form.register('weatherOARH', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weatherNotes">Weather Notes</Label>
                    <textarea
                      id="weatherNotes"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Sunny, light wind from south..."
                      {...form.register('weatherNotes')}
                    />
                  </div>
                </div>

                {/* Session Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Session Notes</Label>
                  <textarea
                    id="notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Project goals, special considerations, equipment available..."
                    {...form.register('notes')}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !form.formState.isValid}
                  >
                    {isSubmitting ? 'Creating Session...' : 'Create Session'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>

                {/* Help Text */}
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg mt-6">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Session Setup Tips
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Record outdoor weather conditions for accurate calculations</li>
                    <li>• Choose a descriptive session title for easy identification</li>
                    <li>• Ensure all HVAC units are running before starting tests</li>
                    <li>• Session data is automatically saved as you enter test results</li>
                    <li>• You can return to edit and add tests anytime</li>
                  </ul>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
