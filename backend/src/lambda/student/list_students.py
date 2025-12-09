import json
import logging
import os
import base64
from typing import Any, Dict, Optional
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

from student.shared.model.StudentModel import StudentModel
from utils.auth_utils import require_role, UserRole, AuthorizationError, create_forbidden_response

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
STUDENTS_TABLE_NAME = os.environ.get('STUDENTS_TABLE_NAME')

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
students_table = dynamodb.Table(STUDENTS_TABLE_NAME)

# Constants
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def decimal_to_float(obj):
    """
    Convert Decimal objects to float for JSON serialization.
    """
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def encode_last_evaluated_key(key: Optional[Dict[str, Any]]) -> Optional[str]:
    """
    Encode DynamoDB LastEvaluatedKey to base64 string for pagination.

    Args:
        key: DynamoDB LastEvaluatedKey dictionary

    Returns:
        Base64-encoded string or None
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
        DynamoDB key dictionary or None
    """
    if not encoded_key:
        return None
    try:
        key_json = base64.b64decode(encoded_key.encode('utf-8')).decode('utf-8')
        return json.loads(key_json)
    except Exception as e:
        logger.error(f"Error decoding last evaluated key: {str(e)}")
        return None


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler to list all students with pagination support.

    Args:
        event: API Gateway event containing query parameters and request context
        context: Lambda context object

    Returns:
        API Gateway response with paginated list of students
    """
    try:
        # Check authorization - only Admin can list students
        try:
            user_context = require_role(event, [UserRole.ADMIN])
            logger.info(f"User {user_context['user_id']} authorized as Admin for list students")
        except AuthorizationError as e:
            logger.warning(f"Authorization failed: {str(e)}")
            return create_forbidden_response()

        # Extract query parameters
        query_params = event.get('queryStringParameters') or {}

        # Get page size (default: 20, max: 100)
        try:
            page_size = int(query_params.get('page_size', DEFAULT_PAGE_SIZE))
            page_size = min(page_size, MAX_PAGE_SIZE)  # Cap at maximum
            page_size = max(page_size, 1)  # Minimum 1
        except (ValueError, TypeError):
            page_size = DEFAULT_PAGE_SIZE

        # Get last evaluated key for pagination
        last_key_param = query_params.get('last_key')
        exclusive_start_key = decode_last_evaluated_key(last_key_param)

        logger.info(f"Listing students with page_size: {page_size}, has_last_key: {bool(exclusive_start_key)}")

        # Scan DynamoDB table with pagination
        scan_params = {
            'Limit': page_size
        }

        if exclusive_start_key:
            scan_params['ExclusiveStartKey'] = exclusive_start_key

        response = students_table.scan(**scan_params)

        # Parse items to StudentModel
        students = []
        for item in response.get('Items', []):
            try:
                student = StudentModel.from_dynamodb_item(item)
                students.append(student.to_dict())
            except Exception as e:
                logger.error(f"Error parsing student item: {str(e)}")
                # Skip malformed items but continue processing
                continue

        # Get pagination info
        last_evaluated_key = response.get('LastEvaluatedKey')
        encoded_last_key = encode_last_evaluated_key(last_evaluated_key)
        has_more = last_evaluated_key is not None

        # Sort students by last_name for consistent ordering
        students.sort(key=lambda x: (x.get('last_name', '').lower(), x.get('first_name', '').lower()))

        # Prepare response
        response_data = {
            'students': students,
            'count': len(students),
            'last_evaluated_key': encoded_last_key,
            'has_more': has_more
        }

        logger.info(f"Successfully retrieved {len(students)} students, has_more: {has_more}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
            'body': json.dumps(response_data)
        }

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
            'body': json.dumps({
                'message': 'Internal server error while listing students'
            })
        }

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
            'body': json.dumps({
                'message': 'Internal server error'
            })
        }
