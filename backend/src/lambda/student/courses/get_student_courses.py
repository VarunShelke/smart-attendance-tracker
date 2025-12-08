import json
import logging
import os
from typing import Any, Dict, List

import boto3
from botocore.exceptions import ClientError

from student.shared.model.StudentCoursesModel import StudentCourseModel
from utils.auth_utils import extract_user_context, is_admin, is_instructor, create_forbidden_response

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
    Lambda handler to get student courses.

    Authorization:
    - Students: Can only fetch their own courses
    - Instructors: Can query courses by schedule_id to see enrolled students
    - Admins: Can view any student's courses

    Args:
        event: API Gateway event containing request context with Cognito authorizer claims
        context: Lambda context object

    Returns:
        API Gateway response with a list of courses
    """
    try:
        # Extract user context (user_id, email, groups)
        user_context = extract_user_context(event)
        requesting_user_id = user_context['user_id']
        user_groups = user_context['groups']

        logger.info(f"User {requesting_user_id} with roles {user_groups} requesting courses")

        # Get query parameters
        query_params = event.get('queryStringParameters') or {}
        schedule_id = query_params.get('schedule_id')

        # Determine query based on role
        courses = []

        if is_admin(event):
            # Admins can query by schedule_id or all courses for a specific user
            if schedule_id:
                courses = _query_courses_by_schedule(schedule_id)
            else:
                # For students/me/courses endpoint, get the requesting user's courses
                courses = _query_courses_by_user_id(requesting_user_id)

        elif is_instructor(event):
            # Instructors can query by schedule_id to see enrolled students
            if schedule_id:
                courses = _query_courses_by_schedule(schedule_id)
            else:
                # Instructors viewing /students/me/courses get their own courses (if they're also students)
                courses = _query_courses_by_user_id(requesting_user_id)

        else:
            # Students can only view their own courses
            courses = _query_courses_by_user_id(requesting_user_id)

        logger.info(f"Successfully retrieved {len(courses)} courses")

        # Convert courses to dict format
        courses_data = [course.to_dict() for course in courses]

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
            'body': json.dumps({
                'courses': courses_data
            })
        }

    except KeyError as e:
        logger.error(f"Missing required field in event: {str(e)}")
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
            'body': json.dumps({
                'message': 'Invalid request: missing authorization claims'
            })
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
                'message': 'Internal server error while fetching courses'
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


def _query_courses_by_user_id(user_id: str) -> List[StudentCourseModel]:
    """
    Query courses for a specific user.

    Args:
        user_id: The Cognito user ID

    Returns:
        List of StudentCourseModel objects
    """
    try:
        response = student_courses_table.query(
            KeyConditionExpression='user_id = :user_id',
            ExpressionAttributeValues={
                ':user_id': user_id
            }
        )

        items = response.get('Items', [])
        courses = [StudentCourseModel.from_dynamodb_item(item) for item in items]

        logger.info(f"Found {len(courses)} courses for user {user_id}")
        return courses

    except ClientError as e:
        logger.error(f"Error querying courses by user_id: {str(e)}")
        raise


def _query_courses_by_schedule(schedule_id: str) -> List[StudentCourseModel]:
    """
    Query courses by schedule_id using GSI.

    Args:
        schedule_id: The schedule ID

    Returns:
        List of StudentCourseModel objects
    """
    try:
        response = student_courses_table.query(
            IndexName='schedule-id-index',
            KeyConditionExpression='schedule_id = :schedule_id',
            ExpressionAttributeValues={
                ':schedule_id': schedule_id
            }
        )

        items = response.get('Items', [])
        courses = [StudentCourseModel.from_dynamodb_item(item) for item in items]

        logger.info(f"Found {len(courses)} courses for schedule {schedule_id}")
        return courses

    except ClientError as e:
        logger.error(f"Error querying courses by schedule_id: {str(e)}")
        raise
