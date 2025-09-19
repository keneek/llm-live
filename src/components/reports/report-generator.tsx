'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ReportGeneratorProps {
  sessionId: string
  sessionData: {
    id: string
    title?: string
    startedAt: string
    area: {
      project: {
        name: string
      }
      name: string
    }
    statistics: {
      passFailStats: {
        pass: number
        fail: number
        pending: number
      }
      completionRate: number
    }
    _count: {
      tests: number
      files: number
    }
  }
}

export function ReportGenerator({ sessionId, sessionData }: ReportGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)

  const generateReport = async () => {
    setGenerating(true)
    
    try {
      const response = await fetch(`/api/reports/${sessionId}`, {
        method: 'GET',
      })

      if (response.ok) {
        // Create blob and download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        
        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = `commissioning-report-${sessionId.slice(-8)}.pdf`
        
        if (contentDisposition) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition)
          if (matches && matches[1]) {
            filename = matches[1].replace(/['"]/g, '')
          }
        }
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        setLastGenerated(new Date())
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate report')
      }
    } catch (error) {
      console.error('Report generation failed:', error)
      alert(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGenerating(false)
    }
  }

  const isReady = sessionData._count.tests > 0
  const hasFailures = sessionData.statistics.passFailStats.fail > 0
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Generate PDF Report</span>
          {hasFailures && (
            <Badge variant="destructive" className="text-xs">
              {sessionData.statistics.passFailStats.fail} Failed Tests
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Create a comprehensive commissioning report with all test results, calculations, and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Report Preview Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium mb-3">Report Contents</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-300">Project:</span>
              <div className="font-medium">{sessionData.area.project.name}</div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-300">Area:</span>
              <div className="font-medium">{sessionData.area.name}</div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-300">Session:</span>
              <div className="font-medium">
                {sessionData.title || `Session ${sessionData.id.slice(-8)}`}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-300">Date:</span>
              <div className="font-medium">
                {new Date(sessionData.startedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{sessionData._count.tests}</div>
            <div className="text-xs text-gray-500">Total Tests</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{sessionData.statistics.passFailStats.pass}</div>
            <div className="text-xs text-gray-500">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{sessionData.statistics.passFailStats.fail}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold ${
              sessionData.statistics.completionRate >= 80 ? 'text-green-600' :
              sessionData.statistics.completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {sessionData.statistics.completionRate}%
            </div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>

        {/* Report Features */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Report Includes:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Executive summary with KPIs
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Equipment specifications
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Detailed test results with calculations
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Pass/fail analysis
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Weather conditions and notes
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Professional sign-off pages
            </div>
          </div>
        </div>

        {/* Generation Status */}
        {lastGenerated && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Last generated: {lastGenerated.toLocaleString()}
          </div>
        )}

        {/* Generate Button */}
        <div className="flex items-center gap-3 pt-2">
          <Button 
            onClick={generateReport} 
            disabled={!isReady || generating}
            className="flex-1"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Report...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF Report
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        {!isReady && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Complete at least one test before generating a report.
            </p>
          </div>
        )}

        {hasFailures && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Attention:</strong> This session has {sessionData.statistics.passFailStats.fail} failed test(s). 
              The report will include recommended actions for these items.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
