/**
 * HVAC Calculation Utilities
 * Implements engineering calculations for commissioning tests
 */

/**
 * Calculate dew point temperature using Magnus formula
 * @param tempF - Dry bulb temperature in °F
 * @param rh - Relative humidity as percentage (0-100)
 * @returns Dew point temperature in °F
 */
export function calculateDewPoint(tempF: number, rh: number): number {
  // Convert °F to °C
  const tempC = (tempF - 32) * 5/9
  
  // Magnus formula constants
  const a = 17.625
  const b = 243.04
  
  // Calculate gamma
  const gamma = Math.log(rh / 100) + (a * tempC) / (b + tempC)
  
  // Calculate dew point in °C
  const dewPointC = (b * gamma) / (a - gamma)
  
  // Convert back to °F
  return (dewPointC * 9/5) + 32
}

/**
 * Calculate CFM per ton ratio
 * @param cfm - Air flow in cubic feet per minute
 * @param tons - Cooling capacity in tons
 * @returns CFM per ton ratio
 */
export function calculateCfmPerTon(cfm: number, tons: number): number {
  if (tons === 0) return 0
  return cfm / tons
}

/**
 * Calculate superheat (SH) for refrigeration circuit
 * @param suctionLineTemp - Suction line temperature in °F
 * @param suctionPressure - Suction pressure in PSIG
 * @param refrigerant - Refrigerant type (default R-410A)
 * @returns Superheat in °F
 */
export function calculateSuperheat(
  suctionLineTemp: number, 
  suctionPressure: number,
  refrigerant: string = 'R-410A'
): number {
  // Simplified R-410A saturation temperature lookup
  // In production, use proper refrigerant property tables
  const satTemp = getSaturationTemp(suctionPressure, refrigerant)
  return suctionLineTemp - satTemp
}

/**
 * Calculate subcooling (SC) for refrigeration circuit
 * @param liquidLineTemp - Liquid line temperature in °F
 * @param liquidPressure - Liquid pressure in PSIG
 * @param refrigerant - Refrigerant type (default R-410A)
 * @returns Subcooling in °F
 */
export function calculateSubcooling(
  liquidLineTemp: number,
  liquidPressure: number,
  refrigerant: string = 'R-410A'
): number {
  const satTemp = getSaturationTemp(liquidPressure, refrigerant)
  return satTemp - liquidLineTemp
}

/**
 * Simplified saturation temperature lookup for R-410A
 * In production, use proper refrigerant property database
 */
function getSaturationTemp(pressure: number, refrigerant: string): number {
  if (refrigerant === 'R-410A') {
    // Simplified linear approximation for R-410A
    // Actual implementation should use proper property tables
    if (pressure <= 50) return -20 + (pressure * 1.6)
    if (pressure <= 100) return 60 + ((pressure - 50) * 1.2)
    if (pressure <= 200) return 120 + ((pressure - 100) * 0.8)
    return 200 + ((pressure - 200) * 0.4)
  }
  
  // Default for other refrigerants - should implement proper tables
  return 32 + (pressure * 0.5)
}

/**
 * Check if building pressure is within acceptable range
 * @param deltaP - Pressure difference in inches w.c.
 * @returns Pass/fail result with details
 */
export function checkBuildingPressure(deltaP: number) {
  const min = 0.02
  const max = 0.05
  const pass = deltaP >= min && deltaP <= max
  
  return {
    pass,
    value: deltaP,
    target: `${min} - ${max} in. w.c.`,
    message: pass 
      ? 'Building pressure within acceptable range'
      : deltaP < min 
        ? 'Building pressure too low - insufficient pressurization'
        : 'Building pressure too high - over pressurized'
  }
}

/**
 * Check if CFM/ton is within acceptable range for dehumidification
 * @param cfmPerTon - CFM per ton ratio
 * @returns Pass/fail result with details
 */
export function checkCfmPerTon(cfmPerTon: number) {
  const min = 350
  const max = 400
  const pass = cfmPerTon >= min && cfmPerTon <= max
  
  return {
    pass,
    value: cfmPerTon,
    target: `${min} - ${max} CFM/ton`,
    message: pass
      ? 'CFM/ton within acceptable range for dehumidification'
      : cfmPerTon < min
        ? 'CFM/ton too low - may indicate airflow restriction'
        : 'CFM/ton too high - poor dehumidification performance'
  }
}

/**
 * Check if supply air dew point is within acceptable range
 * @param supplyDP - Supply air dew point in °F
 * @returns Pass/fail result with details
 */
export function checkSupplyDewPoint(supplyDP: number) {
  const min = 50
  const max = 55
  const pass = supplyDP >= min && supplyDP <= max
  
  return {
    pass,
    value: supplyDP,
    target: `${min} - ${max}°F`,
    message: pass
      ? 'Supply dew point within acceptable range'
      : supplyDP < min
        ? 'Supply dew point too low - over-dehumidification'
        : 'Supply dew point too high - insufficient dehumidification'
  }
}

