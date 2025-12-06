import json
import logging
import os
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

from university.shared.model.UniversityModel import UniversityModel

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
UNIVERSITIES_TABLE_NAME = os.environ.get('UNIVERSITIES_TABLE_NAME')

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
universities_table = dynamodb.Table(UNIVERSITIES_TABLE_NAME)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler to get university information by university code.

    Args:
        event: API Gateway event containing path parameters and request context
        context: Lambda context object

    Returns:
        API Gateway response with university data
    """
    try:
        # Extract university_code from path parameters
        university_code = event['pathParameters']['university_code']
        logger.info(f"Fetching university with code: {university_code}")

        # Query DynamoDB using GSI (university-code-index)
        response = universities_table.query(
            IndexName='university-code-index',
            KeyConditionExpression='university_code = :code',
            ExpressionAttributeValues={
                ':code': university_code.upper()
            }
        )

        # Check if a university exists
        if not response.get('Items') or len(response['Items']) == 0:
            logger.warning(f"University not found for code: {university_code}")
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true',
                },
                'body': json.dumps({
                    'message': f'University with code {university_code} not found'
                })
            }

        # Parse DynamoDB item to UniversityModel
        university_item = response['Items'][0]
        university = UniversityModel.from_dynamodb_item(university_item)

        # Prepare response data
        university_data = university.to_dict()

        logger.info(f"Successfully retrieved university: {university_code}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
            'body': json.dumps(university_data)
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
                'message': 'Invalid request: missing university_code in path'
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
                'message': 'Internal server error while fetching university'
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
