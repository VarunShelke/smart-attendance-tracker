"""
API Response Builder Utility

Provides centralized, standardized response creation for AWS API Gateway Lambda handlers.
Follows industry best practices for large-scale production systems including:
- Type safety with comprehensive type hints
- Consistent response structure
- Standard HTTP status codes
- Proper CORS headers
- JSON serialization handling
- Error response standardization

Usage:
    from utils.api_response import APIResponse

    # Success responses
    return APIResponse.ok({'user': user_data})
    return APIResponse.created({'id': new_id})

    # Error responses
    return APIResponse.bad_request('Invalid input')
    return APIResponse.not_found('Resource not found')
    return APIResponse.internal_error('Processing failed')
"""

import json
import logging
from decimal import Decimal
from enum import IntEnum
from typing import Any, Dict, Optional, Union

from constants.constants import DEFAULT_HEADERS

logger = logging.getLogger(__name__)


class HTTPStatus(IntEnum):
    """Standard HTTP status codes for RESTful APIs."""

    # Success
    OK = 200
    CREATED = 201
    ACCEPTED = 202
    NO_CONTENT = 204

    # Client Errors
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    METHOD_NOT_ALLOWED = 405
    CONFLICT = 409
    PAYLOAD_TOO_LARGE = 413
    UNPROCESSABLE_ENTITY = 422

    # Server Errors
    INTERNAL_SERVER_ERROR = 500
    NOT_IMPLEMENTED = 501
    BAD_GATEWAY = 502
    SERVICE_UNAVAILABLE = 503


class JSONEncoder(json.JSONEncoder):
    """
    Custom JSON encoder to handle special types commonly used in AWS Lambda.

    Handles:
    - Decimal (from DynamoDB)
    - datetime objects
    - Enum types
    """

    def default(self, obj):
        if isinstance(obj, Decimal):
            # Convert Decimal to int if it's a whole number, otherwise float
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        return super().default(obj)


