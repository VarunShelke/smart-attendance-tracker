/**
 * Universities API
 *
 * API functions for managing university data.
 *
 * @module services/api/universities
 */

import {authenticatedFetch} from './client';
import {handleApiResponse} from './errors';

export interface University {
    university_id: string;
    university_code: string;
    university_name: string;
    domain: string;
    status: string;
    address?: string;
    timezone: string;
    created_at: string;
    updated_at: string;
}

export interface UpsertUniversityRequest {
    university_name: string;
    domain: string;
    status?: string;
    address?: string;
    timezone?: string;
}

export interface UniversitiesListResponse {
    universities: University[];
    count: number;
    last_evaluated_key: string | null;
    has_more: boolean;
}

export interface ListUniversitiesParams {
    page_size?: number;
    last_key?: string;
}

/**
 * List all universities with pagination support
 */
export async function listUniversities(params?: ListUniversitiesParams): Promise<UniversitiesListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page_size) {
        queryParams.set('page_size', params.page_size.toString());
    }

    if (params?.last_key) {
        queryParams.set('last_key', params.last_key);
    }

    const endpoint = `/v1/universities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await authenticatedFetch(endpoint, {
        method: 'GET',
    });

    return handleApiResponse(response);
}

/**
 * Get university by code
 */
export async function getUniversity(universityCode: string): Promise<University> {
    const response = await authenticatedFetch(
        `/v1/universities/${universityCode}`,
        {
            method: 'GET',
        }
    );

    return handleApiResponse(response);
}

/**
 * Create or update university
 */
export async function upsertUniversity(
    universityCode: string,
    data: UpsertUniversityRequest
): Promise<University> {
    const response = await authenticatedFetch(
        `/v1/universities/${universityCode}`,
        {
            method: 'POST',
            body: JSON.stringify(data),
        }
    );

    return handleApiResponse(response);
}
