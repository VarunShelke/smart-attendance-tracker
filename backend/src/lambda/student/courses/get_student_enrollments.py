import json
import logging
import os
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

from student.shared.model.StudentCoursesModel import StudentCourseModel
from utils.auth_utils import require_role, UserRole, AuthorizationError, create_forbidden_response

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
        path_params = event.get('pathParameters') or {}
        user_id = path_params.get('user_id')

        if not user_id:
            logger.warning("Missing user_id in path parameters")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true',
                },
                'body': json.dumps({
                    'message': 'Missing user_id in path'
                })
            }

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

        # Prepare response
        response_data = {
            'enrollments': enrollments
        }

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
                'message': 'Internal server error while fetching enrollments'
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