/**
 * Check if superheat is within acceptable range
 * @param superheat - Superheat value in °F
 * @param outdoorTemp - Outdoor temperature in °F (affects acceptable range)
 * @returns Pass/fail result with details
 */
export function checkSuperheat(superheat: number, outdoorTemp: number = 95) {
  // Typical acceptable range, varies by manufacturer and conditions
  let min = 8
  let max = 15
  
  // Adjust for outdoor conditions
  if (outdoorTemp > 100) {
    min = 6
    max = 12
  } else if (outdoorTemp < 80) {
    min = 10
    max = 18
  }
  
  const pass = superheat >= min && superheat <= max
  
  return {
    pass,
    value: superheat,
    target: `${min} - ${max}°F`,
    message: pass
      ? 'Superheat within acceptable range'
      : superheat < min
        ? 'Superheat too low - possible refrigerant overcharge or TXV issues'
        : 'Superheat too high - possible refrigerant undercharge or restriction'
  }
}

/**
 * Check if subcooling is within acceptable range
 * @param subcooling - Subcooling value in °F
 * @param outdoorTemp - Outdoor temperature in °F
 * @returns Pass/fail result with details
 */
export function checkSubcooling(subcooling: number, outdoorTemp: number = 95) {
  // Typical acceptable range
  let min = 8
  let max = 15
  
  // Adjust for outdoor conditions
  if (outdoorTemp > 100) {
    min = 10
    max = 18
  } else if (outdoorTemp < 80) {
    min = 6
    max = 12
  }
  
  const pass = subcooling >= min && subcooling <= max
  
  return {
    pass,
    value: subcooling,
    target: `${min} - ${max}°F`,
    message: pass
      ? 'Subcooling within acceptable range'
      : subcooling < min
        ? 'Subcooling too low - possible refrigerant undercharge'
        : 'Subcooling too high - possible refrigerant overcharge or restriction'
  }
}

/**
 * Calculate temperature effectiveness for economizer
 * @param mixedAirTemp - Mixed air temperature in °F
 * @param returnAirTemp - Return air temperature in °F  
 * @param outsideAirTemp - Outside air temperature in °F
 * @returns Economizer effectiveness as percentage
 */
export function calculateEconomizerEffectiveness(
  mixedAirTemp: number,
  returnAirTemp: number,
  outsideAirTemp: number
): number {
  if (returnAirTemp === outsideAirTemp) return 100 // Avoid division by zero
  
  const effectiveness = ((returnAirTemp - mixedAirTemp) / (returnAirTemp - outsideAirTemp)) * 100
  return Math.max(0, Math.min(100, effectiveness)) // Clamp between 0-100%
}

/**
 * Calculate enthalpy from dry bulb temperature and relative humidity
 * Simplified calculation - use proper psychrometric libraries in production
 * @param tempF - Dry bulb temperature in °F
 * @param rh - Relative humidity as percentage
 * @returns Enthalpy in BTU/lb
 */
export function calculateEnthalpy(tempF: number, rh: number): number {
  // This is a simplified approximation
  // Use proper psychrometric calculations in production
  const dewPointF = calculateDewPoint(tempF, rh)
  const humidityRatio = 0.622 * (getSaturationPressure(dewPointF) / (14.696 - getSaturationPressure(dewPointF)))
  
  return 0.24 * tempF + humidityRatio * (1061 + 0.444 * tempF)
}

/**
 * Simplified saturation pressure calculation (psia)
 */
function getSaturationPressure(tempF: number): number {
  const tempR = tempF + 459.67 // Convert to Rankine
  // Simplified Antoine equation approximation
  return Math.exp(18.3036 - 3816.44 / tempR - 46.13 * Math.log(tempR))
}

/**
 * Calculate pressure decay rate
 * @param startPressure - Initial pressure in in. w.c.
 * @param endPressure - Final pressure in in. w.c.  
 * @param timeSeconds - Time duration in seconds
 * @returns Decay rate in in. w.c. per minute
 */
export function calculatePressureDecayRate(
  startPressure: number,
  endPressure: number,
  timeSeconds: number
): number {
  if (timeSeconds === 0) return 0
  const decayAmount = startPressure - endPressure
  return (decayAmount / timeSeconds) * 60 // Convert to per minute
}

/**
 * Calculate statistical values for a dataset
 * @param values - Array of numbers
 * @returns Object with min, max, average, and standard deviation
 */
export function calculateStats(values: number[]) {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, stdDev: 0 }
  }
  
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  
  return { min, max, avg, stdDev }
}
