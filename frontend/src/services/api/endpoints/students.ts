/**
 * Student API Endpoints
 *
 * API methods for student-related operations including face registration,
 * profile management, and attendance history.
 *
 * @module services/api/endpoints/students
 */

import {authenticatedFetch} from '../client';
import {API_ROUTES} from '../config';
import {ApiError} from '../errors';
import type {AttendanceResponse} from '../../../types/attendance';
import type {StudentProfile} from '../../../types/student';
import type {Course} from '../../../types/course';

export interface FaceMetadata {
    registered: boolean;
    registeredAt?: string;
    lastUpdated?: string;
    objectKey?: string;
}

export async function registerFace(imageBase64: string): Promise<void> {
    try {
        const response = await authenticatedFetch(API_ROUTES.STUDENTS.ME.FACE, {
            method: 'POST',
            body: JSON.stringify({faceImage: imageBase64}),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            // Map specific error codes to user-friendly messages
            if (response.status === 400) {
                throw new ApiError(
                    errorData.error || 'Invalid image. Please try again.',
                    400,
                    errorData
                );
            } else if (response.status === 401) {
                throw new ApiError('Authentication failed. Please log in again.', 401);
            } else if (response.status === 429) {
                throw new ApiError(
                    'Too many requests. Please wait a moment and try again.',
                    429
                );
            } else if (response.status === 413) {
                throw new ApiError('Image too large. Please try a smaller image.', 413);
            } else {
                throw new ApiError(
                    'Face registration failed. Please try again.',
                    response.status,
                    errorData
                );
            }
        }

        return;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        console.error('Face registration error:', error);
        throw new ApiError(
            'Network error. Please check your connection and try again.',
            0
        );
    }
}

export async function getFaceMetadata(): Promise<FaceMetadata> {
    const response = await authenticatedFetch(API_ROUTES.STUDENTS.ME.FACE, {
        method: 'GET',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
            errorData.error || 'Failed to fetch face metadata',
            response.status,
            errorData
        );
    }

    return await response.json();
}

export async function updateFace(imageBase64: string): Promise<void> {
    const response = await authenticatedFetch(API_ROUTES.STUDENTS.ME.FACE, {
        method: 'PUT',
        body: JSON.stringify({image: imageBase64}),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
            errorData.error || 'Failed to update face',
            response.status,
            errorData
        );
    }
}

export async function deleteFace(): Promise<void> {
    const response = await authenticatedFetch(API_ROUTES.STUDENTS.ME.FACE, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
            errorData.error || 'Failed to delete face',
            response.status,
            errorData
        );
    }
}

/**
 * Mark attendance by submitting a face image for verification
 *
 * @param imageBase64 - Base64 encoded image data
 * @param courseId - Optional course ID for course-specific attendance
 * @param scheduleId - Optional schedule ID for course-specific attendance
 * @returns Promise with attendance response containing tracking_id
 * @throws {ApiError} If the request fails
 */
