/**
 * API Configuration
 *
 * Central configuration for API endpoints, routes, and settings.
 * This file contains only static configuration - no runtime logic.
 *
 * @module services/api/config
 */

/**
 * API Configuration constants
 *
 * Note: VITE_API_ENDPOINT includes the stage name (e.g., https://...amazonaws.com/api/)
 * Therefore, routes should not include the /api prefix to avoid duplication.
 */
export const API_CONFIG = {
    VERSION: 'v1',
    ENDPOINT: import.meta.env.VITE_API_ENDPOINT,
    API_KEY: import.meta.env.VITE_API_KEY,
} as const;

/**
 * API Route definitions
 *
 * Routes are relative to the API endpoint and should NOT include the stage prefix
 * as it's already included in VITE_API_ENDPOINT from CDK deployment.
 */
export const API_ROUTES = {

    STUDENTS: {

        ME: {
            BASE: '/v1/students/me',
            FACE: '/v1/students/me/face',
            PROFILE: '/v1/students/me/profile',
            ATTENDANCE: '/v1/students/me/attendance',
        },
    },

    ATTENDANCE: {
        MARK: '/v1/attendance',
        LIST: '/v1/attendance',
        DETAIL: (id: string) => `/v1/attendance/${id}`,
    },

    CLASSES: {
        LIST: '/v1/classes',
        DETAIL: (classId: string) => `/v1/classes/${classId}`,
        ATTENDANCE: (classId: string) => `/v1/classes/${classId}/attendance`,
    },
} as const;
