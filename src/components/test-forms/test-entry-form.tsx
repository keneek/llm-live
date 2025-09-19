'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BuildingPressureForm } from './building-pressure-form'
import { AirflowStaticForm } from './airflow-static-form'
import { RefrigerantCircuitForm } from './refrigerant-circuit-form'
import { CoilPerformanceForm } from './coil-performance-form'

interface TestEntryFormProps {
  sessionId: string
  sessionData: any
  testCategory: 'HVAC' | 'ENVELOPE'
  availableTests: string[]
  onTestAdded: () => void
}

// Test type metadata
const TEST_METADATA: Record<string, {
  name: string
  description: string
  priority: 'high' | 'medium' | 'low'
  estimatedTime: string
}> = {
  'BUILDING_PRESSURE': {
    name: 'Building Pressure',
    description: 'Measure building pressurization (target 0.02-0.05 in. w.c.)',
    priority: 'high',
    estimatedTime: '10 min'
  },
  'PRESSURE_DECAY': {
    name: 'Pressure Decay',
    description: 'Test envelope tightness over time',
    priority: 'medium',
    estimatedTime: '15 min'
  },
  'RETURN_CURB_LEAKAGE': {
    name: 'Return/Curb Leakage',
    description: 'Smoke testing for return air leaks',
    priority: 'high',
    estimatedTime: '20 min'
  },
  'SLAB_WALL_MOISTURE': {
    name: 'Slab/Wall Moisture',
    description: 'Plastic sheet test and IR imaging',
    priority: 'medium',
    estimatedTime: '30 min'
  },
  'AIRFLOW_STATIC': {
    name: 'Airflow & Static',
    description: 'CFM measurements and static pressure',
    priority: 'high',
    estimatedTime: '15 min'
  },
  'REFRIGERANT_CIRCUIT': {
    name: 'Refrigerant Circuit',
    description: 'Superheat and subcooling measurements',
    priority: 'high',
    estimatedTime: '20 min'
  },
  'COIL_PERFORMANCE': {
    name: 'Coil Performance',
    description: 'Temperature/humidity across coils',
    priority: 'high',
    estimatedTime: '15 min'
  },
  'FAN_EVAP_RECHECK': {
    name: 'Fan/Evap Recheck',
    description: 'Post-adjustment verification',
    priority: 'medium',
    estimatedTime: '10 min'
  },
  'ECONOMIZER_SEAL': {
    name: 'Economizer Seal',
    description: 'Damper leakage testing',
    priority: 'medium',
    estimatedTime: '15 min'
  },
  'DISTRIBUTION_MIXING': {
    name: 'Distribution & Mixing',
    description: 'Zone temperature/humidity uniformity',
    priority: 'low',
    estimatedTime: '25 min'
  }
}

export function TestEntryForm({ 
  sessionId, 
  sessionData, 
  testCategory, 
  availableTests, 
  onTestAdded 
}: TestEntryFormProps) {
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Get existing tests for this category
  const existingTests = sessionData.tests.filter((test: any) => 
    availableTests.includes(test.testType)
  )

  // Group tests by unit (for HVAC) or show all (for ENVELOPE)
  const testsByUnit = testCategory === 'HVAC' 
    ? sessionData.area.units.reduce((acc: any, unit: any) => {
        acc[unit.id] = {
          unit,
          tests: existingTests.filter((test: any) => test.unit?.id === unit.id)
        }
        return acc
      }, {})
    : { 'envelope': { unit: null, tests: existingTests } }

  const renderTestForm = (testType: string, unitId?: string) => {
    const commonProps = {
      sessionId,
      testType,
      unitId,
      sessionData,
      onComplete: () => {
        setShowForm(false)
        setSelectedTest(null)
        onTestAdded()
      },
      onCancel: () => {
        setShowForm(false)
        setSelectedTest(null)
      }
    }

    switch (testType) {
      case 'BUILDING_PRESSURE':
        return <BuildingPressureForm {...commonProps} />
      case 'AIRFLOW_STATIC':
        return <AirflowStaticForm {...commonProps} />
      case 'REFRIGERANT_CIRCUIT':
        return <RefrigerantCircuitForm {...commonProps} />
      case 'COIL_PERFORMANCE':
        return <CoilPerformanceForm {...commonProps} />
      default:
        return (
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-500">
                Form for {TEST_METADATA[testType]?.name} coming soon...
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={commonProps.onCancel}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )
    }
  }

  if (showForm && selectedTest) {
    const unitId = testCategory === 'HVAC' ? Object.keys(testsByUnit)[0] : undefined
    return renderTestForm(selectedTest, unitId)
  }

  return (
    <div className="space-y-6">
      {/* Test Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Add New {testCategory} Test</CardTitle>
          <CardDescription>
            Select a test type to begin data entry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTests.map((testType) => {
              const metadata = TEST_METADATA[testType]
              const completedCount = existingTests.filter((t: any) => t.testType === testType).length
              const isHighPriority = metadata.priority === 'high'
              
              return (
                <div
                  key={testType}
                  className={`p-4 border rounded-lg cursor-pointer hover:border-blue-500 transition-colors ${
                    isHighPriority ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/10' : ''
                  }`}
                  onClick={() => {
                    setSelectedTest(testType)
                    setShowForm(true)
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{metadata.name}</h4>
                    <div className="flex gap-1">
                      {isHighPriority && (
                        <Badge variant="destructive" className="text-xs px-1 py-0">
                          Priority
                        </Badge>
                      )}
                      {completedCount > 0 && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {completedCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    {metadata.description}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Est. {metadata.estimatedTime}</span>
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2">
                      Start Test
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Existing Tests */}
      {Object.entries(testsByUnit).map(([unitId, data]: [string, any]) => (
        <Card key={unitId}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {data.unit ? `${data.unit.label} Tests` : `${testCategory} Tests`}
              </span>
              <Badge variant="secondary">
                {data.tests.length} test{data.tests.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            {data.unit && (
              <CardDescription>
                {data.unit.make} {data.unit.model}
                {data.unit.tons && ` • ${data.unit.tons} tons`}
                {data.unit.refrigerant && ` • ${data.unit.refrigerant}`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {data.tests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No tests recorded yet
              </p>
            ) : (
              <div className="space-y-4">
                {data.tests.map((test: any) => (
                  <div key={test.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">
                          {TEST_METADATA[test.testType]?.name}
                        </h4>
                        <Badge 
                          variant={test.pass === true ? 'default' : test.pass === false ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {test.pass === true ? 'PASS' : test.pass === false ? 'FAIL' : 'PENDING'}
                        </Badge>
                      </div>
                      
                      {/* Show key computed values */}
                      {test.computed && (
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          {Object.entries(test.computed.calculations || {}).slice(0, 3).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {key}: {typeof value === 'number' ? value.toFixed(2) : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {test.notes && (
                        <p className="text-sm text-gray-500 mt-2">{test.notes}</p>
                      )}
                      
                      <div className="text-xs text-gray-400 mt-2">
                        {new Date(test.createdAt).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
