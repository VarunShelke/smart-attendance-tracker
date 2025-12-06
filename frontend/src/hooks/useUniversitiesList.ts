/**
 * Custom hook for managing universities list with pagination
 *
 * @module hooks/useUniversitiesList
 */

import {useState, useEffect, useCallback} from 'react';
import {listUniversities} from '../services/api/universities';
import type {University, UniversitiesListResponse} from '../services/api/universities';

interface UseUniversitiesListReturn {
    universities: University[];
    isLoading: boolean;
    error: string | undefined;
    currentPage: number;
    hasMore: boolean;
    totalCount: number;
    goToNextPage: () => void;
    goToPreviousPage: () => void;
    refresh: () => Promise<void>;
}

/**
 * Hook for fetching and managing universities list with pagination
 *
 * @param pageSize - Number of items per page (default: 20)
 * @returns Universities list state and pagination controls
 */
export function useUniversitiesList(pageSize: number = 20): UseUniversitiesListReturn {
    const [universities, setUniversities] = useState<University[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | undefined>();
    const [currentPage, setCurrentPage] = useState(1);
    const [lastKeys, setLastKeys] = useState<Record<number, string>>({});
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    /**
     * Load universities for a specific page
     */
    const loadUniversities = useCallback(async (page: number) => {
        try {
            setIsLoading(true);
            setError(undefined);

            // Get the last evaluated key for the requested page
            const lastKey = page > 1 ? lastKeys[page - 1] : undefined;

            console.log(`[useUniversitiesList] Loading page ${page}, lastKey:`, lastKey);

            const data: UniversitiesListResponse = await listUniversities({
                page_size: pageSize,
                last_key: lastKey,
            });

            console.log(`[useUniversitiesList] Loaded ${data.count} universities, hasMore:`, data.has_more);

            setUniversities(data.universities);
            setHasMore(data.has_more);
            setTotalCount(data.count);

            // Store last evaluated key for next page
            if (data.last_evaluated_key) {
                setLastKeys(prev => ({
                    ...prev,
                    [page]: data.last_evaluated_key!,
                }));
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load universities';
            console.error('[useUniversitiesList] Error loading universities:', err);
            setError(errorMessage);
            setUniversities([]);
        } finally {
            setIsLoading(false);
        }
    }, [pageSize, lastKeys]);

    /**
     * Navigate to next page
     */
    const goToNextPage = useCallback(() => {
        if (hasMore) {
            const nextPage = currentPage + 1;
            console.log(`[useUniversitiesList] Going to next page: ${nextPage}`);
            setCurrentPage(nextPage);
            loadUniversities(nextPage);
        }
    }, [hasMore, currentPage, loadUniversities]);

    /**
     * Navigate to previous page
     */
    const goToPreviousPage = useCallback(() => {
        if (currentPage > 1) {
            const prevPage = currentPage - 1;
            console.log(`[useUniversitiesList] Going to previous page: ${prevPage}`);
            setCurrentPage(prevPage);
            loadUniversities(prevPage);
        }
    }, [currentPage, loadUniversities]);

    /**
     * Refresh current page
     */
    const refresh = useCallback(async () => {
        console.log(`[useUniversitiesList] Refreshing current page: ${currentPage}`);
        // Clear pagination keys and reload from page 1
        setLastKeys({});
        setCurrentPage(1);
        await loadUniversities(1);
    }, [currentPage, loadUniversities]);

    // Load universities on mount
    useEffect(() => {
        console.log('[useUniversitiesList] Initial load');
        loadUniversities(1);
    }, []); // Empty dependency array - only run on mount

    return {
        universities,
        isLoading,
        error,
        currentPage,
        hasMore,
        totalCount,
        goToNextPage,
        goToPreviousPage,
        refresh,
    };
}
