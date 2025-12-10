"""
Pagination utilities for DynamoDB scan/query operations.

Provides reusable functions for encoding/decoding pagination keys
and handling DynamoDB pagination patterns.
"""

import base64
import json
import logging
from decimal import Decimal
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


def decimal_to_float(obj: Any) -> float:
    """
    Convert Decimal objects to float for JSON serialization.

    Args:
        obj: Object to convert

    Returns:
        Float representation of Decimal

    Raises:
        TypeError: If object is not a Decimal
    """
    if isinstance(obj, Decimal):
        # Convert Decimal to int if it's a whole number, otherwise float
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def encode_last_evaluated_key(key: Optional[Dict[str, Any]]) -> Optional[str]:
    """
    Encode DynamoDB LastEvaluatedKey to base64 string for pagination.

    This allows passing the pagination key as a query parameter safely.

    Args:
        key: DynamoDB LastEvaluatedKey dictionary

    Returns:
        Base64-encoded string or None if key is None

    Example:
        last_key = {'user_id': 'abc123', 'timestamp': '2024-01-01'}
        encoded = encode_last_evaluated_key(last_key)
        # Returns: 'eyJ1c2VyX2lkIjogImFiYzEyMyIsICJ0aW1lc3RhbXAiOiAiMjAyNC0wMS0wMSJ9'
    """
    if not key:
        return None

    try:
        key_json = json.dumps(key, default=decimal_to_float)
        return base64.b64encode(key_json.encode('utf-8')).decode('utf-8')
    except Exception as e:
        logger.error(f"Error encoding last evaluated key: {str(e)}")
        return None


def decode_last_evaluated_key(encoded_key: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Decode base64 string to DynamoDB LastEvaluatedKey.

    Args:
        encoded_key: Base64-encoded key string

    Returns:
        DynamoDB key dictionary or None if encoded_key is None or invalid

    Example:
        encoded = 'eyJ1c2VyX2lkIjogImFiYzEyMyJ9'
        key = decode_last_evaluated_key(encoded)
        # Returns: {'user_id': 'abc123'}
    """
    if not encoded_key:
        return None

    try:
        key_json = base64.b64decode(encoded_key.encode('utf-8')).decode('utf-8')
        return json.loads(key_json)
    except Exception as e:
        logger.error(f"Error decoding last evaluated key: {str(e)}")
        return None


def parse_page_size(
        page_size_str: Optional[str],
        default: int = 20,
        max_size: int = 100
) -> int:
    """
    Parse and validate page size parameter.

    Args:
        page_size_str: Page size as string (from query parameter)
        default: Default page size if not provided
        max_size: Maximum allowed page size

    Returns:
        Validated page size as integer

    Example:
        page_size = parse_page_size('50', default=20, max_size=100)
        # Returns: 50

        page_size = parse_page_size('invalid', default=20, max_size=100)
        # Returns: 20 (default)

        page_size = parse_page_size('200', default=20, max_size=100)
        # Returns: 100 (capped at max)
    """
    try:
        size = int(page_size_str) if page_size_str else default
        # Cap at maximum and ensure minimum of 1
        return max(1, min(size, max_size))
    except (ValueError, TypeError):
        logger.warning(f"Invalid page_size value: {page_size_str}, using default: {default}")
        return default


def build_pagination_response(
        items: list,
        last_evaluated_key: Optional[Dict[str, Any]] = None,
        total_count: Optional[int] = None
) -> Dict[str, Any]:
    """
    Build a standardized pagination response dictionary.

    Args:
        items: List of items for current page
        last_evaluated_key: DynamoDB LastEvaluatedKey (will be encoded)
        total_count: Optional total count of items

    Returns:
        Dictionary with items, pagination metadata

    Example:
        response_data = build_pagination_response(
            items=students,
            last_evaluated_key={'user_id': 'last_id'},
            total_count=150
        )
        # Returns:
        # {
        #     'items': [...],
        #     'count': 20,
        #     'has_more': True,
        #     'last_evaluated_key': 'encoded_key',
        #     'total_count': 150
        # }
    """
    encoded_last_key = encode_last_evaluated_key(last_evaluated_key)
    has_more = last_evaluated_key is not None

    response = {
        'items': items,
        'count': len(items),
        'has_more': has_more
    }

    if encoded_last_key:
        response['last_evaluated_key'] = encoded_last_key

    if total_count is not None:
        response['total_count'] = total_count

    return response
