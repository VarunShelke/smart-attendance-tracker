/**
 * Students API
 *
 * API functions for managing student data (admin-only operations).
 *
 * @module services/api/students
 */

import {authenticatedFetch} from './client';
import {handleApiResponse} from './errors';

export interface Student {
    user_id: string;
    student_id: string | null;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string | null;
    face_registered: boolean;
    face_registered_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface StudentsListResponse {
    students: Student[];
    count: number;
    last_evaluated_key: string | null;
    has_more: boolean;
}

export interface ListStudentsParams {
    page_size?: number;
    last_key?: string;
}

export interface StudentEnrollment {
    user_id: string;
    course_id: string;
    course_name: string;
    schedule_id: string;
    enrollment_date: string;
    status: string;
}

export interface EnrollmentsResponse {
    enrollments: StudentEnrollment[];
}

export interface EnrollStudentRequest {
    schedule_ids: string[];
}

export interface EnrollStudentResponse {
    enrolled: StudentEnrollment[];
    failed: Array<{schedule_id: string; error: string}>;
}

/**
 * List all students with pagination support (admin-only)
 */
export async function listStudents(params?: ListStudentsParams): Promise<StudentsListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page_size) {
        queryParams.set('page_size', params.page_size.toString());
    }

    if (params?.last_key) {
        queryParams.set('last_key', params.last_key);
    }

    const endpoint = `/v1/admin/students${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await authenticatedFetch(endpoint, {
        method: 'GET',
    });

    return handleApiResponse(response);
}

/**
 * Get student enrollments by user_id (admin-only)
 */
export async function getStudentEnrollments(userId: string): Promise<EnrollmentsResponse> {
    const response = await authenticatedFetch(
        `/v1/admin/students/${userId}/enrollments`,
        {
            method: 'GET',
        }
    );

    return handleApiResponse(response);
}

/**
 * Enroll student in one or more courses (admin-only)
 */
export async function enrollStudent(
    userId: string,
    data: EnrollStudentRequest
): Promise<EnrollStudentResponse> {
    const response = await authenticatedFetch(
        `/v1/admin/students/${userId}/enrollments`,
        {
            method: 'POST',
            body: JSON.stringify(data),
        }
    );

    return handleApiResponse(response);
}
