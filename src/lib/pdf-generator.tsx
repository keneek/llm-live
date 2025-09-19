import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

// Register fonts (if you have custom fonts)
// Font.register({
//   family: 'Inter',
//   src: '/fonts/Inter-Regular.ttf'
// })

// Define styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  section: {
    margin: '20 0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
  },
  tableColWide: {
    width: '50%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
  },
  tableCell: {
    margin: 'auto',
    marginTop: 5,
    marginBottom: 5,
    fontSize: 9,
  },
  tableCellHeader: {
    margin: 'auto',
    marginTop: 5,
    marginBottom: 5,
    fontSize: 9,
    fontWeight: 'bold',
  },
  summaryBox: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passIndicator: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: 3,
    fontSize: 8,
    textAlign: 'center',
    borderRadius: 3,
  },
  failIndicator: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: 3,
    fontSize: 8,
    textAlign: 'center',
    borderRadius: 3,
  },
  pendingIndicator: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: 3,
    fontSize: 8,
    textAlign: 'center',
    borderRadius: 3,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#6B7280',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    fontSize: 8,
    color: '#6B7280',
  }
})

interface ReportData {
  session: {
    id: string
    title?: string | null
    startedAt: string
    endedAt?: string | null
    status: string
    weatherOADryBulb?: number | null
    weatherOARH?: number | null
    weatherNotes?: string | null
    notes?: string | null
    area: {
      name: string
      sqft?: number | null
      project: {
        name: string
        address?: string | null
        organization: {
          name: string
          address?: string | null
          email?: string | null
          phone?: string | null
        }
      }
      units: Array<{
        id: string
        label: string
        make?: string | null
        model?: string | null
        tons?: number | null
        refrigerant?: string | null
      }>
    }
    author: {
      name: string | null
      email: string
    }
    tests: Array<{
      id: string
      testType: string
      reading: any
      computed: any
      pass?: boolean | null
      notes?: string | null
      createdAt: string
      unit?: {
        label: string
        make?: string | null
        model?: string | null
      } | null
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
  }
}

const TEST_TYPE_NAMES: Record<string, string> = {
  'BUILDING_PRESSURE': 'Building Pressure',
  'PRESSURE_DECAY': 'Pressure Decay',
  'RETURN_CURB_LEAKAGE': 'Return/Curb Leakage',
  'SLAB_WALL_MOISTURE': 'Slab/Wall Moisture',
  'AIRFLOW_STATIC': 'Airflow & Static',
  'REFRIGERANT_CIRCUIT': 'Refrigerant Circuit',
  'COIL_PERFORMANCE': 'Coil Performance',
  'FAN_EVAP_RECHECK': 'Fan/Evap Recheck',
  'ECONOMIZER_SEAL': 'Economizer Seal',
  'DISTRIBUTION_MIXING': 'Distribution & Mixing'
}

export function CommissioningReport({ data }: { data: ReportData }) {
  const { session } = data
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getPassFailIndicator = (pass?: boolean | null) => {
    if (pass === true) return <Text style={styles.passIndicator}>PASS</Text>
    if (pass === false) return <Text style={styles.failIndicator}>FAIL</Text>
    return <Text style={styles.pendingIndicator}>PENDING</Text>
  }

  const formatTestReading = (testType: string, reading: any, computed: any) => {
    switch (testType) {
      case 'BUILDING_PRESSURE':
        return `${reading.deltaP_inwc}" w.c. (Target: 0.02-0.05)`
      case 'AIRFLOW_STATIC':
        return `${reading.supplyCFM} CFM, ${computed?.calculations?.cfm_per_ton?.toFixed(0) || 'N/A'} CFM/ton`
      case 'REFRIGERANT_CIRCUIT':
        return `SH: ${computed?.calculations?.superheat_F?.toFixed(1) || 'N/A'}°F, SC: ${computed?.calculations?.subcooling_F?.toFixed(1) || 'N/A'}°F`
      case 'COIL_PERFORMANCE':
        return `Supply DP: ${computed?.calculations?.supply_dew_point_F?.toFixed(1) || 'N/A'}°F, ΔT: ${computed?.calculations?.temperature_drop_F?.toFixed(1) || 'N/A'}°F`
      default:
        return 'See detailed results'
    }
  }

  const envelopeTests = session.tests.filter(t => 
    ['BUILDING_PRESSURE', 'PRESSURE_DECAY', 'RETURN_CURB_LEAKAGE', 'SLAB_WALL_MOISTURE'].includes(t.testType)
  )
  
  const hvacTests = session.tests.filter(t => 
    ['AIRFLOW_STATIC', 'REFRIGERANT_CIRCUIT', 'COIL_PERFORMANCE', 'FAN_EVAP_RECHECK', 'ECONOMIZER_SEAL', 'DISTRIBUTION_MIXING'].includes(t.testType)
  )

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>HVAC Commissioning Report</Text>
          <Text style={styles.subtitle}>{session.area.project.name}</Text>
          <Text style={styles.subtitle}>{session.area.name}</Text>
        </View>

        {/* Project Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Organization</Text>
              <Text style={styles.infoValue}>{session.area.project.organization.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Project</Text>
              <Text style={styles.infoValue}>{session.area.project.name}</Text>
            </View>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Area</Text>
              <Text style={styles.infoValue}>{session.area.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Size</Text>
              <Text style={styles.infoValue}>
                {session.area.sqft ? `${session.area.sqft.toLocaleString()} sq ft` : 'Not specified'}
              </Text>
            </View>
          </View>
          {session.area.project.address && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{session.area.project.address}</Text>
            </View>
          )}
        </View>

        {/* Session Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Session</Text>
              <Text style={styles.infoValue}>
                {session.title || `Session ${session.id.slice(-8)}`}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Engineer</Text>
              <Text style={styles.infoValue}>{session.author.name}</Text>
            </View>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{formatDate(session.startedAt)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>
                {formatTime(session.startedAt)}
                {session.endedAt && ` - ${formatTime(session.endedAt)}`}
              </Text>
            </View>
          </View>
          {(session.weatherOADryBulb || session.weatherOARH) && (
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Outdoor Conditions</Text>
                <Text style={styles.infoValue}>
                  {session.weatherOADryBulb}°F, {session.weatherOARH}% RH
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValue}>{session.status}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.summaryBox}>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Total Tests</Text>
                <Text style={styles.infoValue}>{session.tests.length}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Passed</Text>
                <Text style={styles.infoValue}>{session.statistics.passFailStats.pass}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Failed</Text>
                <Text style={styles.infoValue}>{session.statistics.passFailStats.fail}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Completion</Text>
                <Text style={styles.infoValue}>{session.statistics.completionRate}%</Text>
              </View>
            </View>
          </View>
          
          {session.statistics.passFailStats.fail > 0 && (
            <View>
              <Text style={styles.infoLabel}>Items Requiring Attention:</Text>
              {session.tests
                .filter(test => test.pass === false)
                .map((test, index) => (
                  <Text key={index} style={styles.infoValue}>
                    • {TEST_TYPE_NAMES[test.testType]} {test.unit && `(${test.unit.label})`}
                  </Text>
                ))
              }
            </View>
          )}
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>

      {/* HVAC Tests Page */}
      {hvacTests.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>HVAC System Tests</Text>
          </View>

          {/* HVAC Units */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipment Summary</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCellHeader}>Unit</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCellHeader}>Make/Model</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCellHeader}>Capacity</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCellHeader}>Refrigerant</Text>
                </View>
              </View>
              {session.area.units.map((unit, index) => (
                <View key={index} style={styles.tableRow}>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{unit.label}</Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{unit.make} {unit.model}</Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{unit.tons} tons</Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{unit.refrigerant || 'N/A'}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* HVAC Test Results */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HVAC Test Results</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCellHeader}>Test Type</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCellHeader}>Unit</Text>
                </View>
                <View style={styles.tableColWide}>
                  <Text style={styles.tableCellHeader}>Results</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCellHeader}>Status</Text>
                </View>
              </View>
              {hvacTests.map((test, index) => (
                <View key={index} style={styles.tableRow}>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{TEST_TYPE_NAMES[test.testType]}</Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{test.unit?.label || 'N/A'}</Text>
                  </View>
                  <View style={styles.tableColWide}>
                    <Text style={styles.tableCell}>
                      {formatTestReading(test.testType, test.reading, test.computed)}
                    </Text>
                  </View>
                  <View style={styles.tableCol}>
                    <View style={styles.tableCell}>
                      {getPassFailIndicator(test.pass)}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            fixed
          />
        </Page>
      )}

      {/* Envelope Tests Page */}
      {envelopeTests.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Envelope Tests</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Envelope Test Results</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCellHeader}>Test Type</Text>
                </View>
                <View style={styles.tableColWide}>
                  <Text style={styles.tableCellHeader}>Results</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCellHeader}>Status</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCellHeader}>Date</Text>
                </View>
              </View>
              {envelopeTests.map((test, index) => (
                <View key={index} style={styles.tableRow}>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{TEST_TYPE_NAMES[test.testType]}</Text>
                  </View>
                  <View style={styles.tableColWide}>
                    <Text style={styles.tableCell}>
                      {formatTestReading(test.testType, test.reading, test.computed)}
                    </Text>
                  </View>
                  <View style={styles.tableCol}>
                    <View style={styles.tableCell}>
                      {getPassFailIndicator(test.pass)}
                    </View>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>
                      {new Date(test.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Notes and Recommendations */}
          {(session.notes || session.statistics.passFailStats.fail > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes & Recommendations</Text>
              {session.notes && (
                <View style={{ marginBottom: 15 }}>
                  <Text style={styles.infoLabel}>Session Notes:</Text>
                  <Text style={styles.infoValue}>{session.notes}</Text>
                </View>
              )}
              
              {session.statistics.passFailStats.fail > 0 && (
                <View>
                  <Text style={styles.infoLabel}>Recommended Actions:</Text>
                  {session.tests
                    .filter(test => test.pass === false && test.computed?.summary)
                    .map((test, index) => (
                      <Text key={index} style={styles.infoValue}>
                        • {TEST_TYPE_NAMES[test.testType]}: {test.computed.summary}
                      </Text>
                    ))
                  }
                </View>
              )}
            </View>
          )}

          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            fixed
          />
        </Page>
      )}

      {/* Sign-off Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Report Sign-off</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Summary</Text>
          <View style={styles.summaryBox}>
            <Text style={styles.infoValue}>
              This report documents the commissioning activities performed on {formatDate(session.startedAt)} 
              for {session.area.project.name} - {session.area.name}.
            </Text>
            <Text style={styles.infoValue}>
              A total of {session.tests.length} tests were conducted with {session.statistics.passFailStats.pass} passing, 
              {session.statistics.passFailStats.fail} failing, and {session.statistics.passFailStats.pending} pending completion.
            </Text>
            {session.statistics.passFailStats.fail === 0 ? (
              <Text style={styles.infoValue}>
                All systems tested are performing within acceptable parameters.
              </Text>
            ) : (
              <Text style={styles.infoValue}>
                {session.statistics.passFailStats.fail} item(s) require attention as noted in this report.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          
          <View style={{ marginBottom: 40 }}>
            <Text style={styles.infoLabel}>Commissioning Engineer:</Text>
            <Text style={styles.infoValue}>{session.author.name}</Text>
            <Text style={styles.infoValue}>{session.author.email}</Text>
            <View style={{ marginTop: 20, borderBottomWidth: 1, borderBottomColor: '#000', width: '50%' }}>
              <Text style={{ fontSize: 8, marginBottom: 2 }}>Signature</Text>
            </View>
            <Text style={styles.infoValue}>Date: {formatDate(session.startedAt)}</Text>
          </View>

          <View style={{ marginBottom: 40 }}>
            <Text style={styles.infoLabel}>Reviewer:</Text>
            <View style={{ marginTop: 30, borderBottomWidth: 1, borderBottomColor: '#000', width: '50%' }}>
              <Text style={{ fontSize: 8, marginBottom: 2 }}>Signature</Text>
            </View>
            <Text style={styles.infoValue}>Date: _________________</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Report generated by HVAC Commissioning Logger on {new Date().toLocaleDateString()}
          </Text>
          <Text>
            {session.area.project.organization.name}
            {session.area.project.organization.email && ` • ${session.area.project.organization.email}`}
            {session.area.project.organization.phone && ` • ${session.area.project.organization.phone}`}
          </Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
