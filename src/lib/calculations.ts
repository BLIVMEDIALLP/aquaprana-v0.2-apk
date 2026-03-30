import { addDays } from 'date-fns';
import type { WaterQualityParam } from './types';
import { HARVEST_WINDOWS, WATER_QUALITY_RANGES } from './types';

/**
 * Calculate total live biomass in kg.
 * biomass = (stockingCount * survivalRate% * abwGrams) / 1000
 */
export function calculateBiomass(
  stockingCount: number,
  abwGrams: number,
  survivalRate: number
): number {
  return (stockingCount * (survivalRate / 100) * abwGrams) / 1000;
}

/**
 * Calculate survival rate as a percentage.
 * survivalRate = ((stocked - totalMortality) / stocked) * 100
 */
export function calculateSurvivalRate(
  stocked: number,
  totalMortality: number
): number {
  if (stocked <= 0) return 0;
  const rate = ((stocked - totalMortality) / stocked) * 100;
  return Math.max(0, Math.min(100, parseFloat(rate.toFixed(2))));
}

/**
 * Calculate Feed Conversion Ratio.
 * FCR = cumulativeFeedKg / biomassKg
 */
export function calculateFCR(
  cumulativeFeedKg: number,
  biomassKg: number
): number {
  if (biomassKg <= 0) return 0;
  return parseFloat((cumulativeFeedKg / biomassKg).toFixed(2));
}

/**
 * Calculate harvest window start and end dates based on stocking date and species.
 * Returns null if the species has no defined harvest window.
 */
export function calculateHarvestWindow(
  stockingDate: string,
  speciesKey: string
): { start: Date; end: Date } | null {
  const window = HARVEST_WINDOWS[speciesKey];
  if (!window) return null;

  const base = new Date(stockingDate);
  return {
    start: addDays(base, window.min),
    end: addDays(base, window.max),
  };
}

/**
 * Return a status colour for a water quality parameter value.
 * - "green" if the value is within the safe range
 * - "blue"  if the value is within the warning range (needs attention)
 * - "red"   if the value is in the critical range
 */
export function getWaterQualityStatus(
  param: WaterQualityParam,
  value: number
): 'green' | 'blue' | 'red' {
  const range = WATER_QUALITY_RANGES[param];
  if (!range) return 'green';

  const [safeMin, safeMax] = range.safe;
  if (value >= safeMin && value <= safeMax) return 'green';

  const [warnMin, warnMax] = range.warning;
  if (value >= warnMin && value <= warnMax) return 'blue';

  return 'red';
}

/**
 * Calculate total stocking count from density (per acre) and pond area.
 */
export function calculateStockingCount(
  density: number,
  areaAcres: number
): number {
  return Math.round(density * areaAcres);
}
