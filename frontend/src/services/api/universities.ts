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
