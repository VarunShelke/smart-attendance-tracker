/**
 * Custom hook for managing student enrollments
 *
 * @module hooks/useStudentEnrollments
 */

import {useState, useCallback} from 'react';
import {getStudentEnrollments, type StudentEnrollment} from '../services/api/students';

interface UseStudentEnrollmentsReturn {
    enrollments: StudentEnrollment[];
    isLoading: boolean;
    error: string | undefined;
    loadEnrollments: (userId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

/**
 * Hook for fetching and managing student enrollments
 *
 * @returns Enrollments state and control functions
 */
export function useStudentEnrollments(): UseStudentEnrollmentsReturn {
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [lastUserId, setLastUserId] = useState<string | null>(null);

    /**
     * Load enrollments for a specific student
     */
    const loadEnrollments = useCallback(async (userId: string) => {
        try {
            setIsLoading(true);
            setError(undefined);
            setLastUserId(userId);

            console.log(`[useStudentEnrollments] Loading enrollments for student: ${userId}`);

            const data = await getStudentEnrollments(userId);
            setEnrollments(data.enrollments);

            console.log(`[useStudentEnrollments] Loaded ${data.enrollments.length} enrollments`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load enrollments';
            console.error('[useStudentEnrollments] Error loading enrollments:', err);
            setError(errorMessage);
            setEnrollments([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Refresh enrollments for the last loaded student
     */
    const refresh = useCallback(async () => {
        if (lastUserId) {
            console.log(`[useStudentEnrollments] Refreshing enrollments for student: ${lastUserId}`);
            await loadEnrollments(lastUserId);
        }
    }, [lastUserId, loadEnrollments]);

    return {
        enrollments,
        isLoading,
        error,
        loadEnrollments,
        refresh,
    };
}
