/**
 * Test Result Computation Engine
 * Processes raw test data and generates computed results and pass/fail determinations
 */

import { TestType } from '@prisma/client'
import {
  calculateDewPoint,
  calculateCfmPerTon, 
  calculateSuperheat,
  calculateSubcooling,
  checkBuildingPressure,
  checkCfmPerTon,
  checkSupplyDewPoint,
  checkSuperheat,
  checkSubcooling,
  calculatePressureDecayRate,
  calculateStats
} from './calculations'
import type {
  BuildingPressureData,
  PressureDecayData,
  ReturnCurbLeakageData,
  SlabWallMoistureData,
  AirflowStaticData,
  RefrigerantCircuitData,
  CoilPerformanceData,
  FanEvapRecheckData,
  EconomizerSealData,
  DistributionMixingData
} from './schemas'

export interface ComputedResult {
  calculations: Record<string, number>
  checks: Record<string, {
    pass: boolean
    value: number | string
    target: string
    message: string
  }>
  pass: boolean
  summary: string
}

/**
 * Process test results and generate computed values
 */
export function computeTestResult(
  testType: TestType,
  reading: any,
  weatherData?: { outdoorTemp?: number; outdoorRH?: number }
): ComputedResult {
  
  switch (testType) {
    case 'BUILDING_PRESSURE':
      return computeBuildingPressure(reading as BuildingPressureData)
      
    case 'PRESSURE_DECAY':
      return computePressureDecay(reading as PressureDecayData)
      
    case 'RETURN_CURB_LEAKAGE':
      return computeReturnCurbLeakage(reading as ReturnCurbLeakageData)
      
    case 'SLAB_WALL_MOISTURE':
      return computeSlabWallMoisture(reading as SlabWallMoistureData)
      
    case 'AIRFLOW_STATIC':
      return computeAirflowStatic(reading as AirflowStaticData)
      
    case 'REFRIGERANT_CIRCUIT':
      return computeRefrigerantCircuit(reading as RefrigerantCircuitData, weatherData?.outdoorTemp)
      
    case 'COIL_PERFORMANCE':
      return computeCoilPerformance(reading as CoilPerformanceData)
      
    case 'FAN_EVAP_RECHECK':
      return computeFanEvapRecheck(reading as FanEvapRecheckData)
      
    case 'ECONOMIZER_SEAL':
      return computeEconomizerSeal(reading as EconomizerSealData)
      
    case 'DISTRIBUTION_MIXING':
      return computeDistributionMixing(reading as DistributionMixingData)
      
    default:
      throw new Error(`Unknown test type: ${testType}`)
  }
}

function computeBuildingPressure(data: BuildingPressureData): ComputedResult {
  const check = checkBuildingPressure(data.deltaP_inwc)
  
  return {
    calculations: {
      pressure_inwc: data.deltaP_inwc
    },
    checks: {
      building_pressure: check
    },
    pass: check.pass,
    summary: check.message
  }
}

function computePressureDecay(data: PressureDecayData): ComputedResult {
  const decayRate = calculatePressureDecayRate(data.startDeltaP, data.endDeltaP, data.decaySeconds)
  const totalDecay = data.startDeltaP - data.endDeltaP
  
  // Typical acceptable decay rate is < 0.01 in. w.c. per minute
  const acceptableDecayRate = 0.01
  const pass = decayRate <= acceptableDecayRate
  
  return {
    calculations: {
      decay_rate_per_min: decayRate,
      total_decay_inwc: totalDecay,
      decay_percentage: (totalDecay / data.startDeltaP) * 100
    },
    checks: {
      decay_rate: {
        pass,
        value: decayRate,
        target: `≤ ${acceptableDecayRate} in. w.c./min`,
        message: pass 
          ? 'Pressure decay within acceptable limits'
          : 'Excessive pressure decay - check for envelope leaks'
      }
    },
    pass,
    summary: pass 
      ? `Pressure decay rate of ${decayRate.toFixed(4)} in. w.c./min is acceptable`
      : `Pressure decay rate of ${decayRate.toFixed(4)} in. w.c./min exceeds limit`
  }
}

