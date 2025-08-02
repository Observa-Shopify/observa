import React from 'react';
import { 
  DataTable, 
  Card, 
  Pagination, 
  TextField, 
  BlockStack, 
  Box,
  Text,
  InlineStack
} from '@shopify/polaris';
import { EmptyDataState } from './LoadingStates';

/**
 * Enhanced data table with built-in search and pagination
 */
export const EnhancedDataTable = ({
  title,
  data = [],
  columns = [],
  searchable = true,
  searchPlaceholder = 'Search...',
  searchQuery = '',
  onSearchChange = () => {},
  onClearSearch = () => {},
  // Pagination props
  currentPage = 1,
  totalPages = 1,
  hasNextPage = false,
  hasPreviousPage = false,
  onNextPage = () => {},
  onPreviousPage = () => {},
  // Table props
  columnContentTypes = [],
  emptyState = null,
  loading = false,
  ...tableProps
}) => {
  const hasData = data && data.length > 0;

  const renderEmptyState = () => {
    if (emptyState) return emptyState;
    
    return (
      <EmptyDataState
        title="No data found"
        message={searchQuery ? `No results found for "${searchQuery}"` : "Data will appear here when available."}
      />
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <Box paddingBlockStart="400">
        <InlineStack align="center">
          <Pagination
            hasPrevious={hasPreviousPage}
            onPrevious={onPreviousPage}
            hasNext={hasNextPage}
            onNext={onNextPage}
            label={`Page ${currentPage} of ${totalPages}`}
          />
        </InlineStack>
      </Box>
    );
  };

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header with title and search */}
        <InlineStack align="space-between" blockAlign="center">
          {title && (
            <Text as="h2" variant="headingLg">
              {title}
            </Text>
          )}
          <div style={{ minWidth: '200px' }}>
            {searchable && (
              <TextField
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={onSearchChange}
                clearButton
                onClearButtonClick={onClearSearch}
                autoComplete="off"
              />
            )}
          </div>
        </InlineStack>

        {/* Table or empty state */}
        {hasData ? (
          <BlockStack gap="400">
            <DataTable
              columnContentTypes={columnContentTypes}
              headings={columns}
              rows={data}
              loading={loading}
              {...tableProps}
            />
            {renderPagination()}
          </BlockStack>
        ) : (
          renderEmptyState()
        )}
      </BlockStack>
    </Card>
  );
};

/**
 * Simple responsive grid layout
 */
export const ResponsiveGrid = ({ 
  children, 
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = '400' 
}) => {
  const gridStyle = {
    display: 'grid',
    gap: `var(--p-space-${gap})`,
    gridTemplateColumns: `repeat(${columns.xs || 1}, 1fr)`,
  };

  // Add responsive breakpoints via CSS-in-JS (simplified)
  const responsiveStyle = `
    @media (min-width: 768px) {
      grid-template-columns: repeat(${columns.sm || columns.xs || 1}, 1fr);
    }
    @media (min-width: 1024px) {
      grid-template-columns: repeat(${columns.md || columns.sm || columns.xs || 1}, 1fr);
    }
    @media (min-width: 1280px) {
      grid-template-columns: repeat(${columns.lg || columns.md || columns.sm || columns.xs || 1}, 1fr);
    }
  `;

  return (
    <>
      <style>{responsiveStyle}</style>
      <div style={gridStyle}>
        {children}
      </div>
    </>
  );
};
