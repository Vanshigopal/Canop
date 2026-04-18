import {
  interquartileRange,
  max as ssMax,
  mean as ssMean,
  median,
  min as ssMin,
  mode,
  quantile,
  sampleCorrelation,
  standardDeviation as ssStdDev,
  sum as ssSum,
  tTestTwoSample,
  variance,
} from "simple-statistics";

/**
 * F1 — Basic descriptive statistics over a numeric array.
 * Returns null for empty arrays to avoid throwing.
 */
export interface SummaryStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number;
  min: number;
  max: number;
  range: number;
  standardDeviation: number;
  variance: number;
  p25: number;
  p75: number;
  iqr: number;
}

export function summary(values: number[]): SummaryStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const meanVal = ssMean(values);
  const minVal = ssMin(values);
  const maxVal = ssMax(values);
  return {
    count: values.length,
    sum: ssSum(values),
    mean: meanVal,
    median: median(values),
    mode: mode(values),
    min: minVal,
    max: maxVal,
    range: maxVal - minVal,
    standardDeviation: values.length > 1 ? ssStdDev(values) : 0,
    variance: values.length > 1 ? variance(values) : 0,
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    iqr: values.length > 1 ? interquartileRange(values) : 0,
  };
}

/**
 * F2 — Distribution histogram bucketing.
 * Splits the range [min, max] into buckets of size `bucketSize`
 * and counts occurrences in each bucket.
 */
export interface HistogramBucket {
  rangeStart: number;
  rangeEnd: number;
  count: number;
}

export function histogram(values: number[], bucketSize: number): HistogramBucket[] {
  if (values.length === 0 || bucketSize <= 0) return [];
  const minVal = ssMin(values);
  const maxVal = ssMax(values);
  if (minVal === maxVal) {
    return [{ rangeStart: minVal, rangeEnd: minVal + bucketSize, count: values.length }];
  }
  const bucketCount = Math.max(1, Math.ceil((maxVal - minVal) / bucketSize));
  const buckets: HistogramBucket[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const rangeStart = minVal + i * bucketSize;
    const rangeEnd = rangeStart + bucketSize;
    const isLast = i === bucketCount - 1;
    const count = values.filter((v) =>
      isLast ? v >= rangeStart && v <= rangeEnd : v >= rangeStart && v < rangeEnd,
    ).length;
    buckets.push({ rangeStart, rangeEnd, count });
  }
  return buckets;
}

/**
 * F3 — Pearson correlation coefficient between two numeric arrays.
 * Returns 0 for mismatched or underfilled inputs.
 */
export function correlation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;
  try {
    return sampleCorrelation(xs, ys);
  } catch {
    return 0;
  }
}

/**
 * F4 — Moving average smoothing.
 * Uses a centered window.
 */
export function movingAverage(values: number[], windowSize: number): number[] {
  if (values.length === 0) return [];
  if (values.length < windowSize) return [...values];
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
    const window = values.slice(start, end);
    result.push(ssMean(window));
  }
  return result;
}

/**
 * F4 — Exponential smoothing.
 * Higher alpha = more reactive to recent changes.
 */
export function exponentialSmoothing(values: number[], alpha = 0.3): number[] {
  if (values.length === 0) return [];
  const first = values[0] as number;
  const smoothed: number[] = [first];
  for (let i = 1; i < values.length; i++) {
    const v = values[i] as number;
    const prev = smoothed[i - 1] as number;
    smoothed.push(alpha * v + (1 - alpha) * prev);
  }
  return smoothed;
}

/**
 * F5 — Two-sample t-test with approximated p-value.
 * Returns significance at p < 0.05.
 */
export interface TTestResult {
  significant: boolean;
  pValue: number;
  tStatistic: number;
}

export function tTest(sampleA: number[], sampleB: number[]): TTestResult {
  if (sampleA.length < 2 || sampleB.length < 2) {
    return { significant: false, pValue: 1, tStatistic: 0 };
  }
  const tStat = tTestTwoSample(sampleA, sampleB, 0);
  const t = tStat ?? 0;
  const pValue = 2 * (1 - normalCDF(Math.abs(t)));
  return {
    significant: pValue < 0.05,
    pValue: Math.round(pValue * 10000) / 10000,
    tStatistic: Math.round(t * 1000) / 1000,
  };
}

function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t *
        (-0.3565638 +
          t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/**
 * Z-score: how many standard deviations is `value` from the sample mean.
 */
export function zScore(value: number, values: number[]): number {
  if (values.length < 2) return 0;
  const m = ssMean(values);
  const sd = ssStdDev(values);
  if (sd === 0) return 0;
  return (value - m) / sd;
}
