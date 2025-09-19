'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BuildingPressureSchema, type BuildingPressureData } from '@/lib/schemas'
import { checkBuildingPressure } from '@/lib/calculations'

interface BuildingPressureFormProps {
  sessionId: string
  testType: string
  sessionData: any
  onComplete: () => void
  onCancel: () => void
}

export function BuildingPressureForm({
  sessionId,
  testType,
  sessionData,
  onComplete,
  onCancel
}: BuildingPressureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [computed, setComputed] = useState<any>(null)

  const form = useForm<BuildingPressureData>({
    resolver: zodResolver(BuildingPressureSchema),
    defaultValues: {
      location: '',
      deltaP_inwc: 0,
      targetMin: 0.02,
      targetMax: 0.05,
      exhaustOn: false,
      notes: ''
    }
  })

  const watchedValues = form.watch()

  // Real-time calculation when pressure changes
  const handlePressureChange = (pressure: number) => {
    if (pressure > 0) {
      const result = checkBuildingPressure(pressure)
      setComputed({
        calculations: { pressure_inwc: pressure },
        checks: { building_pressure: result },
        pass: result.pass,
        summary: result.message
      })
    } else {
      setComputed(null)
    }
  }

  const onSubmit = async (data: BuildingPressureData) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          testType,
          unitId: null, // Building pressure is not unit-specific
          reading: data,
          notes: data.notes
        })
      })

      if (response.ok) {
        onComplete()
      } else {
        const error = await response.json()
        console.error('Failed to save test:', error)
      }
    } catch (error) {
      console.error('Error saving test:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Building Pressure Test
          {computed && (
            <Badge variant={computed.pass ? 'default' : 'destructive'}>
              {computed.pass ? 'PASS' : 'FAIL'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Measure building pressurization relative to outdoor conditions.
          Target range: 0.02 - 0.05 in. w.c.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Test Location *</Label>
            <Input
              id="location"
              placeholder="e.g., Main corridor, Classroom 101"
              {...form.register('location')}
            />
            {form.formState.errors.location && (
              <p className="text-sm text-red-600">{form.formState.errors.location.message}</p>
            )}
          </div>

          {/* Pressure Reading */}
          <div className="space-y-2">
            <Label htmlFor="deltaP_inwc">Pressure Difference (in. w.c.) *</Label>
            <Input
              id="deltaP_inwc"
              type="number"
              step="0.001"
              min="0"
              max="0.2"
              placeholder="0.035"
              {...form.register('deltaP_inwc', { 
                valueAsNumber: true,
                onChange: (e) => handlePressureChange(parseFloat(e.target.value) || 0)
              })}
            />
            {form.formState.errors.deltaP_inwc && (
              <p className="text-sm text-red-600">{form.formState.errors.deltaP_inwc.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Measure inside pressure minus outside pressure
            </p>
          </div>

          {/* Real-time Results */}
          {computed && (
            <Card className={`border-l-4 ${computed.pass ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10' : 'border-l-red-500 bg-red-50 dark:bg-red-900/10'}`}>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">Live Results</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Measured Pressure:</span>
                    <span className="font-mono">{watchedValues.deltaP_inwc.toFixed(3)}" w.c.</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Range:</span>
                    <span className="font-mono">0.020 - 0.050" w.c.</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Result:</span>
                    <span className={computed.pass ? 'text-green-600' : 'text-red-600'}>
                      {computed.pass ? '✓ PASS' : '✗ FAIL'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{computed.summary}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Exhaust Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded"
                {...form.register('exhaustOn')}
              />
              Exhaust fans running during test
            </Label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional observations, equipment used, conditions..."
              {...form.register('notes')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button 
              type="submit" 
              disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting ? 'Saving...' : 'Save Test Result'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Testing Guidelines
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Ensure all doors and windows are closed</li>
              <li>• Allow building pressure to stabilize before reading</li>
              <li>• Take multiple readings and use average if needed</li>
              <li>• Note any unusual weather conditions</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
