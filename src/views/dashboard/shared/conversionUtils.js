export const LOW_SAMPLE_THRESHOLD = 10

export const isLowSample = (totalQuotes) => (totalQuotes ?? 0) < LOW_SAMPLE_THRESHOLD
