import { z } from 'zod'

// Base schemas for common field types
export const temperatureSchema = z.number().min(-40).max(150) // °F
export const humiditySchema = z.number().min(0).max(100) // %RH  
export const pressureSchema = z.number().min(-10).max(10) // in. w.c.
export const cfmSchema = z.number().min(0).max(50000) // CFM
export const psiSchema = z.number().min(0).max(1000) // PSI

// Test Type Schemas (as specified in requirements)

// A1 - Building Pressure
export const BuildingPressureSchema = z.object({
  location: z.string().min(1, "Location is required"),
  deltaP_inwc: pressureSchema, // inside - outside pressure
  targetMin: z.literal(0.02),
  targetMax: z.literal(0.05),
  exhaustOn: z.boolean().optional(),
  notes: z.string().optional()
})

// A2 - Pressure Decay  
export const PressureDecaySchema = z.object({
  startDeltaP: pressureSchema, // e.g. 0.05
  endDeltaP: pressureSchema,   // e.g. 0.01
  decaySeconds: z.number().min(0).max(3600), // max 1 hour
  notes: z.string().optional()
})

// A3 - Return/Curb Leakage
export const ReturnCurbLeakageSchema = z.object({
  returnStatic_inwc: pressureSchema,
  supplyStatic_inwc: pressureSchema,
  smokeLeaksFound: z.boolean(),
  leakLocations: z.array(z.string()).optional(),
  notes: z.string().optional()
})

// A4 - Slab/Wall Moisture
export const SlabWallMoistureSchema = z.object({
  plasticTest: z.enum(['DRY', 'CONDENSATION', 'DARKENING']),
  irFindings: z.string().optional(),
  notes: z.string().optional()
})

// B1 - Airflow & Static
export const AirflowStaticSchema = z.object({
  unitLabel: z.string().min(1, "Unit label is required"),
  tons: z.number().min(0.5).max(200), // Realistic range for HVAC units
  supplyCFM: cfmSchema,
  returnCFM: cfmSchema.optional(),
  extStatic_inwc: pressureSchema,
  mode: z.enum(['COOL', 'DEHUM']),
  notes: z.string().optional()
})

// B2 - Refrigerant Circuit
export const RefrigerantCircuitSchema = z.object({
  unitLabel: z.string().min(1, "Unit label is required"),
  outdoorDB_F: temperatureSchema,
  suctionPSI: psiSchema,
  liquidPSI: psiSchema,
  suctionLineTemp_F: temperatureSchema,
  liquidLineTemp_F: temperatureSchema,
  txvPresent: z.boolean().optional(),
  notes: z.string().optional()
})

// B3 - Coil Performance
export const CoilPerformanceSchema = z.object({
  unitLabel: z.string().min(1, "Unit label is required"),
  returnDB_F: temperatureSchema,
  returnRH_pct: humiditySchema,
  supplyDB_F: temperatureSchema,
  supplyRH_pct: humiditySchema,
  condensateVolume_oz_per_30min: z.number().min(0).max(1000).optional(),
  notes: z.string().optional()
})

// B4 - Fan/Evap Recheck (similar to Coil Performance but different context)
export const FanEvapRecheckSchema = z.object({
  unitLabel: z.string().min(1, "Unit label is required"),
  returnDB_F: temperatureSchema,
  returnRH_pct: humiditySchema,
  supplyDB_F: temperatureSchema,
  supplyRH_pct: humiditySchema,
  airflowCFM: cfmSchema,
  staticPressure_inwc: pressureSchema,
  notes: z.string().optional()
})

// B5 - Economizer Seal
export const EconomizerSealSchema = z.object({
  commandedPct: z.number().min(0).max(100), // expect 0 for fully closed
  leakageObserved: z.boolean(),
  method: z.enum(['SMOKE', 'VISUAL']),
  notes: z.string().optional()
})

// B6 - Distribution & Mixing
export const DistributionMixingSchema = z.object({
  zone: z.string().min(1, "Zone is required"),
  gridSamples: z.array(z.object({
    point: z.string().min(1, "Point ID required"),
    db_F: temperatureSchema,
    rh_pct: humiditySchema
  })).min(1, "At least one sample point required"),
  returnDewPoint_F: temperatureSchema,
  notes: z.string().optional()
})

