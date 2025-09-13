import { useState, useEffect, useMemo } from 'react';

/**
 * Hook for managing pagination state
 */
export const usePagination = (items = [], itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil((items || []).length / itemsPerPage);
  
  const paginatedItems = useMemo(() => {
    if (!items) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const resetPage = () => setCurrentPage(1);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    handleNextPage,
    handlePreviousPage,
    resetPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
};

/**
 * Hook for managing search functionality
 */
export const useSearch = (items = [], searchableFields = []) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim() || !items) return items || [];
    
    const lowerCaseQuery = searchQuery.toLowerCase();
    return items.filter(item =>
      searchableFields.some(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], item);
        return value?.toString().toLowerCase().includes(lowerCaseQuery);
      })
    );
  }, [items, searchQuery, searchableFields]);

  const clearSearch = () => setSearchQuery('');

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
    clearSearch,
    hasResults: (filteredItems || []).length > 0,
  };
};

/**
 * Hook for loading states
 */
export const useLoadingState = (initialState = 'idle') => {
  const [loadingState, setLoadingState] = useState(initialState);

  const setLoading = () => setLoadingState('loading');
  const setSuccess = () => setLoadingState('success');
  const setError = () => setLoadingState('error');
  const setIdle = () => setLoadingState('idle');

  return {
    loadingState,
    isLoading: loadingState === 'loading',
    isSuccess: loadingState === 'success',
    isError: loadingState === 'error',
    isIdle: loadingState === 'idle',
    setLoading,
    setSuccess,
    setError,
    setIdle,
  };
};

/**
 * Hook for client-side component hydration
 */
export const useClientOnly = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

/**
 * Hook for dynamically loading Polaris Viz components
 */
export const usePolarisViz = () => {
  const [Charts, setCharts] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadCharts = async () => {
      try {
        setIsLoading(true);
        const [mod] = await Promise.all([
          import('@shopify/polaris-viz'),
          import('@shopify/polaris-viz/build/esm/styles.css'),
        ]);

        if (mounted) {
          setCharts({
            LineChart: mod.LineChart,
            BarChart: mod.BarChart,
            SparkLineChart: mod.SparkLineChart,
          });
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          setIsLoading(false);
        }
      }
    };

    loadCharts();

    return () => {
      mounted = false;
    };
  }, []);

  return { Charts, isLoading, error };
};
