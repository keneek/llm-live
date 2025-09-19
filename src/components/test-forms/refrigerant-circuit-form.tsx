'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RefrigerantCircuitSchema, type RefrigerantCircuitData } from '@/lib/schemas'
import { calculateSuperheat, calculateSubcooling, checkSuperheat, checkSubcooling } from '@/lib/calculations'

interface RefrigerantCircuitFormProps {
  sessionId: string
  testType: string
  unitId?: string
  sessionData: any
  onComplete: () => void
  onCancel: () => void
}

export function RefrigerantCircuitForm({
  sessionId,
  testType,
  unitId,
  sessionData,
  onComplete,
  onCancel
}: RefrigerantCircuitFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<string>(unitId || '')
  const [computed, setComputed] = useState<any>(null)

  // Get available units and outdoor temperature
  const units = sessionData.area.units || []
  const currentUnit = units.find((u: any) => u.id === selectedUnit)
  const outdoorTemp = sessionData.weatherOADryBulb || 95 // Default to 95°F if not available

  const form = useForm<RefrigerantCircuitData>({
    resolver: zodResolver(RefrigerantCircuitSchema),
    defaultValues: {
      unitLabel: currentUnit?.label || '',
      outdoorDB_F: outdoorTemp,
      suctionPSI: 0,
      liquidPSI: 0,
      suctionLineTemp_F: 0,
      liquidLineTemp_F: 0,
      txvPresent: false,
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

  // Real-time calculation when temperatures and pressures change
  useEffect(() => {
    const { suctionLineTemp_F, suctionPSI, liquidLineTemp_F, liquidPSI, outdoorDB_F } = watchedValues
    
    if (suctionLineTemp_F > 0 && suctionPSI > 0 && liquidLineTemp_F > 0 && liquidPSI > 0) {
      const superheat = calculateSuperheat(suctionLineTemp_F, suctionPSI, currentUnit?.refrigerant)
      const subcooling = calculateSubcooling(liquidLineTemp_F, liquidPSI, currentUnit?.refrigerant)
      
      const shCheck = checkSuperheat(superheat, outdoorDB_F)
      const scCheck = checkSubcooling(subcooling, outdoorDB_F)

      setComputed({
        calculations: {
          superheat_F: superheat,
          subcooling_F: subcooling,
          suction_psi: suctionPSI,
          liquid_psi: liquidPSI,
          suction_temp_F: suctionLineTemp_F,
          liquid_temp_F: liquidLineTemp_F
        },
        checks: {
          superheat: shCheck,
          subcooling: scCheck
        },
        pass: shCheck.pass && scCheck.pass,
        summary: `SH: ${superheat.toFixed(1)}°F, SC: ${subcooling.toFixed(1)}°F`
      })
    } else {
      setComputed(null)
    }
  }, [watchedValues, currentUnit])

  const onSubmit = async (data: RefrigerantCircuitData) => {
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
          Refrigerant Circuit Test
          {computed && (
            <Badge variant={computed.pass ? 'default' : 'destructive'}>
              {computed.pass ? 'PASS' : 'FAIL'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Measure superheat and subcooling to verify refrigerant charge.
          Acceptable ranges vary by outdoor conditions and manufacturer specifications.
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
                  {unit.refrigerant && ` (${unit.refrigerant})`}
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
                    <div className="font-medium">{currentUnit.refrigerant || 'R-410A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">Stages:</span>
                    <div className="font-medium">{currentUnit.stages || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Outdoor Temperature */}
          <div className="space-y-2">
            <Label htmlFor="outdoorDB_F">Outdoor Dry Bulb Temperature (°F) *</Label>
            <Input
              id="outdoorDB_F"
              type="number"
              min="-40"
              max="150"
              placeholder="95"
              {...form.register('outdoorDB_F', { valueAsNumber: true })}
            />
            {form.formState.errors.outdoorDB_F && (
              <p className="text-sm text-red-600">{form.formState.errors.outdoorDB_F.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Current session outdoor temp: {sessionData.weatherOADryBulb || 'Not recorded'}°F
            </p>
          </div>

          {/* Pressure Readings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Suction Side (Low Pressure)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="suctionPSI">Suction Pressure (PSIG) *</Label>
                  <Input
                    id="suctionPSI"
                    type="number"
                    min="0"
                    max="1000"
                    placeholder="118"
                    {...form.register('suctionPSI', { valueAsNumber: true })}
                  />
                  {form.formState.errors.suctionPSI && (
                    <p className="text-sm text-red-600">{form.formState.errors.suctionPSI.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="suctionLineTemp_F">Suction Line Temperature (°F) *</Label>
                  <Input
                    id="suctionLineTemp_F"
                    type="number"
                    min="-40"
                    max="150"
                    placeholder="45"
                    {...form.register('suctionLineTemp_F', { valueAsNumber: true })}
                  />
                  {form.formState.errors.suctionLineTemp_F && (
                    <p className="text-sm text-red-600">{form.formState.errors.suctionLineTemp_F.message}</p>
                  )}
                  <p className="text-xs text-gray-500">Measure at suction line near unit</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Liquid Side (High Pressure)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="liquidPSI">Liquid Pressure (PSIG) *</Label>
                  <Input
                    id="liquidPSI"
                    type="number"
                    min="0"
                    max="1000"
                    placeholder="285"
                    {...form.register('liquidPSI', { valueAsNumber: true })}
                  />
                  {form.formState.errors.liquidPSI && (
                    <p className="text-sm text-red-600">{form.formState.errors.liquidPSI.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="liquidLineTemp_F">Liquid Line Temperature (°F) *</Label>
                  <Input
                    id="liquidLineTemp_F"
                    type="number"
                    min="-40"
                    max="150"
                    placeholder="85"
                    {...form.register('liquidLineTemp_F', { valueAsNumber: true })}
                  />
                  {form.formState.errors.liquidLineTemp_F && (
                    <p className="text-sm text-red-600">{form.formState.errors.liquidLineTemp_F.message}</p>
                  )}
                  <p className="text-xs text-gray-500">Measure at liquid line near condenser</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Results */}
          {computed && (
            <Card className={`border-l-4 ${computed.pass ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10' : 'border-l-red-500 bg-red-50 dark:bg-red-900/10'}`}>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">Live Calculations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-2">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100">Superheat Analysis</h5>
                    <div className="flex justify-between">
                      <span>Calculated Superheat:</span>
                      <span className="font-mono">{computed.calculations.superheat_F.toFixed(1)}°F</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Range:</span>
                      <span className="font-mono text-gray-500">{computed.checks.superheat.target}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Superheat Result:</span>
                      <span className={computed.checks.superheat.pass ? 'text-green-600' : 'text-red-600'}>
                        {computed.checks.superheat.pass ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{computed.checks.superheat.message}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100">Subcooling Analysis</h5>
                    <div className="flex justify-between">
                      <span>Calculated Subcooling:</span>
                      <span className="font-mono">{computed.calculations.subcooling_F.toFixed(1)}°F</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Range:</span>
                      <span className="font-mono text-gray-500">{computed.checks.subcooling.target}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Subcooling Result:</span>
                      <span className={computed.checks.subcooling.pass ? 'text-green-600' : 'text-red-600'}>
                        {computed.checks.subcooling.pass ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{computed.checks.subcooling.message}</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center font-medium">
                    <span>Overall Refrigerant Circuit:</span>
                    <span className={`text-lg ${computed.pass ? 'text-green-600' : 'text-red-600'}`}>
                      {computed.pass ? '✓ PASS' : '✗ FAIL'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{computed.summary}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TXV Present */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded"
                {...form.register('txvPresent')}
              />
              Thermostatic Expansion Valve (TXV) present
            </Label>
            <p className="text-xs text-gray-500">Check if unit has TXV instead of fixed orifice</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observations, equipment used, abnormal conditions..."
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
              <li>• Allow unit to run for at least 15 minutes before taking readings</li>
              <li>• Ensure proper gauge manifold connections</li>
              <li>• Temperature probes should be insulated and secured to lines</li>
              <li>• Record readings only when pressures have stabilized</li>
              <li>• Superheat indicates refrigerant charge (low = overcharged, high = undercharged)</li>
              <li>• Subcooling indicates condenser performance and charge level</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
