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

/**
 * Handle API response and extract JSON data
 * Throws ApiError if response is not ok
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails: unknown = undefined;

        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
            errorDetails = errorData;
        } catch {
            // If response is not JSON, use status text
        }

        throw new ApiError(errorMessage, response.status, errorDetails);
    }

    return response.json();
}
