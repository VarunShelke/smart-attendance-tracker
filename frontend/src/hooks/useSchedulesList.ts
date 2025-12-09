/**
 * Custom hook for managing schedules list
 *
 * @module hooks/useSchedulesList
 */

import {useState, useEffect, useCallback} from 'react';
import {listSchedules, type Schedule} from '../services/api/schedules';

interface UseSchedulesListReturn {
    schedules: Schedule[];
    isLoading: boolean;
    error: string | undefined;
    refresh: () => Promise<void>;
}

/**
 * Hook for fetching and managing schedules list
 *
 * @param universityCode - Optional university code to filter by
 * @returns Schedules list state and control functions
 */
export function useSchedulesList(universityCode?: string): UseSchedulesListReturn {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | undefined>();

    /**
     * Load schedules
     */
    const loadSchedules = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(undefined);

            console.log(`[useSchedulesList] Loading schedules${universityCode ? ` for university: ${universityCode}` : ''}`);

            // Load all schedules (no pagination for dropdown)
            const data = await listSchedules({
                university_code: universityCode,
                page_size: 100, // Get up to 100 schedules
            });

            setSchedules(data.schedules);

            console.log(`[useSchedulesList] Loaded ${data.schedules.length} schedules`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load schedules';
            console.error('[useSchedulesList] Error loading schedules:', err);
            setError(errorMessage);
            setSchedules([]);
        } finally {
            setIsLoading(false);
        }
    }, [universityCode]);

    /**
     * Refresh schedules
     */
    const refresh = useCallback(async () => {
        console.log('[useSchedulesList] Refreshing schedules');
        await loadSchedules();
    }, [loadSchedules]);

    // Load schedules on mount and when universityCode changes
    useEffect(() => {
        console.log('[useSchedulesList] Initial load or university code changed');
        loadSchedules();
    }, [loadSchedules]);

    return {
        schedules,
        isLoading,
        error,
        refresh,
    };
}
