/**
 * API Client
 *
 * Core HTTP client utilities for making authenticated API requests.
 * Handles authentication, request formatting, and common error cases.
 *
 * @module services/api/client
 */

import {fetchAuthSession} from 'aws-amplify/auth';
import {API_CONFIG} from './config';
import {ApiError} from './errors';


async function getIdToken(): Promise<string> {
    try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if (!idToken) {
            throw new Error('No ID token available. Please log in again.');
        }

        return idToken;
    } catch (error) {
        console.error('Error getting ID token:', error);
        throw new ApiError('Authentication error', 401);
    }
}


export async function authenticatedFetch(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
    const idToken = await getIdToken();
    const apiKey = API_CONFIG.API_KEY;

    if (!apiKey) {
        throw new ApiError('API key not configured', 500);
    }

    return await fetch(`${API_CONFIG.ENDPOINT}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
            'X-Api-Key': apiKey,
            ...options.headers,
        },
    });
}