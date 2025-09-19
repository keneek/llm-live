import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DemoPage() {
  const demoData = {
    projects: [
      {
        name: 'Lincoln Elementary School - 2023 Addition',
        organization: 'PermitZIP',
        address: '456 School Lane, Austin, TX 78702',
        areas: 1,
        units: 3,
        sessions: 2,
        status: 'ACTIVE'
      }
    ],
    testResults: [
      {
        testType: 'AIRFLOW_STATIC',
        unit: 'RTU-1',
        cfmPerTon: 360,
        staticPressure: 0.8,
        pass: true,
        summary: 'CFM/ton within dehumidification range'
      },
      {
        testType: 'REFRIGERANT_CIRCUIT', 
        unit: 'RTU-1',
        superheat: 12,
        subcooling: 10,
        pass: true,
        summary: 'Refrigerant charge within specification'
      },
      {
        testType: 'COIL_PERFORMANCE',
        unit: 'RTU-1', 
        supplyDP: 52.3,
        tempDrop: 17,
        pass: true,
        summary: 'Excellent dehumidification performance'
      },
      {
        testType: 'BUILDING_PRESSURE',
        unit: null,
        pressure: 0.035,
        target: '0.02-0.05',
        pass: true,
        summary: 'Building pressurization within target range'
      }
    ]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            HVAC Commissioning Logger Demo
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Explore the capabilities of our field-friendly commissioning platform with real test data and calculations.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/login">
                Try Live Version
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                Back to Home
              </Link>
            </Button>
          </div>
        </div>

        {/* Demo Project Overview */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Sample Project Overview
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>{demoData.projects[0].name}</CardTitle>
              <CardDescription>
                {demoData.projects[0].organization} • {demoData.projects[0].address}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {demoData.projects[0].areas}
                  </div>
                  <div className="text-sm text-gray-500">Areas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {demoData.projects[0].units}
                  </div>
                  <div className="text-sm text-gray-500">HVAC Units</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {demoData.projects[0].sessions}
                  </div>
                  <div className="text-sm text-gray-500">Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {demoData.testResults.length}
                  </div>
                  <div className="text-sm text-gray-500">Test Results</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Demo Test Results */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Sample Test Results with Live Calculations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {demoData.testResults.map((test, index) => (
              <Card key={index} className="border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {test.testType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {test.unit && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-sm">
                          {test.unit}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        test.pass 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {test.pass ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-3">
                    {test.testType === 'AIRFLOW_STATIC' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">CFM/Ton:</span>
                          <span className="font-mono">{test.cfmPerTon}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Static Pressure:</span>
                          <span className="font-mono">{test.staticPressure}" w.c.</span>
                        </div>
                      </>
                    )}
                    {test.testType === 'REFRIGERANT_CIRCUIT' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Superheat:</span>
                          <span className="font-mono">{test.superheat}°F</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Subcooling:</span>
                          <span className="font-mono">{test.subcooling}°F</span>
                        </div>
                      </>
                    )}
                    {test.testType === 'COIL_PERFORMANCE' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Supply Dew Point:</span>
                          <span className="font-mono">{test.supplyDP}°F</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Temperature Drop:</span>
                          <span className="font-mono">{test.tempDrop}°F</span>
                        </div>
                      </>
                    )}
                    {test.testType === 'BUILDING_PRESSURE' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Measured:</span>
                          <span className="font-mono">{test.pressure}" w.c.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Target Range:</span>
                          <span className="font-mono">{test.target}" w.c.</span>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {test.summary}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Key Features Demonstrated
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-green-600">
                  ✓ Auto-Calculations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  CFM/ton ratios, dew point temperatures, superheat/subcooling values calculated automatically from raw measurements.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-blue-600">
                  ✓ Pass/Fail Logic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Built-in acceptance criteria for building pressure (0.02-0.05" w.c.), supply dew point (50-55°F), and more.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-purple-600">
                  ✓ Real-time Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Instant validation and KPI calculations as you enter test data, with clear pass/fail indicators.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <Card className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="py-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Ready to get started?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Try the full application with the demo credentials:
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border">
              <div className="text-sm font-mono">
                <div><strong>Engineer:</strong> engineer@permitzip.com / engineer123</div>
                <div><strong>Admin:</strong> admin@permitzip.com / admin123</div>
              </div>
            </div>
            <Button size="lg" asChild>
              <Link href="/login">
                Launch Application
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
