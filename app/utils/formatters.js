/**
 * Common utility functions for formatting and calculations
 */

/**
 * Format numbers for display with proper decimal places
 */
export const formatNumber = (value, decimals = 2) => {
  if (value == null || isNaN(value)) return '0.00';
  return Number(value).toFixed(decimals);
};

/**
 * Format currency values
 */
export const formatCurrency = (value, currency = 'USD') => {
  if (value == null || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(value);
};

/**
 * Format dates consistently across the app
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  };
  
  return date.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Calculate percentage change between two values
 */
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

/**
 * Determine status based on percentage change
 */
export const getGrowthStatus = (percentageChange) => {
  if (percentageChange > 0) return 'increase';
  if (percentageChange < 0) return 'decrease';
  return 'no-change';
};

/**
 * Get badge tone based on metric type and value
 */
export const getBadgeTone = (metricType, value, thresholds) => {
  if (!thresholds) return 'subdued';
  
  switch (metricType) {
    case 'conversion':
    case 'growth':
      if (value >= thresholds.GOOD) return 'success';
      if (value >= thresholds.AVERAGE) return 'warning';
      return 'critical';
    
    case 'bounce':
      if (value <= thresholds.GOOD) return 'success';
      if (value <= thresholds.AVERAGE) return 'warning';
      return 'critical';
    
    default:
      return 'subdued';
  }
};

/**
 * Parse metric values from various formats
 */
export const parseMetricValue = (value) => {
  if (typeof value === 'string') {
    const numeric = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(numeric) ? 0 : numeric;
  }
  if (typeof value === 'number') return value;
  return 0;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Debounce function for search inputs
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
