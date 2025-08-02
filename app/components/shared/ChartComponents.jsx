import React from 'react';
import { LoadingState } from './LoadingStates';
import { usePolarisViz } from '../../utils/hooks';

/**
 * Chart wrapper that handles loading Polaris Viz components
 */
export const ChartWrapper = ({ 
  children, 
  loading = false, 
  error = null,
  fallback = <LoadingState message="Loading chart..." />
}) => {
  const { Charts, isLoading, error: chartError } = usePolarisViz();

  if (loading || isLoading) {
    return fallback;
  }

  if (error || chartError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--p-color-text-subdued)' }}>
        Failed to load chart
      </div>
    );
  }

  if (!Charts) {
    return fallback;
  }

  return React.cloneElement(children, { Charts });
};

/**
 * Standardized Spark Line Chart component
 */
export const SparkChart = ({ 
  data = [], 
  color = '#007ACE', 
  accessibilityLabel = 'Chart'
}) => {
  const { Charts, isLoading, error } = usePolarisViz();

  if (isLoading) {
    return <LoadingState message="Loading chart..." />;
  }

  if (error || !Charts?.SparkLineChart) {
    return (
      <div style={{ padding: '10px', textAlign: 'center', color: 'var(--p-color-text-subdued)', fontSize: '12px' }}>
        Chart loading...
      </div>
    );
  }

  const { SparkLineChart } = Charts;

  return (
    <SparkLineChart
      data={[{
        name: "Data",
        color: color,
        data: data
      }]}
      accessibilityLabel={accessibilityLabel}
      theme="default"
    />
  );
};

/**
 * Standardized Line Chart component
 */
export const LineChart = ({ 
  data = [], 
  xAxisOptions = {},
  yAxisOptions = {},
  accessibilityLabel = 'Line Chart'
}) => {
  const { Charts, isLoading, error } = usePolarisViz();

  if (isLoading) {
    return <LoadingState message="Loading chart..." />;
  }

  if (error || !Charts?.LineChart) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--p-color-text-subdued)' }}>
        Failed to load chart
      </div>
    );
  }

  const { LineChart: PolarisLineChart } = Charts;

  return (
    <PolarisLineChart
      data={data}
      theme="default"
      isAnimated
      xAxisOptions={xAxisOptions}
      yAxisOptions={yAxisOptions}
      accessibilityLabel={accessibilityLabel}
    />
  );
};

/**
 * Standardized Bar Chart component
 */
export const BarChart = ({ 
  data = [], 
  layout = 'vertical',
  xAxisOptions = {},
  yAxisOptions = {},
  accessibilityLabel = 'Bar Chart'
}) => {
  const { Charts, isLoading, error } = usePolarisViz();

  if (isLoading) {
    return <LoadingState message="Loading chart..." />;
  }

  if (error || !Charts?.BarChart) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--p-color-text-subdued)' }}>
        Failed to load chart
      </div>
    );
  }

  const { BarChart: PolarisBarChart } = Charts;

  return (
    <PolarisBarChart
      data={data}
      theme="default"
      isAnimated
      layout={layout}
      xAxisOptions={xAxisOptions}
      yAxisOptions={yAxisOptions}
      accessibilityLabel={accessibilityLabel}
    />
  );
};
