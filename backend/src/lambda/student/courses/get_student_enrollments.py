"""
Get Student Enrollments Lambda Handler

Admin-only endpoint to retrieve enrollments for a specific student.
"""

import logging
import os
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

from student.shared.model.StudentCoursesModel import StudentCourseModel
from utils.api_response import APIResponse
from utils.auth_utils import require_role, UserRole, AuthorizationError, create_forbidden_response
from utils.request_utils import extract_path_parameter

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
STUDENT_COURSES_TABLE_NAME = os.environ.get('STUDENT_COURSES_TABLE_NAME')

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
student_courses_table = dynamodb.Table(STUDENT_COURSES_TABLE_NAME)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler to get enrollments for a specific student.
    Admin-only endpoint.

    Args:
        event: API Gateway event containing path parameters and request context
        context: Lambda context object

    Returns:
        API Gateway response with student enrollments
    """
    try:
        # Check authorization - only Admin can view student enrollments
        try:
            user_context = require_role(event, [UserRole.ADMIN])
            logger.info(f"User {user_context['user_id']} authorized as Admin for get student enrollments")
        except AuthorizationError as e:
            logger.warning(f"Authorization failed: {str(e)}")
            return create_forbidden_response()

        # Extract path parameters
        user_id, error = extract_path_parameter(event, 'user_id')
        if error:
            return error

        logger.info(f"Fetching enrollments for student: {user_id}")

        # Query student_courses table by user_id (PK)
        response = student_courses_table.query(
            KeyConditionExpression='user_id = :user_id',
            ExpressionAttributeValues={
                ':user_id': user_id
            }
        )

        # Parse items to StudentCourseModel
        enrollments = []
        for item in response.get('Items', []):
            try:
                enrollment = StudentCourseModel.from_dynamodb_item(item)
                enrollments.append(enrollment.to_dict())
            except Exception as e:
                logger.error(f"Error parsing enrollment item: {str(e)}")
                # Skip malformed items but continue processing
                continue

        logger.info(f"Successfully retrieved {len(enrollments)} enrollments for student {user_id}")

        return APIResponse.ok({'enrollments': enrollments})

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return APIResponse.internal_error('Failed to fetch enrollments')

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return APIResponse.internal_error('An unexpected error occurred')
