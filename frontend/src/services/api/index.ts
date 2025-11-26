/**
 * API Services
 *
 * Central location for all API client code and configuration.
 * This module provides a clean public API for the entire application.
 *
 * @module services/api
 *
 * @example
 * ```typescript
 * // Single import point for all API needs
 * import { registerFace, ApiError, API_ROUTES } from '@/services/api';
 *
 * try {
 *   await registerFace(imageData);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error(`Error ${error.statusCode}: ${error.message}`);
 *   }
 * }
 * ```
 */

export {API_CONFIG, API_ROUTES} from './config';
export {ApiError} from './errors';
export {
    registerFace,
    getFaceMetadata,
    updateFace,
    deleteFace,
    markAttendance,
    type FaceMetadata,
} from './endpoints/students';