export async function markAttendance(
    imageBase64: string,
    courseId?: string,
    scheduleId?: string
): Promise<AttendanceResponse> {
    try {
        const response = await authenticatedFetch(API_ROUTES.STUDENTS.ME.ATTENDANCE, {
            method: 'POST',
            body: JSON.stringify({
                faceImage: imageBase64,
                ...(courseId && {course_id: courseId}),
                ...(scheduleId && {schedule_id: scheduleId}),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            // Map specific error codes to user-friendly messages
            if (response.status === 400) {
                throw new ApiError(
                    errorData.message || 'Please register your face first before marking attendance.',
                    400,
                    errorData
                );
            } else if (response.status === 401) {
                throw new ApiError('Authentication failed. Please log in again.', 401);
            } else if (response.status === 404) {
                throw new ApiError('Student profile not found. Please complete your profile.', 404);
            } else if (response.status === 413) {
                throw new ApiError('Image too large. Please try a smaller image.', 413);
            } else if (response.status === 429) {
                throw new ApiError(
                    'Too many requests. Please wait a moment and try again.',
                    429
                );
            } else {
                throw new ApiError(
                    'Failed to mark attendance. Please try again.',
                    response.status,
                    errorData
                );
            }
        }

        return await response.json();
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        console.error('Mark attendance error:', error);
        throw new ApiError(
            'Network error. Please check your connection and try again.',
            0
        );
    }
}

/**
 * Get the current student's profile information
 *
 * @returns Promise with student profile data
 * @throws {ApiError} If the request fails
 */
export async function getStudentProfile(): Promise<StudentProfile> {
    try {
        const response = await authenticatedFetch(API_ROUTES.STUDENTS.ME.BASE, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            // Map specific error codes to user-friendly messages
            if (response.status === 401) {
                throw new ApiError('Authentication failed. Please log in again.', 401);
            } else if (response.status === 404) {
                throw new ApiError('Student profile not found.', 404);
            } else if (response.status === 429) {
                throw new ApiError(
                    'Too many requests. Please wait a moment and try again.',
                    429
                );
            } else {
                throw new ApiError(
                    errorData.message || 'Failed to fetch profile. Please try again.',
                    response.status,
                    errorData
                );
            }
        }

        return await response.json();
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        console.error('Get student profile error:', error);
        throw new ApiError(
            'Network error. Please check your connection and try again.',
            0
        );
    }
}

/**
 * Update profile data for updateStudentProfile
 */
export interface UpdateStudentProfileData {
    student_id?: string;
    phone_number?: string;
}

/**
 * Update the current student's profile information
 *
 * @param data - Profile fields to update (student_id and/or phone_number)
 * @returns Promise with updated student profile data
 * @throws {ApiError} If the request fails
 */
export async function updateStudentProfile(
    data: UpdateStudentProfileData
): Promise<StudentProfile> {
    try {
        const response = await authenticatedFetch(API_ROUTES.STUDENTS.ME.BASE, {
            method: 'POST',
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            // Map specific error codes to user-friendly messages
            if (response.status === 400) {
                throw new ApiError(
                    errorData.message || 'Invalid profile data. Please check your input.',
                    400,
                    errorData
                );
            } else if (response.status === 401) {
                throw new ApiError('Authentication failed. Please log in again.', 401);
            } else if (response.status === 403) {
                throw new ApiError(
                    errorData.message || 'Student ID can only be set once and cannot be changed.',
                    403,
                    errorData
                );
            } else if (response.status === 404) {
                throw new ApiError('Student profile not found.', 404);
            } else if (response.status === 409) {
                throw new ApiError(
                    'Profile update conflict. Please refresh and try again.',
                    409
                );
            } else if (response.status === 429) {
                throw new ApiError(
                    'Too many requests. Please wait a moment and try again.',
                    429
                );
            } else {
                throw new ApiError(
                    errorData.message || 'Failed to update profile. Please try again.',
                    response.status,
                    errorData
                );
            }
        }

        return await response.json();
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        console.error('Update student profile error:', error);
        throw new ApiError(
            'Network error. Please check your connection and try again.',
            0
        );
    }
}

/**
 * Get student's enrolled courses
 *
 * @returns Promise with array of courses
 * @throws {ApiError} If the request fails
 */
export async function getStudentCourses(): Promise<Course[]> {
    try {
        const response = await authenticatedFetch(API_ROUTES.STUDENTS.ME.COURSES, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            // Map specific error codes to user-friendly messages
            if (response.status === 401) {
                throw new ApiError('Authentication failed. Please log in again.', 401);
            } else if (response.status === 404) {
                throw new ApiError('No courses found for this student.', 404);
            } else if (response.status === 429) {
                throw new ApiError(
                    'Too many requests. Please wait a moment and try again.',
                    429
                );
            } else {
                throw new ApiError(
                    errorData.message || 'Failed to fetch courses. Please try again.',
                    response.status,
                    errorData
                );
            }
        }

        const data = await response.json();
        return data.courses || [];
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        console.error('Get student courses error:', error);
        throw new ApiError(
            'Network error. Please check your connection and try again.',
            0
        );
    }
}
