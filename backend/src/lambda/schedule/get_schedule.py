import json
import logging
import os
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

from schedule.shared.model.ScheduleModel import ScheduleModel

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
CLASS_SCHEDULES_TABLE_NAME = os.environ.get('CLASS_SCHEDULES_TABLE_NAME')

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
schedules_table = dynamodb.Table(CLASS_SCHEDULES_TABLE_NAME)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler to get class schedule information by schedule ID.

    Args:
        event: API Gateway event containing path parameters and request context
        context: Lambda context object

    Returns:
        API Gateway response with schedule data
    """
    try:
        # Extract path parameters
        university_code = event['pathParameters']['university_code']
        schedule_id = event['pathParameters']['schedule_id']
        logger.info(f"Fetching schedule with ID: {schedule_id} for university: {university_code}")

        # Validate that schedule_id starts with university_code
        expected_prefix = f"{university_code.upper()}_"
        if not schedule_id.upper().startswith(expected_prefix):
            logger.warning(f"Schedule ID {schedule_id} does not match university code {university_code}")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true',
                },
                'body': json.dumps({
                    'message': f'Schedule ID must start with {expected_prefix}'
                })
            }

        # Query DynamoDB by schedule_id (partition key)
        response = schedules_table.get_item(
            Key={'schedule_id': schedule_id.upper()}
        )

        # Check if schedule exists
        if 'Item' not in response:
            logger.warning(f"Schedule not found for ID: {schedule_id}")
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true',
                },
                'body': json.dumps({
                    'message': f'Schedule with ID {schedule_id} not found'
                })
            }

        # Parse DynamoDB item to ScheduleModel
        schedule_item = response['Item']
        schedule = ScheduleModel.from_dynamodb_item(schedule_item)

        # Prepare response data
        schedule_data = schedule.to_dict()

        logger.info(f"Successfully retrieved schedule: {schedule_id}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
            'body': json.dumps(schedule_data)
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
                'message': 'Invalid request: missing required path parameters'
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
                'message': 'Internal server error while fetching schedule'
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
