'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CoilPerformanceSchema, type CoilPerformanceData } from '@/lib/schemas'
import { calculateDewPoint, checkSupplyDewPoint } from '@/lib/calculations'

interface CoilPerformanceFormProps {
  sessionId: string
  testType: string
  unitId?: string
  sessionData: any
  onComplete: () => void
  onCancel: () => void
}

export function CoilPerformanceForm({
  sessionId,
  testType,
  unitId,
  sessionData,
  onComplete,
  onCancel
}: CoilPerformanceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<string>(unitId || '')
  const [computed, setComputed] = useState<any>(null)

  // Get available units
  const units = sessionData.area.units || []
  const currentUnit = units.find((u: any) => u.id === selectedUnit)

  const form = useForm<CoilPerformanceData>({
    resolver: zodResolver(CoilPerformanceSchema),
    defaultValues: {
      unitLabel: currentUnit?.label || '',
      returnDB_F: 0,
      returnRH_pct: 0,
      supplyDB_F: 0,
      supplyRH_pct: 0,
      condensateVolume_oz_per_30min: 0,
      notes: ''
    }
  })

  const watchedValues = form.watch()

  // Update form when unit selection changes
  useEffect(() => {
    if (currentUnit) {
      form.setValue('unitLabel', currentUnit.label)
    }
  }, [currentUnit, form])

  // Real-time calculation when temperatures and humidity change
  useEffect(() => {
    const { returnDB_F, returnRH_pct, supplyDB_F, supplyRH_pct } = watchedValues
    
    if (returnDB_F > 0 && returnRH_pct > 0 && supplyDB_F > 0 && supplyRH_pct > 0) {
      const returnDP = calculateDewPoint(returnDB_F, returnRH_pct)
      const supplyDP = calculateDewPoint(supplyDB_F, supplyRH_pct)
      const dewPointDrop = returnDP - supplyDP
      const tempDrop = returnDB_F - supplyDB_F
      
      const supplyDPCheck = checkSupplyDewPoint(supplyDP)
      
      // Check for reasonable temperature drop (8-25°F typical)
      const tempDropPass = tempDrop >= 8 && tempDrop <= 25
      
      // Check for reasonable humidity removal (supply RH should be higher due to cooling)
      const rhRise = supplyRH_pct - returnRH_pct
      const rhPass = rhRise >= 10 && rhRise <= 40 // Reasonable range for humidity rise

      setComputed({
        calculations: {
          return_dew_point_F: returnDP,
          supply_dew_point_F: supplyDP,
          dew_point_drop_F: dewPointDrop,
          temperature_drop_F: tempDrop,
          humidity_rise_pct: rhRise,
          condensate_oz_per_30min: watchedValues.condensateVolume_oz_per_30min || 0
        },
        checks: {
          supply_dew_point: supplyDPCheck,
          temperature_drop: {
            pass: tempDropPass,
            value: tempDrop,
            target: '8 - 25°F',
            message: tempDropPass 
              ? 'Temperature drop within normal range'
              : tempDrop < 8 
                ? 'Insufficient cooling - check refrigerant charge'
                : 'Excessive temperature drop - check airflow'
          },
          humidity_performance: {
            pass: rhPass,
            value: rhRise,
            target: '10 - 40% RH rise',
            message: rhPass
              ? 'Good dehumidification performance'
              : rhRise < 10
                ? 'Low humidity removal - coil may not be cold enough'
                : 'Excessive humidity rise - possible airflow issue'
          }
        },
        pass: supplyDPCheck.pass && tempDropPass && rhPass,
        summary: `Supply DP: ${supplyDP.toFixed(1)}°F, ΔT: ${tempDrop.toFixed(1)}°F, ΔRH: +${rhRise.toFixed(1)}%`
      })
    } else {
      setComputed(null)
    }
  }, [watchedValues])

  const onSubmit = async (data: CoilPerformanceData) => {
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
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Coil Performance Test
          {computed && (
            <Badge variant={computed.pass ? 'default' : 'destructive'}>
              {computed.pass ? 'PASS' : 'FAIL'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Measure temperature and humidity across the evaporator coil to assess dehumidification performance.
          Target supply dew point: 50-55°F under load conditions.
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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

          {/* Return Air Measurements */}
          <Card className="bg-green-50 dark:bg-green-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-green-800 dark:text-green-200">
                Return Air Conditions
              </CardTitle>
              <CardDescription>
                Measure air entering the unit (before coil)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="returnDB_F">Return Air Dry Bulb (°F) *</Label>
                  <Input
                    id="returnDB_F"
                    type="number"
                    min="-40"
                    max="150"
                    placeholder="75"
                    {...form.register('returnDB_F', { valueAsNumber: true })}
                  />
                  {form.formState.errors.returnDB_F && (
                    <p className="text-sm text-red-600">{form.formState.errors.returnDB_F.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnRH_pct">Return Air Relative Humidity (%) *</Label>
                  <Input
                    id="returnRH_pct"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="55"
                    {...form.register('returnRH_pct', { valueAsNumber: true })}
                  />
                  {form.formState.errors.returnRH_pct && (
                    <p className="text-sm text-red-600">{form.formState.errors.returnRH_pct.message}</p>
                  )}
                </div>
              </div>
              {computed && (
                <div className="text-sm text-green-700 dark:text-green-300">
                  Return Dew Point: {computed.calculations.return_dew_point_F.toFixed(1)}°F
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supply Air Measurements */}
          <Card className="bg-blue-50 dark:bg-blue-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-blue-800 dark:text-blue-200">
                Supply Air Conditions
              </CardTitle>
              <CardDescription>
                Measure air leaving the unit (after coil)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplyDB_F">Supply Air Dry Bulb (°F) *</Label>
                  <Input
                    id="supplyDB_F"
                    type="number"
                    min="-40"
                    max="150"
                    placeholder="58"
                    {...form.register('supplyDB_F', { valueAsNumber: true })}
                  />
                  {form.formState.errors.supplyDB_F && (
                    <p className="text-sm text-red-600">{form.formState.errors.supplyDB_F.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplyRH_pct">Supply Air Relative Humidity (%) *</Label>
                  <Input
                    id="supplyRH_pct"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="85"
                    {...form.register('supplyRH_pct', { valueAsNumber: true })}
                  />
                  {form.formState.errors.supplyRH_pct && (
                    <p className="text-sm text-red-600">{form.formState.errors.supplyRH_pct.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Typically higher than return air due to cooling
                  </p>
                </div>
              </div>
              {computed && (
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Supply Dew Point: {computed.calculations.supply_dew_point_F.toFixed(1)}°F
                </div>
              )}
            </CardContent>
          </Card>

          {/* Condensate Volume */}
          <div className="space-y-2">
            <Label htmlFor="condensateVolume_oz_per_30min">
              Condensate Volume (oz per 30 minutes)
            </Label>
            <Input
              id="condensateVolume_oz_per_30min"
              type="number"
              min="0"
              max="1000"
              placeholder="32"
              {...form.register('condensateVolume_oz_per_30min', { valueAsNumber: true })}
            />
            <p className="text-xs text-gray-500">
              Optional - measure condensate production rate if accessible
            </p>
          </div>

          {/* Real-time Results */}
          {computed && (
            <Card className={`border-l-4 ${computed.pass ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10' : 'border-l-red-500 bg-red-50 dark:bg-red-900/10'}`}>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">Live Performance Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100">Temperature Performance</h5>
                    <div className="flex justify-between">
                      <span>Temperature Drop:</span>
                      <span className="font-mono">{computed.calculations.temperature_drop_F.toFixed(1)}°F</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Range:</span>
                      <span className="font-mono text-gray-500">8 - 25°F</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Result:</span>
                      <span className={computed.checks.temperature_drop.pass ? 'text-green-600' : 'text-red-600'}>
                        {computed.checks.temperature_drop.pass ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100">Dehumidification</h5>
                    <div className="flex justify-between">
                      <span>Supply Dew Point:</span>
                      <span className="font-mono">{computed.calculations.supply_dew_point_F.toFixed(1)}°F</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Range:</span>
                      <span className="font-mono text-gray-500">50 - 55°F</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Result:</span>
                      <span className={computed.checks.supply_dew_point.pass ? 'text-green-600' : 'text-red-600'}>
                        {computed.checks.supply_dew_point.pass ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100">Humidity Change</h5>
                    <div className="flex justify-between">
                      <span>RH Rise:</span>
                      <span className="font-mono">+{computed.calculations.humidity_rise_pct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dew Point Drop:</span>
                      <span className="font-mono">{computed.calculations.dew_point_drop_F.toFixed(1)}°F</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Performance:</span>
                      <span className={computed.checks.humidity_performance.pass ? 'text-green-600' : 'text-red-600'}>
                        {computed.checks.humidity_performance.pass ? '✓ GOOD' : '✗ POOR'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center font-medium">
                    <span>Overall Coil Performance:</span>
                    <span className={`text-lg ${computed.pass ? 'text-green-600' : 'text-red-600'}`}>
                      {computed.pass ? '✓ PASS' : '✗ FAIL'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{computed.summary}</p>
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
              placeholder="Testing conditions, equipment used, observations..."
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
              <li>• Allow unit to run in cooling mode for at least 15 minutes</li>
              <li>• Use calibrated temperature and humidity sensors</li>
              <li>• Take return air measurements in mixed air plenum if possible</li>
              <li>• Take supply air measurements in supply duct after unit</li>
              <li>• Supply RH will be higher than return RH due to cooling</li>
              <li>• Supply dew point should be 50-55°F for good dehumidification</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
