/**
 * Schedules API
 *
 * API functions for managing class schedules.
 *
 * @module services/api/schedules
 */

import {authenticatedFetch} from './client';
import {handleApiResponse} from './errors';

export interface Schedule {
    schedule_id: string;
    university_code: string;
    course_id: string;
    course_name: string;
    instructor?: string;
    instructor_id?: string;
    days_of_week: string[];
    start_time: string;
    end_time: string;
    location: string;
    semester: string;
    created_at: string;
    updated_at: string;
}

export interface UpsertScheduleRequest {
    course_name: string;
    instructor?: string;
    instructor_id?: string;
    days_of_week: string[];
    start_time: string;
    end_time: string;
    location: string;
    semester: string;
}

export interface SchedulesListResponse {
    schedules: Schedule[];
    count: number;
    last_evaluated_key: string | null;
    has_more: boolean;
}

export interface ListSchedulesParams {
    university_code?: string;
    page_size?: number;
    last_key?: string;
}

/**
 * Get schedule by ID
 */
export async function getSchedule(
    universityCode: string,
    scheduleId: string
): Promise<Schedule> {
    const response = await authenticatedFetch(
        `/v1/universities/${universityCode}/schedules/${scheduleId}`,
        {
            method: 'GET',
        }
    );

    return handleApiResponse(response);
}

/**
 * Create or update schedule
 */
export async function upsertSchedule(
    universityCode: string,
    scheduleId: string,
    data: UpsertScheduleRequest
): Promise<Schedule> {
    const response = await authenticatedFetch(
        `/v1/universities/${universityCode}/schedules/${scheduleId}`,
        {
            method: 'POST',
            body: JSON.stringify(data),
        }
    );

    return handleApiResponse(response);
}

/**
 * List all schedules with pagination support
 */
export async function listSchedules(params?: ListSchedulesParams): Promise<SchedulesListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.university_code) {
        queryParams.set('university_code', params.university_code);
    }

    if (params?.page_size) {
        queryParams.set('page_size', params.page_size.toString());
    }

    if (params?.last_key) {
        queryParams.set('last_key', params.last_key);
    }

    const endpoint = `/v1/schedules${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await authenticatedFetch(endpoint, {
        method: 'GET',
    });

    return handleApiResponse(response);
}
