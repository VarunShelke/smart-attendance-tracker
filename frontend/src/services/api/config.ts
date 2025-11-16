/**
 * API Configuration
 *
 * Central configuration for API endpoints, routes, and settings.
 * This file contains only static configuration - no runtime logic.
 *
 * @module services/api/config
 */

export const API_CONFIG = {
    BASE_PATH: '/api',
    VERSION: 'v1',
    ENDPOINT: import.meta.env.VITE_API_ENDPOINT,
} as const;

export const API_ROUTES = {

    STUDENTS: {

        ME: {
            BASE: '/api/v1/students/me',
            FACE: '/api/v1/students/me/face',
            PROFILE: '/api/v1/students/me/profile',
            ATTENDANCE: '/api/v1/students/me/attendance',
        },
    },

    ATTENDANCE: {
        MARK: '/api/v1/attendance',
        LIST: '/api/v1/attendance',
        DETAIL: (id: string) => `/api/v1/attendance/${id}`,
    },

    CLASSES: {
        LIST: '/api/v1/classes',
        DETAIL: (classId: string) => `/api/v1/classes/${classId}`,
        ATTENDANCE: (classId: string) => `/api/v1/classes/${classId}/attendance`,
    },
} as const;
