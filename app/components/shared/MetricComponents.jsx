import React from 'react';
import { Card, Text, BlockStack, InlineStack, Badge } from '@shopify/polaris';
import { formatNumber } from '../../utils';

/**
 * Reusable metric card component for displaying KPIs
 */
export const MetricCard = ({
  title,
  value,
  subtitle = null,
  badge = null,
  icon = null,
  trend = null,
  chart = null,
  loading = false,
  formatValue = true,
  ...cardProps
}) => {
  const displayValue = formatValue && typeof value === 'number' 
    ? formatNumber(value) 
    : value;

  return (
    <Card {...cardProps}>
      <BlockStack gap="300">
        {/* Header */}
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd" tone="subdued">
            {title}
          </Text>
          {badge && <Badge tone={badge.tone}>{badge.text}</Badge>}
        </InlineStack>

        {/* Main value */}
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="p" variant="heading2xl">
              {loading ? '...' : displayValue}
            </Text>
            {subtitle && (
              <Text as="p" variant="bodySm" tone="subdued">
                {subtitle}
              </Text>
            )}
          </BlockStack>
          
          {/* Trend indicator or icon */}
          {(trend || icon) && (
            <div style={{ flexShrink: 0 }}>
              {trend && (
                <Text 
                  as="span" 
                  variant="bodyMd" 
                  tone={trend.type === 'increase' ? 'success' : trend.type === 'decrease' ? 'critical' : 'subdued'}
                >
                  {trend.value}
                </Text>
              )}
              {icon && icon}
            </div>
          )}
        </InlineStack>

        {/* Chart or additional content */}
        {chart && chart}
      </BlockStack>
    </Card>
  );
};

/**
 * Reusable stats grid component
 */
export const StatsGrid = ({ children, columns = 'auto' }) => (
  <div 
    style={{
      display: 'grid',
      gridTemplateColumns: typeof columns === 'number' 
        ? `repeat(${columns}, 1fr)` 
        : 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: 'var(--p-space-400)',
    }}
  >
    {children}
  </div>
);

/**
 * Progress bar circle component (improved version)
 */
export const ProgressCircle = ({ 
  percentage, 
  color = '#47C1BF', 
  size = 50, 
  strokeWidth = 5, 
  showText = true,
  label = null
}) => {
  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          stroke="var(--p-color-border-subdued)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.35s' }}
        />
        {/* Percentage text */}
        {showText && (
          <text
            x="50%"
            y="50%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize={size * 0.25}
            fill="var(--p-color-text)"
            fontWeight="600"
          >
            {percentage}%
          </text>
        )}
      </svg>
      {label && (
        <Text as="span" variant="bodySm" tone="subdued" alignment="center">
          {label}
        </Text>
      )}
    </div>
  );
};
