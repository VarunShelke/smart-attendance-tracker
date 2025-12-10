import logging
import os
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

from schedule.shared.model.ScheduleModel import ScheduleModel
from utils.api_response import APIResponse
from utils.auth_utils import require_role, UserRole, AuthorizationError, create_forbidden_response
from utils.pagination_utils import decode_last_evaluated_key, parse_page_size, build_pagination_response
from utils.request_utils import extract_query_parameter

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
CLASS_SCHEDULES_TABLE_NAME = os.environ.get('CLASS_SCHEDULES_TABLE_NAME')

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
class_schedules_table = dynamodb.Table(CLASS_SCHEDULES_TABLE_NAME)

# Constants
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler to list all schedules with pagination support.
    Accessible by Admin and Instructor roles.

    Args:
        event: API Gateway event containing query parameters and request context
        context: Lambda context object

    Returns:
        API Gateway response with paginated list of schedules
    """
    try:
        # Check authorization - Admin and Instructor can list schedules
        try:
            user_context = require_role(event, [UserRole.ADMIN, UserRole.INSTRUCTOR])
            logger.info(f"User {user_context['user_id']} authorized for list schedules")
        except AuthorizationError as e:
            logger.warning(f"Authorization failed: {str(e)}")
            return create_forbidden_response()

        # Extract query parameters
        university_code = extract_query_parameter(event, 'university_code')
        page_size_str = extract_query_parameter(event, 'page_size')
        last_key_param = extract_query_parameter(event, 'last_key')

        # Parse page size
        page_size = parse_page_size(page_size_str, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

        # Decode pagination key
        exclusive_start_key = decode_last_evaluated_key(last_key_param)

        logger.info(
            f"Listing schedules with page_size: {page_size}, university_code: {university_code}, has_last_key: {bool(exclusive_start_key)}")

        # Scan DynamoDB table with pagination
        scan_params = {
            'Limit': page_size
        }

        if exclusive_start_key:
            scan_params['ExclusiveStartKey'] = exclusive_start_key

        # Add filter expression if university_code is provided
        if university_code:
            scan_params['FilterExpression'] = 'university_code = :university_code'
            scan_params['ExpressionAttributeValues'] = {
                ':university_code': university_code
            }

        response = class_schedules_table.scan(**scan_params)

        # Parse items to ScheduleModel
        schedules = []
        for item in response.get('Items', []):
            try:
                schedule = ScheduleModel.from_dynamodb_item(item)
                schedules.append(schedule.to_dict())
            except Exception as e:
                logger.error(f"Error parsing schedule item: {str(e)}")
                continue

        # Sort schedules by course_name for consistent ordering
        schedules.sort(key=lambda x: x.get('course_name', '').lower())

        # Build pagination response
        pagination_data = build_pagination_response(
            items=schedules,
            last_evaluated_key=response.get('LastEvaluatedKey')
        )

        # Rename 'items' to 'schedules' for API consistency
        response_data = {
            'schedules': pagination_data['items'],
            'count': pagination_data['count'],
            'has_more': pagination_data['has_more']
        }
        if 'last_evaluated_key' in pagination_data:
            response_data['last_evaluated_key'] = pagination_data['last_evaluated_key']

        logger.info(f"Successfully retrieved {len(schedules)} schedules")
        return APIResponse.ok(response_data)

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return APIResponse.internal_error('Failed to list schedules')

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return APIResponse.internal_error('An unexpected error occurred')