// Union type for all test schemas
export const TestReadingSchema = z.discriminatedUnion('testType', [
  z.object({ testType: z.literal('BUILDING_PRESSURE'), data: BuildingPressureSchema }),
  z.object({ testType: z.literal('PRESSURE_DECAY'), data: PressureDecaySchema }),
  z.object({ testType: z.literal('RETURN_CURB_LEAKAGE'), data: ReturnCurbLeakageSchema }),
  z.object({ testType: z.literal('SLAB_WALL_MOISTURE'), data: SlabWallMoistureSchema }),
  z.object({ testType: z.literal('AIRFLOW_STATIC'), data: AirflowStaticSchema }),
  z.object({ testType: z.literal('REFRIGERANT_CIRCUIT'), data: RefrigerantCircuitSchema }),
  z.object({ testType: z.literal('COIL_PERFORMANCE'), data: CoilPerformanceSchema }),
  z.object({ testType: z.literal('FAN_EVAP_RECHECK'), data: FanEvapRecheckSchema }),
  z.object({ testType: z.literal('ECONOMIZER_SEAL'), data: EconomizerSealSchema }),
  z.object({ testType: z.literal('DISTRIBUTION_MIXING'), data: DistributionMixingSchema })
])

// API Schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  orgId: z.string().cuid("Invalid organization ID"),
  address: z.string().optional(),
  notes: z.string().optional()
})

export const CreateAreaSchema = z.object({
  name: z.string().min(1, "Area name is required"),
  projectId: z.string().cuid("Invalid project ID"),
  sqft: z.number().int().positive().optional(),
  notes: z.string().optional()
})

export const CreateHvacUnitSchema = z.object({
  label: z.string().min(1, "Unit label is required"),
  areaId: z.string().cuid("Invalid area ID"),
  make: z.string().optional(),
  model: z.string().optional(),
  serialNum: z.string().optional(),
  stages: z.number().int().min(1).max(6).optional(),
  tons: z.number().min(0.5).max(200).optional(),
  refrigerant: z.string().optional(),
  notes: z.string().optional()
})

export const CreateSessionSchema = z.object({
  areaId: z.string().cuid("Invalid area ID"),
  title: z.string().optional(),
  weatherOADryBulb: temperatureSchema.optional(),
  weatherOARH: humiditySchema.optional(),
  weatherNotes: z.string().optional(),
  notes: z.string().optional()
})

export const CreateTestResultSchema = z.object({
  sessionId: z.string().cuid("Invalid session ID"),
  unitId: z.string().cuid("Invalid unit ID").optional(),
  testType: z.enum([
    'BUILDING_PRESSURE',
    'PRESSURE_DECAY', 
    'RETURN_CURB_LEAKAGE',
    'SLAB_WALL_MOISTURE',
    'AIRFLOW_STATIC',
    'REFRIGERANT_CIRCUIT',
    'COIL_PERFORMANCE',
    'FAN_EVAP_RECHECK',
    'ECONOMIZER_SEAL',
    'DISTRIBUTION_MIXING'
  ]),
  reading: z.any(), // Will be validated against specific test schema based on testType
  notes: z.string().optional()
})

// User schemas
export const RegisterUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
})

export const LoginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
})

// File upload schema
export const FileUploadSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  fileSize: z.number().int().positive(),
  category: z.enum(['PHOTO', 'IR_IMAGE', 'NAMEPLATE', 'DOCUMENT', 'OTHER']).optional().default('OTHER'),
  label: z.string().optional()
})

// Type exports
export type BuildingPressureData = z.infer<typeof BuildingPressureSchema>
export type PressureDecayData = z.infer<typeof PressureDecaySchema>
export type ReturnCurbLeakageData = z.infer<typeof ReturnCurbLeakageSchema>
export type SlabWallMoistureData = z.infer<typeof SlabWallMoistureSchema>
export type AirflowStaticData = z.infer<typeof AirflowStaticSchema>
export type RefrigerantCircuitData = z.infer<typeof RefrigerantCircuitSchema>
export type CoilPerformanceData = z.infer<typeof CoilPerformanceSchema>
export type FanEvapRecheckData = z.infer<typeof FanEvapRecheckSchema>
export type EconomizerSealData = z.infer<typeof EconomizerSealSchema>
export type DistributionMixingData = z.infer<typeof DistributionMixingSchema>

export type TestReadingData = z.infer<typeof TestReadingSchema>
export type CreateProjectData = z.infer<typeof CreateProjectSchema>
export type CreateAreaData = z.infer<typeof CreateAreaSchema>
export type CreateHvacUnitData = z.infer<typeof CreateHvacUnitSchema>
export type CreateSessionData = z.infer<typeof CreateSessionSchema>
export type CreateTestResultData = z.infer<typeof CreateTestResultSchema>
export type RegisterUserData = z.infer<typeof RegisterUserSchema>
export type LoginUserData = z.infer<typeof LoginUserSchema>
export type FileUploadData = z.infer<typeof FileUploadSchema>