function computeReturnCurbLeakage(data: ReturnCurbLeakageData): ComputedResult {
  const pressureDiff = Math.abs(data.returnStatic_inwc - data.supplyStatic_inwc)
  
  // Check for significant pressure imbalance (> 0.1 in. w.c.)
  const maxDiff = 0.1
  const pressurePass = pressureDiff <= maxDiff
  const leakPass = !data.smokeLeaksFound
  const overallPass = pressurePass && leakPass
  
  return {
    calculations: {
      return_static_inwc: data.returnStatic_inwc,
      supply_static_inwc: data.supplyStatic_inwc,
      pressure_difference_inwc: pressureDiff
    },
    checks: {
      pressure_balance: {
        pass: pressurePass,
        value: pressureDiff,
        target: `≤ ${maxDiff} in. w.c.`,
        message: pressurePass 
          ? 'Return/supply pressure difference within limits'
          : 'Excessive pressure imbalance detected'
      },
      smoke_leaks: {
        pass: leakPass,
        value: data.smokeLeaksFound ? 'FOUND' : 'NONE',
        target: 'NONE',
        message: leakPass 
          ? 'No smoke leaks detected'
          : `Smoke leaks found at: ${data.leakLocations?.join(', ') || 'unspecified locations'}`
      }
    },
    pass: overallPass,
    summary: overallPass 
      ? 'Return/curb leakage test passed'
      : 'Return/curb leakage issues detected'
  }
}

function computeSlabWallMoisture(data: SlabWallMoistureData): ComputedResult {
  const pass = data.plasticTest === 'DRY'
  
  return {
    calculations: {},
    checks: {
      plastic_test: {
        pass,
        value: data.plasticTest,
        target: 'DRY',
        message: pass 
          ? 'No moisture issues detected under plastic test'
          : `Moisture detected: ${data.plasticTest.toLowerCase()}`
      }
    },
    pass,
    summary: pass 
      ? 'No moisture issues detected'
      : `Moisture issues detected: ${data.plasticTest.toLowerCase()}`
  }
}

function computeAirflowStatic(data: AirflowStaticData): ComputedResult {
  const cfmPerTon = calculateCfmPerTon(data.supplyCFM, data.tons)
  const cfmCheck = checkCfmPerTon(cfmPerTon)
  
  // Check static pressure (typical range 0.5-1.2 in. w.c.)
  const staticPass = data.extStatic_inwc >= 0.3 && data.extStatic_inwc <= 1.5
  
  return {
    calculations: {
      cfm_per_ton: cfmPerTon,
      supply_cfm: data.supplyCFM,
      return_cfm: data.returnCFM || 0,
      external_static_inwc: data.extStatic_inwc
    },
    checks: {
      cfm_per_ton: cfmCheck,
      external_static: {
        pass: staticPass,
        value: data.extStatic_inwc,
        target: '0.3 - 1.5 in. w.c.',
        message: staticPass 
          ? 'External static pressure within normal range'
          : data.extStatic_inwc < 0.3 
            ? 'External static pressure too low'
            : 'External static pressure too high - check for restrictions'
      }
    },
    pass: cfmCheck.pass && staticPass,
    summary: `CFM/ton: ${cfmPerTon.toFixed(0)}, Static: ${data.extStatic_inwc}" w.c.`
  }
}

function computeRefrigerantCircuit(data: RefrigerantCircuitData, outdoorTemp?: number): ComputedResult {
  const superheat = calculateSuperheat(data.suctionLineTemp_F, data.suctionPSI)
  const subcooling = calculateSubcooling(data.liquidLineTemp_F, data.liquidPSI)
  
  const shCheck = checkSuperheat(superheat, outdoorTemp || data.outdoorDB_F)
  const scCheck = checkSubcooling(subcooling, outdoorTemp || data.outdoorDB_F)
  
  return {
    calculations: {
      superheat_F: superheat,
      subcooling_F: subcooling,
      suction_psi: data.suctionPSI,
      liquid_psi: data.liquidPSI,
      suction_temp_F: data.suctionLineTemp_F,
      liquid_temp_F: data.liquidLineTemp_F
    },
    checks: {
      superheat: shCheck,
      subcooling: scCheck
    },
    pass: shCheck.pass && scCheck.pass,
    summary: `SH: ${superheat.toFixed(1)}°F, SC: ${subcooling.toFixed(1)}°F`
  }
}

function computeCoilPerformance(data: CoilPerformanceData): ComputedResult {
  const returnDP = calculateDewPoint(data.returnDB_F, data.returnRH_pct)
  const supplyDP = calculateDewPoint(data.supplyDB_F, data.supplyRH_pct)
  const dewPointDrop = returnDP - supplyDP
  const tempDrop = data.returnDB_F - data.supplyDB_F
  
  const supplyDPCheck = checkSupplyDewPoint(supplyDP)
  
  // Check for reasonable temperature drop (8-25°F typical)
  const tempDropPass = tempDrop >= 8 && tempDrop <= 25
  
  return {
    calculations: {
      return_dew_point_F: returnDP,
      supply_dew_point_F: supplyDP,
      dew_point_drop_F: dewPointDrop,
      temperature_drop_F: tempDrop,
      condensate_oz_per_30min: data.condensateVolume_oz_per_30min || 0
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
      }
    },
    pass: supplyDPCheck.pass && tempDropPass,
    summary: `Supply DP: ${supplyDP.toFixed(1)}°F, ΔT: ${tempDrop.toFixed(1)}°F`
  }
}

