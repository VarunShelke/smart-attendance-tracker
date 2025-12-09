/**
 * Custom hook for managing students list with pagination
 *
 * @module hooks/useStudentsList
 */

import {useState, useEffect, useCallback} from 'react';
import {listStudents} from '../services/api/students';
import type {Student, StudentsListResponse} from '../services/api/students';

interface UseStudentsListReturn {
    students: Student[];
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
 * Hook for fetching and managing students list with pagination
 *
 * @param pageSize - Number of items per page (default: 20)
 * @returns Students list state and pagination controls
 */
export function useStudentsList(pageSize: number = 20): UseStudentsListReturn {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | undefined>();
    const [currentPage, setCurrentPage] = useState(1);
    const [lastKeys, setLastKeys] = useState<Record<number, string>>({});
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    /**
     * Load students for a specific page
     */
    const loadStudents = useCallback(async (page: number) => {
        try {
            setIsLoading(true);
            setError(undefined);

            // Get the last evaluated key for the requested page
            const lastKey = page > 1 ? lastKeys[page - 1] : undefined;

            console.log(`[useStudentsList] Loading page ${page}, lastKey:`, lastKey);

            const data: StudentsListResponse = await listStudents({
                page_size: pageSize,
                last_key: lastKey,
            });

            console.log(`[useStudentsList] Loaded ${data.count} students, hasMore:`, data.has_more);

            setStudents(data.students);
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
            const errorMessage = err instanceof Error ? err.message : 'Failed to load students';
            console.error('[useStudentsList] Error loading students:', err);
            setError(errorMessage);
            setStudents([]);
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
            console.log(`[useStudentsList] Going to next page: ${nextPage}`);
            setCurrentPage(nextPage);
            loadStudents(nextPage);
        }
    }, [hasMore, currentPage, loadStudents]);

    /**
     * Navigate to previous page
     */
    const goToPreviousPage = useCallback(() => {
        if (currentPage > 1) {
            const prevPage = currentPage - 1;
            console.log(`[useStudentsList] Going to previous page: ${prevPage}`);
            setCurrentPage(prevPage);
            loadStudents(prevPage);
        }
    }, [currentPage, loadStudents]);

    /**
     * Refresh current page
     */
    const refresh = useCallback(async () => {
        console.log(`[useStudentsList] Refreshing current page: ${currentPage}`);
        // Clear pagination keys and reload from page 1
        setLastKeys({});
        setCurrentPage(1);
        await loadStudents(1);
    }, [currentPage, loadStudents]);

    // Load students on mount
    useEffect(() => {
        console.log('[useStudentsList] Initial load');
        loadStudents(1);
    }, []); // Empty dependency array - only run on mount

    return {
        students,
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
