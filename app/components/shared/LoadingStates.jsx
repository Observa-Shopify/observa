import React from 'react';
import { Spinner, Box, Text } from '@shopify/polaris';

/**
 * Standardized loading component with optional message
 */
export const LoadingState = ({ 
  message = 'Loading...',
  size = 'large',
  centered = true 
}) => (
  <Box 
    padding="500" 
    {...(centered && { display: 'flex', alignItems: 'center', justifyContent: 'center' })}
  >
    <Box display="flex" flexDirection="column" alignItems="center" gap="200">
      <Spinner accessibilityLabel={message} size={size} />
      <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
        {message}
      </Text>
    </Box>
  </Box>
);

/**
 * Standardized error state component
 */
export const ErrorState = ({ 
  title = 'Something went wrong',
  message = 'An error occurred while loading data.',
  action = null
}) => (
  <Box padding="500" display="flex" flexDirection="column" alignItems="center" gap="300">
    <Text as="h2" variant="headingMd" tone="critical" alignment="center">
      {title}
    </Text>
    <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
      {message}
    </Text>
    {action && action}
  </Box>
);

/**
 * Standardized empty state component
 */
export const EmptyDataState = ({ 
  title = 'No data available',
  message = 'Data will appear here once available.',
  illustration = null,
  action = null
}) => (
  <Box padding="500" display="flex" flexDirection="column" alignItems="center" gap="300">
    {illustration}
    <Text as="h2" variant="headingMd" tone="subdued" alignment="center">
      {title}
    </Text>
    <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
      {message}
    </Text>
    {action && action}
  </Box>
);
