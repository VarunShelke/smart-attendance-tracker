"""
Update Student Profile Lambda Handler

Allows students to update their profile information including
student_id (one-time only) and phone_number.
"""

import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import boto3
from botocore.exceptions import ClientError

from student.shared.model.StudentModel import StudentModel
from utils.api_response import APIResponse
from utils.request_utils import parse_json_body

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
STUDENTS_TABLE_NAME = os.environ.get('STUDENTS_TABLE_NAME')

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
students_table = dynamodb.Table(STUDENTS_TABLE_NAME)

# Phone number validation regex (10-15 digits, optional + prefix)
PHONE_NUMBER_PATTERN = re.compile(r'^\+?\d{10,15}$')


def validate_phone_number(phone_number: str) -> bool:
    """
    Validate phone number format.

    Args:
        phone_number: Phone number string to validate

    Returns:
        True if valid, False otherwise
    """
    # Remove common formatting characters
    cleaned = re.sub(r'[\s\-\(\)\.]', '', phone_number)
    return bool(PHONE_NUMBER_PATTERN.match(cleaned))


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler to update student profile information.

    Allows updating:
    - student_id: Only if currently null/empty (can be set once)
    - phone_number: Always updatable

    Args:
        event: API Gateway event containing request context and body
        context: Lambda context object

    Returns:
        API Gateway response with updated student profile data
    """
    try:
        # Extract user_id from Cognito authorizer claims
        user_id = event['requestContext']['authorizer']['claims']['sub']
        logger.info(f"Processing profile update for user_id: {user_id}")

        # Parse and validate request body
        body, error = parse_json_body(event)
        if error:
            return error

        # Extract updatable fields
        student_id: Optional[str] = body.get('student_id')
        phone_number: Optional[str] = body.get('phone_number')

        # Validate at least one field is provided
        if student_id is None and phone_number is None:
            logger.warning(f"No fields to update for user_id: {user_id}")
            return APIResponse.bad_request(
                'At least one field (student_id or phone_number) must be provided'
            )

        # Validate phone_number format if provided
        if phone_number is not None and phone_number.strip():
            if not validate_phone_number(phone_number):
                logger.warning(f"Invalid phone number format for user_id: {user_id}")
                return APIResponse.bad_request(
                    'Invalid phone number format. Must contain 10-15 digits and may start with +'
                )

        # Fetch existing student record
        get_response = students_table.get_item(Key={'user_id': user_id})

        if 'Item' not in get_response:
            logger.warning(f"Student profile not found for user_id: {user_id}")
            return APIResponse.not_found('Student profile not found', resource_type='Student')

        existing_student = get_response['Item']

        # Check if student_id is being updated when it already exists
        if student_id is not None:
            existing_student_id = existing_student.get('student_id')
            if existing_student_id and existing_student_id.strip():
                logger.warning(f"Attempt to update existing student_id for user_id: {user_id}")
                return APIResponse.forbidden('Student ID can only be set once and cannot be changed')

        # Build update expression dynamically
        update_expressions = []
        expression_attribute_names = {}
        expression_attribute_values = {}

        if student_id is not None:
            update_expressions.append('#sid = :sid')
            expression_attribute_names['#sid'] = 'student_id'
            expression_attribute_values[':sid'] = student_id.strip()

        if phone_number is not None:
            # Allow empty string to clear phone number
            cleaned_phone = phone_number.strip() if phone_number.strip() else None
            update_expressions.append('#pn = :pn')
            expression_attribute_names['#pn'] = 'phone_number'
            expression_attribute_values[':pn'] = cleaned_phone

        # Always update updated_at timestamp
        update_expressions.append('#ua = :ua')
        expression_attribute_names['#ua'] = 'updated_at'
        expression_attribute_values[':ua'] = datetime.now(timezone.utc).isoformat()

        # Construct update expression
        update_expression = 'SET ' + ', '.join(update_expressions)

        # Perform conditional update
        update_response = students_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='ALL_NEW'
        )

        # Parse updated item to StudentModel
        updated_item = update_response['Attributes']
        student = StudentModel.from_dynamodb_item(updated_item)

        # Prepare response data (same format as GET endpoint)
        profile_data = {
            'student_id': student.student_id,
            'first_name': student.first_name,
            'last_name': student.last_name,
            'email': student.email,
            'phone_number': student.phone_number,
            'face_registered': student.face_registered,
            'face_registered_at': student.face_registered_at.isoformat() if student.face_registered_at else None,
        }

        logger.info(f"Successfully updated profile for user_id: {user_id}")
        return APIResponse.ok(profile_data)

    except KeyError as e:
        logger.error(f"Missing required field in event: {str(e)}")
        return APIResponse.bad_request('Invalid request: missing authorization claims')

    except ClientError as e:
        error_code = e.response['Error']['Code']
        logger.error(f"DynamoDB error: {error_code} - {str(e)}")

        if error_code == 'ConditionalCheckFailedException':
            return APIResponse.conflict('Profile update conflict. Please refresh and try again.')

        return APIResponse.internal_error('Failed to update student profile')

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return APIResponse.internal_error('An unexpected error occurred')
