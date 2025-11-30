import json
import logging
import os
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

from student.shared.model.StudentModel import StudentModel

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
STUDENTS_TABLE_NAME = os.environ.get('STUDENTS_TABLE_NAME')

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
students_table = dynamodb.Table(STUDENTS_TABLE_NAME)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler to get student profile information.

    Args:
        event: API Gateway event containing request context with Cognito authorizer claims
        context: Lambda context object

    Returns:
        API Gateway response with student profile data
    """
    try:
        # Extract user_id from Cognito authorizer claims
        user_id = event['requestContext']['authorizer']['claims']['sub']
        logger.info(f"Fetching profile for user_id: {user_id}")

        # Query DynamoDB for student record
        response = students_table.get_item(Key={'user_id': user_id})

        # Check if student exists
        if 'Item' not in response:
            logger.warning(f"Student profile not found for user_id: {user_id}")
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true',
                },
                'body': json.dumps({
                    'message': 'Student profile not found'
                })
            }

        # Parse DynamoDB item to StudentModel
        student_item = response['Item']
        student = StudentModel.from_dynamodb_item(student_item)

        # Prepare sanitized response (exclude internal fields)
        profile_data = {
            'student_id': student.student_id,
            'first_name': student.first_name,
            'last_name': student.last_name,
            'email': student.email,
            'phone_number': student.phone_number,
            'face_registered': student.face_registered,
            'face_registered_at': student.face_registered_at.isoformat() if student.face_registered_at else None,
        }

        logger.info(f"Successfully retrieved profile for user_id: {user_id}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
            'body': json.dumps(profile_data)
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
                'message': 'Internal server error while fetching profile'
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