function computeFanEvapRecheck(data: FanEvapRecheckData): ComputedResult {
  const returnDP = calculateDewPoint(data.returnDB_F, data.returnRH_pct)
  const supplyDP = calculateDewPoint(data.supplyDB_F, data.supplyRH_pct)
  
  const supplyDPCheck = checkSupplyDewPoint(supplyDP)
  const staticPass = data.staticPressure_inwc >= 0.3 && data.staticPressure_inwc <= 1.5
  
  return {
    calculations: {
      return_dew_point_F: returnDP,
      supply_dew_point_F: supplyDP,
      airflow_cfm: data.airflowCFM,
      static_pressure_inwc: data.staticPressure_inwc
    },
    checks: {
      supply_dew_point: supplyDPCheck,
      static_pressure: {
        pass: staticPass,
        value: data.staticPressure_inwc,
        target: '0.3 - 1.5 in. w.c.',
        message: staticPass ? 'Static pressure acceptable' : 'Static pressure out of range'
      }
    },
    pass: supplyDPCheck.pass && staticPass,
    summary: `Fan/evap recheck - Supply DP: ${supplyDP.toFixed(1)}°F`
  }
}

function computeEconomizerSeal(data: EconomizerSealData): ComputedResult {
  // Economizer should be fully closed (0%) and have no leakage
  const positionPass = data.commandedPct <= 5 // Allow small tolerance
  const leakPass = !data.leakageObserved
  
  return {
    calculations: {
      commanded_position_pct: data.commandedPct
    },
    checks: {
      damper_position: {
        pass: positionPass,
        value: data.commandedPct,
        target: '0%',
        message: positionPass 
          ? 'Economizer damper properly closed'
          : 'Economizer damper not fully closed'
      },
      leakage_test: {
        pass: leakPass,
        value: data.leakageObserved ? 'OBSERVED' : 'NONE',
        target: 'NONE',
        message: leakPass 
          ? `No leakage observed (${data.method} test)`
          : `Leakage observed during ${data.method} test`
      }
    },
    pass: positionPass && leakPass,
    summary: leakPass ? 'Economizer seal test passed' : 'Economizer leakage detected'
  }
}

function computeDistributionMixing(data: DistributionMixingData): ComputedResult {
  const temperatures = data.gridSamples.map(s => s.db_F)
  const humidities = data.gridSamples.map(s => s.rh_pct)
  const dewPoints = data.gridSamples.map(s => calculateDewPoint(s.db_F, s.rh_pct))
  
  const tempStats = calculateStats(temperatures)
  const rhStats = calculateStats(humidities)
  const dpStats = calculateStats(dewPoints)
  
  // Check for good mixing (temperature variation < 5°F, RH variation < 10%)
  const tempVariationPass = (tempStats.max - tempStats.min) <= 5
  const rhVariationPass = (rhStats.max - rhStats.min) <= 10
  
  return {
    calculations: {
      temp_min_F: tempStats.min,
      temp_max_F: tempStats.max,
      temp_avg_F: tempStats.avg,
      temp_variation_F: tempStats.max - tempStats.min,
      rh_min_pct: rhStats.min,
      rh_max_pct: rhStats.max, 
      rh_avg_pct: rhStats.avg,
      rh_variation_pct: rhStats.max - rhStats.min,
      dp_min_F: dpStats.min,
      dp_max_F: dpStats.max,
      dp_avg_F: dpStats.avg,
      return_dp_F: data.returnDewPoint_F
    },
    checks: {
      temperature_mixing: {
        pass: tempVariationPass,
        value: tempStats.max - tempStats.min,
        target: '≤ 5°F variation',
        message: tempVariationPass 
          ? 'Good temperature mixing achieved'
          : 'Poor temperature mixing - check airflow distribution'
      },
      humidity_mixing: {
        pass: rhVariationPass,
        value: rhStats.max - rhStats.min,
        target: '≤ 10% RH variation',
        message: rhVariationPass 
          ? 'Good humidity mixing achieved'
          : 'Poor humidity mixing - check airflow distribution'
      }
    },
    pass: tempVariationPass && rhVariationPass,
    summary: `Zone mixing - ΔT: ${(tempStats.max - tempStats.min).toFixed(1)}°F, ΔRH: ${(rhStats.max - rhStats.min).toFixed(1)}%`
  }
}
