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
            body: JSON.stringify({image: imageBase64}),
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