class APIResponse:
    """
    Centralized API response builder for AWS API Gateway Lambda handlers.

    Provides a consistent response structure and simplifies response creation
    throughout the application. All methods return API Gateway-compatible
    response dictionaries.
    """

    @staticmethod
    def _build_response(
            status_code: int,
            body: Optional[Union[Dict[str, Any], str]] = None,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Build a standardized API Gateway response.

        Args:
            status_code: HTTP status code
            body: Response body (dict or string). If dict, will be JSON-serialized.
            headers: Additional headers to merge with default headers

        Returns:
            API Gateway response dictionary
        """
        # Start with default headers (includes CORS)
        response_headers = dict(DEFAULT_HEADERS)

        # Merge additional headers if provided
        if headers:
            response_headers.update(headers)

        # Build response
        response = {
            'statusCode': status_code,
            'headers': response_headers
        }

        # Handle body serialization
        if body is not None:
            if isinstance(body, str):
                response['body'] = body
            else:
                try:
                    response['body'] = json.dumps(body, cls=JSONEncoder)
                except (TypeError, ValueError) as e:
                    logger.error(f"Failed to serialize response body: {e}")
                    # Fallback to error response
                    return APIResponse.internal_error(
                        "Failed to serialize response data"
                    )
        else:
            response['body'] = json.dumps({})

        return response

    # -------------------------------------------------------------------------
    # Success Responses (2xx)
    # -------------------------------------------------------------------------

    @staticmethod
    def ok(
            data: Any = None,
            message: Optional[str] = None,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 200 OK response.

        Following industry standards (GitHub, AWS, Stripe, Twitter APIs), response data
        is returned directly at the root level without a 'data' wrapper.

        Args:
            data: Response data (any JSON-serializable object). If dict, returned at root level.
            message: Optional success message. If provided with dict data, merged into response.
            headers: Optional additional headers

        Returns:
            200 OK response with data at root level

        Examples:
            # Single resource
            return APIResponse.ok({'user_id': '123', 'name': 'John'})
            # Returns: {"user_id": "123", "name": "John"}

            # Paginated list
            return APIResponse.ok({'items': [...], 'count': 10, 'has_more': True})
            # Returns: {"items": [...], "count": 10, "has_more": True}

            # With message (merged with dict data)
            return APIResponse.ok({'user_id': '123'}, message='User retrieved')
            # Returns: {"user_id": "123", "message": "User retrieved"}
        """
        if data is None and message is None:
            return APIResponse._build_response(HTTPStatus.OK, {}, headers)

        if data is None and message:
            return APIResponse._build_response(HTTPStatus.OK, {'message': message}, headers)

        # If only data (most common case), return data directly at root
        if message is None:
            return APIResponse._build_response(HTTPStatus.OK, data, headers)

        # Both message and data provided
        if isinstance(data, dict):
            # Merge message into data dict (industry standard)
            body = {'message': message, **data}
            return APIResponse._build_response(HTTPStatus.OK, body, headers)
        else:
            # Non-dict data with message: wrap in 'data' field
            body = {'message': message, 'data': data}
            return APIResponse._build_response(HTTPStatus.OK, body, headers)

    @staticmethod
    def created(
            data: Any = None,
            message: Optional[str] = None,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 201 Created response.

        Following industry standards (GitHub, AWS, Stripe, Twitter APIs), response data
        is returned directly at the root level without a 'data' wrapper.

        Args:
            data: Created resource data (any JSON-serializable object). If dict, returned at root level.
            message: Optional success message. If provided with dict data, merged into response.
            headers: Optional additional headers

        Returns:
            201 Created response with data at root level

        Examples:
            # Created resource
            return APIResponse.created({'id': '123', 'name': 'New Resource'})
            # Returns: {"id": "123", "name": "New Resource"}

            # With message (merged with dict data)
            return APIResponse.created({'id': '123'}, message='Resource created successfully')
            # Returns: {"id": "123", "message": "Resource created successfully"}
        """
        # If no data and no message, return empty body
        if data is None and message is None:
            return APIResponse._build_response(HTTPStatus.CREATED, {}, headers)

        # If only message, return just message
        if data is None and message:
            return APIResponse._build_response(HTTPStatus.CREATED, {'message': message}, headers)

        # If only data (most common case), return data directly at root
        if message is None:
            return APIResponse._build_response(HTTPStatus.CREATED, data, headers)

        # Both message and data provided
        if isinstance(data, dict):
            # Merge message into data dict (industry standard)
            body = {'message': message, **data}
            return APIResponse._build_response(HTTPStatus.CREATED, body, headers)
        else:
            # Non-dict data with message: wrap in 'data' field
            body = {'message': message, 'data': data}
            return APIResponse._build_response(HTTPStatus.CREATED, body, headers)

    @staticmethod
    def accepted(
            message: str = "Request accepted for processing",
            tracking_id: Optional[str] = None,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 202 Accepted response for async operations.

        Args:
            message: Status message
            tracking_id: Optional tracking ID for async operation
            headers: Optional additional headers

        Returns:
            202 Accepted response

        Example:
            return APIResponse.accepted('Processing started', tracking_id='abc123')
        """
        body = {'message': message}
        if tracking_id:
            body['tracking_id'] = tracking_id

        return APIResponse._build_response(HTTPStatus.ACCEPTED, body, headers)

    @staticmethod
    def no_content(headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Create a 204 No Content response.

        Args:
            headers: Optional additional headers

        Returns:
            204 No Content response
        """
        return APIResponse._build_response(HTTPStatus.NO_CONTENT, None, headers)

    # -------------------------------------------------------------------------
    # Client Error Responses (4xx)
    # -------------------------------------------------------------------------

    @staticmethod
    def bad_request(
            message: str = "Bad Request",
            errors: Optional[Any] = None,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 400 Bad Request response.

        Args:
            message: Error message
            errors: Optional detailed error information
            headers: Optional additional headers

        Returns:
            400 Bad Request response

        Example:
            return APIResponse.bad_request('Invalid email format')
            return APIResponse.bad_request('Validation failed', errors={'email': 'required'})
        """
        body = {
            'error': 'Bad Request',
            'message': message
        }
        if errors is not None:
            body['errors'] = errors

        return APIResponse._build_response(HTTPStatus.BAD_REQUEST, body, headers)

    @staticmethod
    def unauthorized(
            message: str = "Authentication required",
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 401 Unauthorized response.

        Args:
            message: Error message
            headers: Optional additional headers

        Returns:
            401 Unauthorized response

        Example:
            return APIResponse.unauthorized('Invalid credentials')
        """
        body = {
            'error': 'Unauthorized',
            'message': message
        }
        return APIResponse._build_response(HTTPStatus.UNAUTHORIZED, body, headers)

    @staticmethod
    def forbidden(
            message: str = "Insufficient permissions",
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 403 Forbidden response.

        Args:
            message: Error message
            headers: Optional additional headers

        Returns:
            403 Forbidden response

        Example:
            return APIResponse.forbidden('Admin access required')
        """
        body = {
            'error': 'Forbidden',
            'message': message
        }
        return APIResponse._build_response(HTTPStatus.FORBIDDEN, body, headers)

    @staticmethod
    def not_found(
            message: str = "Resource not found",
            resource_type: Optional[str] = None,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 404 Not Found response.

        Args:
            message: Error message
            resource_type: Optional resource type (e.g., 'User', 'Course')
            headers: Optional additional headers

        Returns:
            404 Not Found response

        Example:
            return APIResponse.not_found('Student not found', 'Student')
        """
        body = {
            'error': 'Not Found',
            'message': message
        }
        if resource_type:
            body['resource_type'] = resource_type

        return APIResponse._build_response(HTTPStatus.NOT_FOUND, body, headers)

    @staticmethod
    def method_not_allowed(
            method: str,
            allowed_methods: Optional[list] = None,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 405 Method Not Allowed response.

        Args:
            method: The HTTP method that was attempted
            allowed_methods: List of allowed methods
            headers: Optional additional headers

        Returns:
            405 Method Not Allowed response

        Example:
            return APIResponse.method_not_allowed('DELETE', ['GET', 'POST'])
        """
        body = {
            'error': 'Method Not Allowed',
            'message': f'HTTP method {method} is not supported.'
        }
        if allowed_methods:
            body['allowed_methods'] = allowed_methods

        return APIResponse._build_response(HTTPStatus.METHOD_NOT_ALLOWED, body, headers)

    @staticmethod
    def conflict(
            message: str = "Resource conflict",
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 409 Conflict response.

        Args:
            message: Error message
            headers: Optional additional headers

        Returns:
            409 Conflict response

        Example:
            return APIResponse.conflict('Email already exists')
        """
        body = {
            'error': 'Conflict',
            'message': message
        }
        return APIResponse._build_response(HTTPStatus.CONFLICT, body, headers)

    @staticmethod
    def payload_too_large(
            message: str = "Payload too large",
            max_size: Optional[str] = None,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 413 Payload Too Large response.

        Args:
            message: Error message
            max_size: Optional max size description (e.g., '10MB')
            headers: Optional additional headers

        Returns:
            413 Payload Too Large response

        Example:
            return APIResponse.payload_too_large('Image too large', max_size='5MB')
        """
        body = {
            'error': 'Payload Too Large',
            'message': message
        }
        if max_size:
            body['max_size'] = max_size

        return APIResponse._build_response(HTTPStatus.PAYLOAD_TOO_LARGE, body, headers)

    @staticmethod
    def unprocessable_entity(
            message: str = "Unprocessable Entity",
            errors: Optional[Any] = None,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 422 Unprocessable Entity response.

        Args:
            message: Error message
            errors: Optional validation errors
            headers: Optional additional headers

        Returns:
            422 Unprocessable Entity response

        Example:
            return APIResponse.unprocessable_entity('Validation failed', errors=validation_errors)
        """
        body = {
            'error': 'Unprocessable Entity',
            'message': message
        }
        if errors is not None:
            body['errors'] = errors

        return APIResponse._build_response(HTTPStatus.UNPROCESSABLE_ENTITY, body, headers)

    # -------------------------------------------------------------------------
    # Server Error Responses (5xx)
    # -------------------------------------------------------------------------

    @staticmethod
    def internal_error(
            message: str = "An internal error occurred",
            log_error: bool = True,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 500 Internal Server Error response.

        Args:
            message: Error message (user-facing, should not expose internals)
            log_error: Whether to log the error
            headers: Optional additional headers

        Returns:
            500 Internal Server Error response

        Example:
            return APIResponse.internal_error('Database connection failed')
        """
        if log_error:
            logger.error(f"Internal server error: {message}")

        body = {
            'error': 'Internal Server Error',
            'message': message
        }
        return APIResponse._build_response(HTTPStatus.INTERNAL_SERVER_ERROR, body, headers)

    @staticmethod
    def service_unavailable(
            message: str = "Service temporarily unavailable",
            retry_after: Optional[int] = None,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a 503 Service Unavailable response.

        Args:
            message: Error message
            retry_after: Optional seconds to wait before retrying
            headers: Optional additional headers

        Returns:
            503 Service Unavailable response

        Example:
            return APIResponse.service_unavailable('Maintenance in progress', retry_after=300)
        """
        body = {
            'error': 'Service Unavailable',
            'message': message
        }
        if retry_after:
            body['retry_after'] = retry_after
            if headers is None:
                headers = {}
            headers['Retry-After'] = str(retry_after)

        return APIResponse._build_response(HTTPStatus.SERVICE_UNAVAILABLE, body, headers)

    # -------------------------------------------------------------------------
    # Special Responses
    # -------------------------------------------------------------------------

    @staticmethod
    def cors_preflight() -> Dict[str, Any]:
        """
        Create a CORS preflight OPTIONS response.

        Returns:
            200 OK response with CORS headers

        Example:
            if event['httpMethod'] == 'OPTIONS':
                return APIResponse.cors_preflight()
        """
        return APIResponse.ok(message='CORS preflight successful')

    @staticmethod
    def paginated(
            items: list,
            last_evaluated_key: Optional[str] = None,
            has_more: bool = False,
            total_count: Optional[int] = None,
            headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a paginated list response.

        Args:
            items: List of items for current page
            last_evaluated_key: Encoded pagination key for next page
            has_more: Whether more pages exist
            total_count: Optional total count of items (if available)
            headers: Optional additional headers

        Returns:
            200 OK response with pagination metadata

        Example:
            return APIResponse.paginated(
                items=students,
                last_evaluated_key=encoded_key,
                has_more=True,
                total_count=100
            )
        """
        body = {
            'items': items,
            'count': len(items),
            'has_more': has_more
        }

        if last_evaluated_key:
            body['last_evaluated_key'] = last_evaluated_key

        if total_count is not None:
            body['total_count'] = total_count

        return APIResponse._build_response(HTTPStatus.OK, body, headers)


# Convenience function for backward compatibility
def create_response(
        status_code: int,
        body: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Legacy function for backward compatibility.

    Args:
        status_code: HTTP status code
        body: Response body dictionary
        headers: Optional additional headers

    Returns:
        API Gateway response dictionary

    Note:
        Consider using APIResponse methods instead for better type safety
        and standardization.
    """
    return APIResponse._build_response(status_code, body, headers)
