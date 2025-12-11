"""
Request validation and parsing utilities for Lambda handlers.

Provides reusable functions for common request validation patterns
including HTTP method validation, body parsing, and parameter extraction.
"""

import base64
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from utils.api_response import APIResponse

logger = logging.getLogger(__name__)


def parse_json_body(event: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Parse and decode JSON body from API Gateway event.

    Handles both regular and base64-encoded bodies.

    Args:
        event: API Gateway event dictionary

    Returns:
        Tuple of (parsed_body, error_response)
        - If successful: (body_dict, None)
        - If failed: (None, error_response_dict)

    Example:
        body, error = parse_json_body(event)
        if error:
            return error
        # Use body...
    """
    try:
        body_str = event.get('body')

        if not body_str:
            return None, APIResponse.bad_request('Request body is required')

        # Handle base64 encoding
        if event.get('isBase64Encoded', False):
            try:
                body_str = base64.b64decode(body_str).decode('utf-8')
            except Exception as e:
                logger.error(f"Failed to decode base64 body: {e}")
                return None, APIResponse.bad_request('Invalid base64-encoded body')

        # Parse JSON
        try:
            body = json.loads(body_str)
            return body, None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON body: {e}")
            return None, APIResponse.bad_request('Invalid JSON in request body')

    except Exception as e:
        logger.error(f"Unexpected error parsing request body: {e}")
        return None, APIResponse.internal_error('Failed to parse request body')


def validate_http_method(
        event: Dict[str, Any],
        allowed_methods: List[str]
) -> Optional[Dict[str, Any]]:
    """
    Validate that the HTTP method is in the allowed list.

    Also handles OPTIONS requests for CORS preflight.

    Args:
        event: API Gateway event dictionary
        allowed_methods: List of allowed HTTP methods (e.g., ['GET', 'POST'])

    Returns:
        None if valid, error response dict if invalid

    Example:
        error = validate_http_method(event, ['POST'])
        if error:
            return error
    """
    http_method = event.get('httpMethod', '').upper()

    # Handle CORS preflight
    if http_method == 'OPTIONS':
        return APIResponse.cors_preflight()

    # Validate method
    if http_method not in allowed_methods:
        return APIResponse.method_not_allowed(http_method, allowed_methods)

    return None


def validate_required_fields(
        body: Dict[str, Any],
        required_fields: List[str]
) -> Optional[Dict[str, Any]]:
    """
    Validate that all required fields are present in the request body.

    Args:
        body: Parsed request body dictionary
        required_fields: List of required field names

    Returns:
        None if valid, error response dict if missing fields

    Example:
        error = validate_required_fields(body, ['email', 'password'])
        if error:
            return error
    """
    missing_fields = [field for field in required_fields if field not in body or body[field] is None]

    if missing_fields:
        return APIResponse.bad_request(
            f"Missing required fields: {', '.join(missing_fields)}",
            errors={'missing_fields': missing_fields}
        )

    return None


def extract_path_parameter(
        event: Dict[str, Any],
        parameter_name: str,
        required: bool = True
) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Extract a path parameter from the API Gateway event.

    Args:
        event: API Gateway event dictionary
        parameter_name: Name of the path parameter
        required: Whether the parameter is required

    Returns:
        Tuple of (parameter_value, error_response)
        - If successful: (value, None)
        - If failed: (None, error_response_dict)

    Example:
        user_id, error = extract_path_parameter(event, 'user_id')
        if error:
            return error
    """
    path_params = event.get('pathParameters') or {}
    value = path_params.get(parameter_name)

    if required and not value:
        return None, APIResponse.bad_request(f"Missing required path parameter: {parameter_name}")

    return value, None


def extract_query_parameter(
        event: Dict[str, Any],
        parameter_name: str,
        default: Any = None
) -> Any:
    """
    Extract a query string parameter from the API Gateway event.

    Args:
        event: API Gateway event dictionary
        parameter_name: Name of the query parameter
        default: Default value if parameter not present

    Returns:
        Parameter value or default

    Example:
        page_size = extract_query_parameter(event, 'page_size', default=20)
    """
    query_params = event.get('queryStringParameters') or {}
    return query_params.get(parameter_name, default)


def validate_request(event):
    """
    Legacy function for backward compatibility.

    Validates basic POST request requirements.

    Args:
        event: API Gateway event dictionary

    Returns:
        Error response if validation fails, None otherwise

    Note:
        Consider using the more specific validation functions instead.
    """
    error = validate_http_method(event, ['POST'])
    if error:
        return error

    if not event.get('body'):
        return APIResponse.bad_request('Request body is required')

    return None


# Re-export for backward compatibility
def create_response(status_code: int, body: Dict[str, Any], headers: Dict[str, str] = None) -> Dict[str, Any]:
    """
    Legacy function for backward compatibility.

    Args:
        status_code: HTTP status code
        body: Response body dictionary
        headers: Optional additional headers

    Returns:
        API Gateway response dictionary

    Note:
        Consider using APIResponse methods instead for better type safety.
    """
    return APIResponse._build_response(status_code, body, headers)
