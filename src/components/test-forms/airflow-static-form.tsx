'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AirflowStaticSchema, type AirflowStaticData } from '@/lib/schemas'
import { calculateCfmPerTon, checkCfmPerTon } from '@/lib/calculations'

interface AirflowStaticFormProps {
  sessionId: string
  testType: string
  unitId?: string
  sessionData: any
  onComplete: () => void
  onCancel: () => void
}

export function AirflowStaticForm({
  sessionId,
  testType,
  unitId,
  sessionData,
  onComplete,
  onCancel
}: AirflowStaticFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<string>(unitId || '')
  const [computed, setComputed] = useState<any>(null)

  // Get available units
  const units = sessionData.area.units || []
  const currentUnit = units.find((u: any) => u.id === selectedUnit)

  const form = useForm<AirflowStaticData>({
    resolver: zodResolver(AirflowStaticSchema),
    defaultValues: {
      unitLabel: currentUnit?.label || '',
      tons: currentUnit?.tons || 0,
      supplyCFM: 0,
      returnCFM: 0,
      extStatic_inwc: 0,
      mode: 'COOL',
      notes: ''
    }
  })

  const watchedValues = form.watch()

  // Update form when unit selection changes
  useEffect(() => {
    if (currentUnit) {
      form.setValue('unitLabel', currentUnit.label)
      form.setValue('tons', currentUnit.tons || 0)
    }
  }, [currentUnit, form])

  // Real-time calculation when CFM or tonnage changes
  useEffect(() => {
    const { supplyCFM, tons, extStatic_inwc } = watchedValues
    
    if (supplyCFM > 0 && tons > 0) {
      const cfmPerTon = calculateCfmPerTon(supplyCFM, tons)
      const cfmCheck = checkCfmPerTon(cfmPerTon)
      const staticPass = extStatic_inwc >= 0.3 && extStatic_inwc <= 1.5

      setComputed({
        calculations: {
          cfm_per_ton: cfmPerTon,
          supply_cfm: supplyCFM,
          external_static_inwc: extStatic_inwc
        },
        checks: {
          cfm_per_ton: cfmCheck,
          external_static: {
            pass: staticPass,
            value: extStatic_inwc,
            target: '0.3 - 1.5 in. w.c.',
            message: staticPass 
              ? 'External static pressure within normal range'
              : extStatic_inwc < 0.3 
                ? 'External static pressure too low'
                : 'External static pressure too high - check for restrictions'
          }
        },
        pass: cfmCheck.pass && staticPass,
        summary: `CFM/ton: ${cfmPerTon.toFixed(0)}, Static: ${extStatic_inwc.toFixed(2)}" w.c.`
      })
    } else {
      setComputed(null)
    }
  }, [watchedValues])

  const onSubmit = async (data: AirflowStaticData) => {
    if (!selectedUnit) {
      alert('Please select a unit')
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          testType,
          unitId: selectedUnit,
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
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Airflow & Static Pressure Test
          {computed && (
            <Badge variant={computed.pass ? 'default' : 'destructive'}>
              {computed.pass ? 'PASS' : 'FAIL'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Measure supply/return airflow and external static pressure.
          CFM/ton target for dehumidification: 350-400
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Unit Selection */}
          <div className="space-y-2">
            <Label htmlFor="unit">HVAC Unit *</Label>
            <select
              id="unit"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a unit...</option>
              {units.map((unit: any) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label} - {unit.make} {unit.model}
                  {unit.tons && ` (${unit.tons} tons)`}
                </option>
              ))}
            </select>
          </div>

          {currentUnit && (
            <Card className="bg-blue-50 dark:bg-blue-900/10">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">Unit Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">Make/Model:</span>
                    <div className="font-medium">{currentUnit.make} {currentUnit.model}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">Capacity:</span>
                    <div className="font-medium">{currentUnit.tons} tons</div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">Refrigerant:</span>
                    <div className="font-medium">{currentUnit.refrigerant || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">Stages:</span>
                    <div className="font-medium">{currentUnit.stages || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supply CFM */}
            <div className="space-y-2">
              <Label htmlFor="supplyCFM">Supply CFM *</Label>
              <Input
                id="supplyCFM"
                type="number"
                min="0"
                max="50000"
                placeholder="4500"
                {...form.register('supplyCFM', { valueAsNumber: true })}
              />
              {form.formState.errors.supplyCFM && (
                <p className="text-sm text-red-600">{form.formState.errors.supplyCFM.message}</p>
              )}
            </div>

            {/* Return CFM */}
            <div className="space-y-2">
              <Label htmlFor="returnCFM">Return CFM</Label>
              <Input
                id="returnCFM"
                type="number"
                min="0"
                max="50000"
                placeholder="4200"
                {...form.register('returnCFM', { valueAsNumber: true })}
              />
              <p className="text-xs text-gray-500">Optional - for reference</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* External Static */}
            <div className="space-y-2">
              <Label htmlFor="extStatic_inwc">External Static (in. w.c.) *</Label>
              <Input
                id="extStatic_inwc"
                type="number"
                step="0.01"
                min="0"
                max="5"
                placeholder="0.8"
                {...form.register('extStatic_inwc', { valueAsNumber: true })}
              />
              {form.formState.errors.extStatic_inwc && (
                <p className="text-sm text-red-600">{form.formState.errors.extStatic_inwc.message}</p>
              )}
            </div>

            {/* Operating Mode */}
            <div className="space-y-2">
              <Label htmlFor="mode">Operating Mode *</Label>
              <select
                id="mode"
                {...form.register('mode')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="COOL">Cooling</option>
                <option value="DEHUM">Dehumidification</option>
              </select>
            </div>
          </div>

          {/* Real-time Results */}
          {computed && (
            <Card className={`border-l-4 ${computed.pass ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10' : 'border-l-red-500 bg-red-50 dark:bg-red-900/10'}`}>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">Live Results</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>CFM/Ton:</span>
                      <span className="font-mono">{computed.calculations.cfm_per_ton.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target CFM/Ton:</span>
                      <span className="font-mono text-gray-500">350 - 400</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Airflow Result:</span>
                      <span className={computed.checks.cfm_per_ton.pass ? 'text-green-600' : 'text-red-600'}>
                        {computed.checks.cfm_per_ton.pass ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>External Static:</span>
                      <span className="font-mono">{watchedValues.extStatic_inwc.toFixed(2)}" w.c.</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Static:</span>
                      <span className="font-mono text-gray-500">0.3 - 1.5" w.c.</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Static Result:</span>
                      <span className={computed.checks.external_static.pass ? 'text-green-600' : 'text-red-600'}>
                        {computed.checks.external_static.pass ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center font-medium">
                    <span>Overall Result:</span>
                    <span className={`text-lg ${computed.pass ? 'text-green-600' : 'text-red-600'}`}>
                      {computed.pass ? '✓ PASS' : '✗ FAIL'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{computed.summary}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Equipment used, testing conditions, observations..."
              {...form.register('notes')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button 
              type="submit" 
              disabled={isSubmitting || !form.formState.isValid || !selectedUnit}
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
              <li>• Ensure unit is running in steady-state condition</li>
              <li>• Use calibrated airflow measuring equipment</li>
              <li>• For dehumidification mode, CFM/ton should be 350-400</li>
              <li>• External static should be between 0.3-1.5 in. w.c.</li>
              <li>• Take measurements at multiple points if needed</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
