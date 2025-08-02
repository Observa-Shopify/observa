// App-wide constants
export const APP_CONSTANTS = {
  // App Configuration
  APP_NAME: 'Performance Monitor',
  API_TIMEOUT: 10000, // 10 seconds

  // Pagination
  DEFAULT_ITEMS_PER_PAGE: 10,
  MAX_DAYS_TO_RETAIN: 50,

  // Chart colors following Shopify's color palette
  COLORS: {
    PRIMARY: '#007ACE',
    SUCCESS: '#47C1BF',
    WARNING: '#FAAD14',
    CRITICAL: '#FF4D4F',
    CONVERSION: '#47C1BF',
    BOUNCE: '#FF6B6B',
    CHECKOUT: '#ADD8E6',
    NEUTRAL: '#E1E3E5',
  },

  // Metric thresholds
  METRICS: {
    CONVERSION_RATE: {
      GOOD: 3.0,
      AVERAGE: 1.5,
    },
    BOUNCE_RATE: {
      GOOD: 26,
      AVERAGE: 50,
    },
    VITALS: {
      TTFB: { GOOD: 200, NEEDS_IMPROVEMENT: 600 },
      FCP: { GOOD: 1000, NEEDS_IMPROVEMENT: 3000 },
      LCP: { GOOD: 2500, NEEDS_IMPROVEMENT: 4000 },
      CLS: { GOOD: 0.1, NEEDS_IMPROVEMENT: 0.25 },
    },
  },

  // Date formats
  DATE_FORMATS: {
    DISPLAY: 'MMM dd, yyyy',
    API: 'yyyy-MM-dd',
    FULL: 'yyyy-MM-dd HH:mm:ss',
  },
};

// Badge tone mappings
export const BADGE_TONES = {
  HEALTHY: 'success',
  WARNING: 'warning',
  CRITICAL: 'critical',
  NEUTRAL: 'subdued',
};

// Common loading states
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};
