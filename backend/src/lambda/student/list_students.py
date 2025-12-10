"""
List Students Lambda Handler

Admin-only endpoint to list all students with pagination support.
"""

import logging
import os
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

from student.shared.model.StudentModel import StudentModel
from utils.api_response import APIResponse
from utils.auth_utils import require_role, UserRole, AuthorizationError, create_forbidden_response
from utils.request_utils import extract_query_parameter

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

        # Import pagination utilities
        from utils.pagination_utils import decode_last_evaluated_key, parse_page_size, build_pagination_response

        # Extract query parameters
        page_size_str = extract_query_parameter(event, 'page_size')
        last_key_param = extract_query_parameter(event, 'last_key')

        # Parse page size
        page_size = parse_page_size(page_size_str, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

        # Decode pagination key
        exclusive_start_key = decode_last_evaluated_key(last_key_param)

        logger.info(f"Listing students with page_size: {page_size}, has_last_key: {bool(exclusive_start_key)}")

        # Scan DynamoDB table with pagination
        scan_params = {'Limit': page_size}
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
                continue

        # Sort students by last_name for consistent ordering
        students.sort(key=lambda x: (x.get('last_name', '').lower(), x.get('first_name', '').lower()))

        # Build pagination response
        pagination_data = build_pagination_response(
            items=students,
            last_evaluated_key=response.get('LastEvaluatedKey')
        )

        # Rename 'items' to 'students' for API consistency
        response_data = {
            'students': pagination_data['items'],
            'count': pagination_data['count'],
            'has_more': pagination_data['has_more']
        }
        if 'last_evaluated_key' in pagination_data:
            response_data['last_evaluated_key'] = pagination_data['last_evaluated_key']

        logger.info(f"Successfully retrieved {len(students)} students")
        return APIResponse.ok(response_data)

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return APIResponse.internal_error('Failed to list students')

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return APIResponse.internal_error('An unexpected error occurred')
