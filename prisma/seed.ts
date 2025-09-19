import { PrismaClient, TestType } from '@prisma/client'
import { hash } from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create demo organization
  let organization = await db.organization.findFirst({
    where: { name: 'PermitZIP' }
  })
  
  if (!organization) {
    organization = await db.organization.create({
      data: {
        name: 'PermitZIP',
        address: '123 Main St, Austin, TX 78701',
        email: 'contact@permitzip.com',
        phone: '(555) 123-4567'
      }
    })
  }

  // Create demo admin user
  const adminPassword = await hash('admin123', 12)
  const adminUser = await db.user.upsert({
    where: { email: 'admin@permitzip.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@permitzip.com',
      password: adminPassword,
      role: 'ADMIN'
    }
  })

  // Create demo engineer user
  const engineerPassword = await hash('engineer123', 12)
  const engineerUser = await db.user.upsert({
    where: { email: 'engineer@permitzip.com' },
    update: {},
    create: {
      name: 'John Engineer',
      email: 'engineer@permitzip.com',
      password: engineerPassword,
      role: 'ENGINEER'
    }
  })

  // Create demo project
  let project = await db.project.findFirst({
    where: { 
      name: 'Lincoln Elementary School - 2023 Addition',
      orgId: organization.id
    }
  })
  
  if (!project) {
    project = await db.project.create({
      data: {
        name: 'Lincoln Elementary School - 2023 Addition',
        address: '456 School Lane, Austin, TX 78702',
        notes: 'New classroom addition with 3 RTUs for HVAC',
        orgId: organization.id
      }
    })
  }

  // Add memberships
  await db.membership.upsert({
    where: {
      userId_projectId: {
        userId: adminUser.id,
        projectId: project.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      projectId: project.id,
      role: 'OWNER'
    }
  })

  await db.membership.upsert({
    where: {
      userId_projectId: {
        userId: engineerUser.id,
        projectId: project.id
      }
    },
    update: {},
    create: {
      userId: engineerUser.id,
      projectId: project.id,
      role: 'EDITOR'
    }
  })

  // Create demo area
  const area = await db.area.upsert({
    where: { id: 'demo-area-1' },
    update: {},
    create: {
      id: 'demo-area-1',
      name: '2023 Addition',
      sqft: 4800,
      notes: 'New classroom wing with 3 rooftop units',
      projectId: project.id
    }
  })

  // Create demo HVAC units
  const units = await Promise.all([
    db.hvacUnit.upsert({
      where: { id: 'demo-unit-1' },
      update: {},
      create: {
        id: 'demo-unit-1',
        label: 'RTU-1',
        make: 'Carrier',
        model: '48TCED12',
        serialNum: 'CC12345678',
        stages: 2,
        tons: 12.5,
        refrigerant: 'R-410A',
        notes: 'Serves classrooms 101-104',
        areaId: area.id
      }
    }),
    db.hvacUnit.upsert({
      where: { id: 'demo-unit-2' },
      update: {},
      create: {
        id: 'demo-unit-2',
        label: 'RTU-2',
        make: 'Carrier',
        model: '48TCED12',
        serialNum: 'CC12345679',
        stages: 2,
        tons: 12.5,
        refrigerant: 'R-410A',
        notes: 'Serves classrooms 105-108',
        areaId: area.id
      }
    }),
    db.hvacUnit.upsert({
      where: { id: 'demo-unit-3' },
      update: {},
      create: {
        id: 'demo-unit-3',
        label: 'RTU-3',
        make: 'Carrier',
        model: '48TCED10',
        serialNum: 'CC12345680',
        stages: 2,
        tons: 10.0,
        refrigerant: 'R-410A',
        notes: 'Serves library and commons area',
        areaId: area.id
      }
    })
  ])

  // Create demo session
  const session = await db.session.upsert({
    where: { id: 'demo-session-1' },
    update: {},
    create: {
      id: 'demo-session-1',
      title: 'Initial Commissioning - July 2024',
      areaId: area.id,
      authorId: engineerUser.id,
      startedAt: new Date('2024-07-15T08:00:00Z'),
      endedAt: new Date('2024-07-15T17:00:00Z'),
      weatherOADryBulb: 95,
      weatherOARH: 65,
      weatherNotes: 'Hot and humid summer day in Austin',
      status: 'SUBMITTED'
    }
  })

  // Create demo test results
  const testResults = [
    {
      id: 'demo-test-1',
      sessionId: session.id,
      unitId: units[0].id, // RTU-1
      testType: 'AIRFLOW_STATIC',
      reading: {
        unitLabel: 'RTU-1',
        tons: 12.5,
        supplyCFM: 4500,
        returnCFM: 4200,
        extStatic_inwc: 0.8,
        mode: 'COOL'
      },
      notes: 'Initial airflow measurement at cooling mode'
    },
    {
      id: 'demo-test-2', 
      sessionId: session.id,
      unitId: units[0].id, // RTU-1
      testType: 'REFRIGERANT_CIRCUIT',
      reading: {
        unitLabel: 'RTU-1',
        outdoorDB_F: 95,
        suctionPSI: 118,
        liquidPSI: 285,
        suctionLineTemp_F: 45,
        liquidLineTemp_F: 85,
        txvPresent: true
      },
      notes: 'Refrigerant pressures and temperatures look good'
    },
    {
      id: 'demo-test-3',
      sessionId: session.id,
      unitId: units[0].id, // RTU-1  
      testType: 'COIL_PERFORMANCE',
      reading: {
        unitLabel: 'RTU-1',
        returnDB_F: 75,
        returnRH_pct: 55,
        supplyDB_F: 58,
        supplyRH_pct: 85,
        condensateVolume_oz_per_30min: 32
      },
      notes: 'Good temperature drop and condensate production'
    },
    {
      id: 'demo-test-4',
      sessionId: session.id,
      unitId: null, // Envelope test
      testType: 'BUILDING_PRESSURE', 
      reading: {
        location: 'Main corridor',
        deltaP_inwc: 0.035,
        targetMin: 0.02,
        targetMax: 0.05,
        exhaustOn: false
      },
      notes: 'Building pressure within target range'
    }
  ]

  for (const test of testResults) {
    await db.testResult.upsert({
      where: { id: test.id },
      update: {},
      create: {
        id: test.id,
        sessionId: test.sessionId,
        unitId: test.unitId,
        testType: test.testType as TestType,
        reading: test.reading,
        notes: test.notes,
        computed: undefined, // Will be computed by the API
        pass: undefined
      }
    })
  }

  console.log('✅ Seed completed successfully!')
  console.log(`
📊 Created seed data:
   - Organization: ${organization.name}
   - Admin user: ${adminUser.email} (password: admin123)
   - Engineer user: ${engineerUser.email} (password: engineer123)  
   - Project: ${project.name}
   - Area: ${area.name}
   - HVAC Units: ${units.length} units
   - Session: ${session.title}
   - Test Results: ${testResults.length} tests
  `)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
