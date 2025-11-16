/**
 * API Error Classes
 *
 * Custom error types for API-related failures.
 *
 * @module services/api/errors
 */

export class ApiError extends Error {
    statusCode: number;
    details?: unknown;

    constructor(
        message: string,
        statusCode: number,
        details?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.details = details;
    }
}
